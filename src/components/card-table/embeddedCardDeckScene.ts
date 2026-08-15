import * as THREE from 'three';
import type { CardTableBackDesign, CardTableCard } from '../../types';
import { getCardOriginBackDesign } from '../../utils/cardTable';
import { getCardSymbolColumns, getCardSymbolSizeFactor, splitCardSymbols } from '../../utils/cardSymbols';
import {
  getCardDeckDragState,
  getCardDeckGatherAnimation,
  getCardDeckRegistrations,
  type CardDeckGatherAnimationEntry,
} from './cardDeckRegistry';

interface DeckVisual {
  signature: string;
  cardId: string;
  faceUp: boolean;
  count: number;
  group: THREE.Group;
  card: THREE.Group;
  cardShadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  faceElement: HTMLDivElement;
  backElement: HTMLDivElement;
  flipStartedAt: number;
  flipFrom: number;
  flipTo: number;
}

interface GatherVisual {
  signature: string;
  group: THREE.Group;
  card: THREE.Group;
  faceElement: HTMLDivElement;
}

const CARD_WIDTH = 2.2;
const CARD_HEIGHT = 3.12;
const CARD_DEPTH = 0.12;
const TEXTURE_SCALE = 2;
const visuals = new Map<string, DeckVisual>();
type ResolvedBackDesign = CardTableBackDesign & { color: string };

const roundedRect = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
};

const makeTexture = (canvas: HTMLCanvasElement, anisotropy: number) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = anisotropy;
  return texture;
};

const createBackTexture = (
  colors: Record<'paper' | 'ink' | 'accent' | 'border', string>,
  anisotropy: number,
  design: ResolvedBackDesign,
) => {
  const canvas = document.createElement('canvas');
  canvas.width = 440 * TEXTURE_SCALE;
  canvas.height = 624 * TEXTURE_SCALE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Card texture canvas is unavailable.');
  context.scale(TEXTURE_SCALE, TEXTURE_SCALE);
  roundedRect(context, 5, 5, 430, 614, 28);
  context.fillStyle = design.color;
  context.fill();
  context.save();
  roundedRect(context, 22, 22, 396, 580, 20);
  context.clip();
  context.strokeStyle = colors.paper;
  context.globalAlpha = 0.2;
  if (design.pattern === 'crosshatch' || design.pattern === 'stripes') {
    context.lineWidth = 5;
    for (let offset = -624; offset < 1064; offset += 38) {
      context.beginPath();
      context.moveTo(offset, 0);
      context.lineTo(offset + 624, 624);
      context.stroke();
      if (design.pattern === 'crosshatch') {
        context.beginPath();
        context.moveTo(offset + 624, 0);
        context.lineTo(offset, 624);
        context.stroke();
      }
    }
  } else if (design.pattern === 'diamonds') {
    context.lineWidth = 4;
    for (let y = -28; y < 652; y += 56) {
      for (let x = -28; x < 468; x += 56) {
        context.beginPath();
        context.moveTo(x, y + 28);
        context.lineTo(x + 28, y);
        context.lineTo(x + 56, y + 28);
        context.lineTo(x + 28, y + 56);
        context.closePath();
        context.stroke();
      }
    }
  } else if (design.pattern === 'dots') {
    context.fillStyle = colors.paper;
    for (let y = 24; y < 624; y += 38) {
      for (let x = 22; x < 440; x += 38) {
        context.beginPath();
        context.arc(x + (Math.floor(y / 38) % 2) * 19, y, 4, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
  context.restore();
  context.globalAlpha = 1;
  context.strokeStyle = colors.paper;
  context.lineWidth = 7;
  roundedRect(context, 22, 22, 396, 580, 20);
  context.stroke();
  context.fillStyle = colors.paper;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const hasSymbol = Boolean(design.symbol?.trim());
  const hasText = Boolean(design.text?.trim());
  if (hasText) {
    context.font = '700 64px Georgia, serif';
    const words = design.text!.trim().split(/\s+/);
    const lines: string[] = [];
    words.forEach((word) => {
      const candidate = lines.length === 0 ? word : `${lines[lines.length - 1]} ${word}`;
      if (lines.length === 0 || context.measureText(candidate).width <= 350) {
        if (lines.length === 0) lines.push(word);
        else lines[lines.length - 1] = candidate;
      } else if (lines.length < 3) {
        lines.push(word);
      }
    });
    const centerY = hasSymbol ? 225 : 312;
    const lineHeight = 72;
    lines.forEach((line, index) => {
      context.fillText(line, 220, centerY + (index - (lines.length - 1) / 2) * lineHeight, 350);
    });
  }
  if (hasSymbol) {
    context.font = `${hasText ? 124 : 168}px "Segoe UI Emoji", "Segoe UI Symbol", Georgia, serif`;
    context.fillText(design.symbol!.trim(), 220, hasText ? 410 : 312, 330);
  }
  return makeTexture(canvas, anisotropy);
};

const createBodyGeometry = () => {
  const radius = 0.14;
  const shape = new THREE.Shape();
  shape.moveTo(-CARD_WIDTH / 2 + radius, -CARD_HEIGHT / 2);
  shape.lineTo(CARD_WIDTH / 2 - radius, -CARD_HEIGHT / 2);
  shape.quadraticCurveTo(CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH / 2, -CARD_HEIGHT / 2 + radius);
  shape.lineTo(CARD_WIDTH / 2, CARD_HEIGHT / 2 - radius);
  shape.quadraticCurveTo(CARD_WIDTH / 2, CARD_HEIGHT / 2, CARD_WIDTH / 2 - radius, CARD_HEIGHT / 2);
  shape.lineTo(-CARD_WIDTH / 2 + radius, CARD_HEIGHT / 2);
  shape.quadraticCurveTo(-CARD_WIDTH / 2, CARD_HEIGHT / 2, -CARD_WIDTH / 2, CARD_HEIGHT / 2 - radius);
  shape.lineTo(-CARD_WIDTH / 2, -CARD_HEIGHT / 2 + radius);
  shape.quadraticCurveTo(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, -CARD_WIDTH / 2 + radius, -CARD_HEIGHT / 2);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: CARD_DEPTH,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.025,
    bevelThickness: 0.02,
    curveSegments: 6,
  });
  geometry.translate(0, 0, -CARD_DEPTH / 2);
  return geometry;
};

const createCardShadow = (opacity: number) => {
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT),
    new THREE.MeshBasicMaterial({
      color: '#000000',
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  shadow.position.set(0.08, -0.1, -0.2);
  return shadow;
};

const disposeTree = (root: THREE.Object3D) => {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.MeshStandardMaterial) material.map?.dispose();
      material.dispose();
    });
  });
};

const createCard = (
  colors: Record<'paper' | 'ink' | 'accent' | 'border', string>,
  anisotropy: number,
  backDesign: ResolvedBackDesign,
) => {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    createBodyGeometry(),
    new THREE.MeshStandardMaterial({ color: colors.paper, roughness: 0.58, metalness: 0.02 }),
  );
  group.add(body);
  const front = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_WIDTH - 0.08, CARD_HEIGHT - 0.08),
    new THREE.MeshBasicMaterial({ color: colors.paper }),
  );
  front.position.z = CARD_DEPTH / 2 + 0.025;
  group.add(front);
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_WIDTH - 0.08, CARD_HEIGHT - 0.08),
    new THREE.MeshBasicMaterial({ map: createBackTexture(colors, anisotropy, backDesign), transparent: true }),
  );
  back.rotation.y = Math.PI;
  back.position.z = -CARD_DEPTH / 2 - 0.025;
  group.add(back);
  return group;
};

const createFaceElement = (
  card: CardTableCard,
  colors: Record<'paper' | 'ink' | 'accent' | 'border', string>,
) => {
  const face = document.createElement('div');
  face.className = 'card-deck-dom-face';
  face.style.setProperty('--card-face-paper', colors.paper);
  face.style.setProperty('--card-face-ink', colors.ink);
  face.style.setProperty('--card-face-accent', colors.accent);
  face.style.setProperty('--card-face-border', colors.border);
  const symbols = splitCardSymbols(card.symbol).slice(0, 20);
  const symbolColumns = getCardSymbolColumns(symbols.length);
  const hasBody = card.body.trim().length > 0;
  if (!hasBody) face.classList.add('card-deck-dom-face--symbol-only');

  const title = document.createElement('div');
  title.className = 'card-deck-dom-face__title';
  title.textContent = card.title || 'Untitled card';
  face.appendChild(title);

  const symbol = document.createElement('div');
  symbol.className = 'card-deck-dom-face__symbol';
  symbol.style.setProperty('--card-symbol-columns', String(symbolColumns));
  symbol.style.setProperty('--card-symbol-size-factor', String(getCardSymbolSizeFactor(symbolColumns)));
  symbols.forEach((glyph) => {
    const glyphElement = document.createElement('span');
    glyphElement.className = 'card-deck-dom-face__symbol-glyph';
    glyphElement.textContent = glyph;
    symbol.appendChild(glyphElement);
  });
  face.appendChild(symbol);

  if (hasBody) {
    const divider = document.createElement('div');
    divider.className = 'card-deck-dom-face__divider';
    face.appendChild(divider);

    const body = document.createElement('div');
    body.className = 'card-deck-dom-face__body';
    body.textContent = card.body;
    face.appendChild(body);
  }
  return face;
};

const createBackElement = (
  colors: ReturnType<typeof getThemeColors>,
  design: ResolvedBackDesign,
) => {
  const back = document.createElement('div');
  back.className = `card-deck-dom-back card-deck-back--${design.pattern}`;
  back.hidden = true;
  back.style.setProperty('--card-back-color', design.color);
  back.style.setProperty('--card-back-paper', colors.paper);
  back.style.setProperty('--card-back-border', colors.border);
  if (design.text) {
    const text = document.createElement('span');
    text.className = 'card-deck-dom-back__text';
    text.textContent = design.text;
    back.appendChild(text);
  }
  if (design.symbol) {
    const symbol = document.createElement('span');
    symbol.className = 'card-deck-dom-back__symbol';
    symbol.textContent = design.symbol;
    back.appendChild(symbol);
  }
  return back;
};

const getThemeColors = () => {
  const styles = getComputedStyle(document.documentElement);
  const color = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  return {
    paper: color('--color-paper', '#f8f4e8'),
    ink: color('--color-ink', '#181915'),
    accent: color('--color-accent', '#20211e'),
    border: color('--color-border', '#4b4d46'),
  };
};

const resolveBackDesign = (
  card: CardTableCard,
  registeredDesign: CardTableBackDesign | undefined,
  fallbackColor: string,
): ResolvedBackDesign => {
  if (registeredDesign) return { ...registeredDesign, color: registeredDesign.color ?? fallbackColor };
  const originDesign = getCardOriginBackDesign(card);
  return { ...originDesign, color: originDesign.color ?? fallbackColor };
};

const cardSignature = (card: CardTableCard, colors: ReturnType<typeof getThemeColors>, backDesign: ResolvedBackDesign) => (
  `${card.id}\u001f${card.title}\u001f${card.symbol}\u001f${card.body}\u001f${JSON.stringify(backDesign)}\u001f${Object.values(colors).join('\u001f')}`
);

const screenPosition = (x: number, y: number, width: number, height: number, z = 10) => (
  new THREE.Vector3(x - width / 2, height / 2 - y, z)
);

export function createEmbeddedCardDeckScene(canvas: HTMLCanvasElement) {
  let disposed = false;
  let frameId = 0;
  let viewportWidth = 1;
  let viewportHeight = 1;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 2000);
  camera.position.z = 1000;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 2), 3));
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const gatherVisuals = new Map<string, GatherVisual>();
  const faceLayer = document.createElement('div');
  faceLayer.className = 'card-deck-dom-layer';
  document.body.appendChild(faceLayer);
  scene.add(new THREE.HemisphereLight('#ffffff', '#4b4d46', 1.25));
  const light = new THREE.DirectionalLight('#fff8e8', 1.1);
  light.position.set(-300, 500, 900);
  scene.add(light);

  const resize = () => {
    viewportWidth = Math.max(1, canvas.clientWidth);
    viewportHeight = Math.max(1, canvas.clientHeight);
    renderer.setSize(viewportWidth, viewportHeight, false);
    camera.left = -viewportWidth / 2;
    camera.right = viewportWidth / 2;
    camera.top = viewportHeight / 2;
    camera.bottom = -viewportHeight / 2;
    camera.updateProjectionMatrix();
  };

  const removeVisual = (widgetId: string) => {
    const visual = visuals.get(widgetId);
    if (!visual) return;
    scene.remove(visual.group);
    scene.remove(visual.card);
    disposeTree(visual.group);
    disposeTree(visual.card);
    visual.faceElement.remove();
    visual.backElement.remove();
    visuals.delete(widgetId);
  };

  const removeGatherVisual = (cardId: string) => {
    const visual = gatherVisuals.get(cardId);
    if (!visual) return;
    scene.remove(visual.group);
    disposeTree(visual.group);
    visual.faceElement.remove();
    gatherVisuals.delete(cardId);
  };

  const ensureGatherVisual = (entry: CardDeckGatherAnimationEntry) => {
    const colors = getThemeColors();
    const backDesign = resolveBackDesign(entry.card, entry.backDesign, colors.accent);
    const signature = cardSignature(entry.card, colors, backDesign);
    let visual = gatherVisuals.get(entry.card.id);
    if (visual?.signature === signature) return visual;
    removeGatherVisual(entry.card.id);

    const group = new THREE.Group();
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false }),
    );
    shadow.position.set(0.09, -0.11, -0.2);
    group.add(shadow);
    const cardGroup = createCard(colors, maxAnisotropy, backDesign);
    cardGroup.rotation.y = entry.card.faceUp ? 0 : Math.PI;
    group.add(cardGroup);
    const faceElement = createFaceElement(entry.card, colors);
    faceLayer.appendChild(faceElement);
    scene.add(group);
    visual = { signature, group, card: cardGroup, faceElement };
    gatherVisuals.set(entry.card.id, visual);
    return visual;
  };

  const ensureVisual = (
    widgetId: string,
    card: CardTableCard,
    count: number,
    backDesign: ResolvedBackDesign,
    stackBackDesigns: ResolvedBackDesign[],
    time: number,
  ) => {
    const colors = getThemeColors();
    const signature = `${cardSignature(card, colors, backDesign)}\u001f${JSON.stringify(stackBackDesigns)}`;
    let visual = visuals.get(widgetId);
    if (!visual || visual.cardId !== card.id || visual.signature !== signature || visual.count !== count) {
      removeVisual(widgetId);
      const group = new THREE.Group();
      const layerCount = Math.min(Math.max(count - 1, 0), 3);
      if (layerCount > 0) group.add(createCardShadow(0.16));
      for (let index = layerCount; index > 0; index -= 1) {
        const layerBackDesign = stackBackDesigns[index - 1] || backDesign;
        const layer = createCard(colors, maxAnisotropy, layerBackDesign);
        layer.rotation.y = Math.PI;
        layer.position.set(-index * 0.035, index * 0.035, -index * 0.08);
        group.add(layer);
      }
      const cardGroup = createCard(colors, maxAnisotropy, backDesign);
      cardGroup.rotation.y = card.faceUp ? 0 : Math.PI;
      const cardShadow = createCardShadow(0.2);
      cardGroup.add(cardShadow);
      const faceElement = createFaceElement(card, colors);
      const backElement = createBackElement(colors, backDesign);
      faceLayer.appendChild(faceElement);
      faceLayer.appendChild(backElement);
      scene.add(group);
      scene.add(cardGroup);
      visual = {
        signature,
        cardId: card.id,
        faceUp: card.faceUp,
        count,
        group,
        card: cardGroup,
        cardShadow,
        faceElement,
        backElement,
        flipStartedAt: 0,
        flipFrom: cardGroup.rotation.y,
        flipTo: cardGroup.rotation.y,
      };
      visuals.set(widgetId, visual);
    } else if (visual.faceUp !== card.faceUp) {
      visual.faceUp = card.faceUp;
      visual.flipStartedAt = time;
      visual.flipFrom = visual.card.rotation.y;
      visual.flipTo = visual.flipFrom + Math.PI;
    }
    return visual;
  };

  const render = (time: number) => {
    if (disposed) return;
    if (canvas.clientWidth !== viewportWidth || canvas.clientHeight !== viewportHeight) resize();
    const registrations = getCardDeckRegistrations();
    const activeIds = new Set(registrations.map((registration) => registration.widgetId));
    Array.from(visuals.keys()).forEach((widgetId) => {
      if (!activeIds.has(widgetId)) removeVisual(widgetId);
    });
    const drag = getCardDeckDragState();
    const gather = getCardDeckGatherAnimation();
    const gatheredCardIds = new Set(gather?.entries.map((entry) => entry.card.id) ?? []);

    registrations.forEach((registration) => {
      const card = registration.cards[0];
      if (!card) {
        removeVisual(registration.widgetId);
        return;
      }
      const rect = registration.element.getBoundingClientRect();
      const visible = rect.width > 4 && rect.height > 4 && rect.right > 0 && rect.bottom > 0 && rect.left < viewportWidth && rect.top < viewportHeight;
      const colors = getThemeColors();
      const originRegistration = registrations.find((entry) => entry.widgetId === card.originWidgetId);
      const backDesign = resolveBackDesign(card, originRegistration?.backDesign, colors.accent);
      const stackBackDesigns = registration.cards.slice(1, 4).map((stackCard) => {
        const stackOrigin = registrations.find((entry) => entry.widgetId === stackCard.originWidgetId);
        return resolveBackDesign(stackCard, stackOrigin?.backDesign, colors.accent);
      });
      const visual = ensureVisual(
        registration.widgetId,
        card,
        registration.cards.length,
        backDesign,
        stackBackDesigns,
        time,
      );
      visual.group.visible = visible;
      visual.card.visible = visible;
      visual.cardShadow.visible = visible;
      visual.faceElement.hidden = !visible;
      const isGatheringCard = gatheredCardIds.has(card.id);
      if (isGatheringCard) {
        visual.group.visible = false;
        visual.card.visible = false;
        visual.cardShadow.visible = false;
        visual.faceElement.hidden = true;
      }
      if (!visible || isGatheringCard) return;
      const maxWidth = rect.width * 0.68;
      const maxHeight = rect.height * 0.76;
      const cardHeight = Math.min(maxHeight, maxWidth / (CARD_WIDTH / CARD_HEIGHT));
      const scale = Math.max(1, cardHeight / CARD_HEIGHT);
      const deckX = rect.left + rect.width / 2;
      const deckY = rect.top + rect.height / 2;
      let x = deckX;
      let y = deckY;
      let dragLift = 0;
      const isDragged = drag?.sourceWidgetId === registration.widgetId && drag.cardId === card.id;
      if (isDragged && drag) {
        if (drag.phase === 'dragging') {
          x = drag.x;
          y = drag.y;
          dragLift = 28;
        } else if (drag.phase === 'settling') {
          const rawProgress = drag.settleDuration === 0 ? 1 : Math.min(1, (time - drag.settleStartedAt) / drag.settleDuration);
          const progress = 1 - Math.pow(1 - rawProgress, 3);
          x = THREE.MathUtils.lerp(drag.settleFromX, drag.settleToX, progress);
          y = THREE.MathUtils.lerp(drag.settleFromY, drag.settleToY, progress) - Math.sin(Math.PI * progress) * 24;
          dragLift = 28 * (1 - progress);
        }
      }
      visual.group.position.copy(screenPosition(deckX, deckY, viewportWidth, viewportHeight, 10));
      visual.group.scale.setScalar(scale);
      visual.group.rotation.z = 0;
      visual.card.position.copy(screenPosition(x, y - dragLift, viewportWidth, viewportHeight, isDragged ? 80 : 20));
      visual.card.scale.setScalar(scale * (isDragged ? 1.04 : 1));
      visual.card.rotation.z = isDragged && drag?.phase === 'dragging'
        ? THREE.MathUtils.clamp((drag.x - drag.startX) * -0.0015, -0.16, 0.16)
        : 0;
      if (visual.flipStartedAt > 0) {
        const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 360;
        const progress = duration === 0 ? 1 : Math.min(1, (time - visual.flipStartedAt) / duration);
        visual.card.rotation.y = THREE.MathUtils.lerp(visual.flipFrom, visual.flipTo, 1 - Math.pow(1 - progress, 3));
        if (progress >= 1) {
          visual.card.rotation.y = visual.faceUp ? 0 : Math.PI;
          visual.flipStartedAt = 0;
        }
      }
      visual.cardShadow.position.z = -0.2 * Math.cos(visual.card.rotation.y);
      const cardWidth = cardHeight * (CARD_WIDTH / CARD_HEIGHT);
      const faceWidth = cardWidth * ((CARD_WIDTH - 0.08) / CARD_WIDTH);
      const faceHeight = cardHeight * ((CARD_HEIGHT - 0.08) / CARD_HEIGHT);
      visual.faceElement.style.left = `${x}px`;
      visual.faceElement.style.top = `${y - dragLift}px`;
      visual.faceElement.style.width = `${faceWidth}px`;
      visual.faceElement.style.height = `${faceHeight}px`;
      visual.faceElement.style.setProperty('--card-face-height', `${faceHeight}px`);
      visual.faceElement.style.zIndex = isDragged ? '1000' : '1';
      visual.faceElement.style.transform = [
        'translate(-50%, -50%)',
        `rotateZ(${-visual.card.rotation.z}rad)`,
        `perspective(${Math.max(420, faceHeight * 5)}px)`,
        `rotateY(${visual.card.rotation.y}rad)`,
      ].join(' ');
      const showDraggedBack = isDragged && !card.faceUp;
      visual.backElement.hidden = !showDraggedBack;
      if (showDraggedBack) {
        visual.backElement.style.left = `${x}px`;
        visual.backElement.style.top = `${y - dragLift}px`;
        visual.backElement.style.width = `${cardWidth}px`;
        visual.backElement.style.height = `${cardHeight}px`;
        visual.backElement.style.setProperty('--card-back-height', `${cardHeight}px`);
        visual.backElement.style.zIndex = '1001';
        visual.backElement.style.transform = [
          'translate(-50%, -50%)',
          `rotateZ(${visual.card.rotation.z}rad)`,
          `perspective(${Math.max(420, cardHeight * 5)}px)`,
        ].join(' ');
      }
    });

    const gatheringCardIds = new Set(gather?.entries.map((entry) => entry.card.id) ?? []);
    Array.from(gatherVisuals.keys()).forEach((cardId) => {
      if (!gatheringCardIds.has(cardId)) removeGatherVisual(cardId);
    });
    if (gather) {
      const rawProgress = gather.duration === 0 ? 1 : Math.min(1, (time - gather.startedAt) / gather.duration);
      const progress = 1 - Math.pow(1 - rawProgress, 3);
      gather.entries.forEach((entry) => {
        const visual = ensureGatherVisual(entry);
        const sourceRegistration = registrations.find((registration) => registration.widgetId === entry.sourceWidgetId);
        const targetRegistration = registrations.find((registration) => registration.widgetId === gather.targetWidgetId);
        const sizeRect = sourceRegistration?.element.getBoundingClientRect()
          ?? targetRegistration?.element.getBoundingClientRect();
        if (!sizeRect) {
          visual.group.visible = false;
          visual.faceElement.hidden = true;
          return;
        }
        const maxWidth = sizeRect.width * 0.68;
        const maxHeight = sizeRect.height * 0.76;
        const cardHeight = Math.min(maxHeight, maxWidth / (CARD_WIDTH / CARD_HEIGHT));
        const scale = Math.max(1, cardHeight / CARD_HEIGHT);
        const sourceSpreadX = ((entry.index % 5) - 2) * 6;
        const sourceSpreadY = (Math.floor(entry.index / 5) % 3) * 5;
        const targetSpreadX = ((entry.index % 7) - 3) * 1.5;
        const flightFan = Math.sin(Math.PI * progress);
        const flightSpreadX = ((entry.index % 7) - 3) * 22 * flightFan;
        const flightSpreadY = ((entry.index % 3) - 1) * 8 * flightFan;
        const arc = Math.sin(Math.PI * progress) * (48 + (entry.index % 4) * 8);
        const x = THREE.MathUtils.lerp(entry.sourceX + sourceSpreadX, entry.targetX + targetSpreadX, progress) + flightSpreadX;
        const y = THREE.MathUtils.lerp(entry.sourceY + sourceSpreadY, entry.targetY, progress) - arc + flightSpreadY;
        const rotationZ = Math.sin(Math.PI * progress) * (entry.index % 2 === 0 ? -0.13 : 0.13);
        visual.group.visible = true;
        visual.group.position.copy(screenPosition(x, y, viewportWidth, viewportHeight, 180 + entry.index));
        visual.group.scale.setScalar(scale * (1 + Math.sin(Math.PI * progress) * 0.06));
        visual.group.rotation.z = rotationZ;

        const cardWidth = cardHeight * (CARD_WIDTH / CARD_HEIGHT);
        const faceWidth = cardWidth * ((CARD_WIDTH - 0.08) / CARD_WIDTH);
        const faceHeight = cardHeight * ((CARD_HEIGHT - 0.08) / CARD_HEIGHT);
        visual.faceElement.hidden = false;
        visual.faceElement.style.left = `${x}px`;
        visual.faceElement.style.top = `${y}px`;
        visual.faceElement.style.width = `${faceWidth}px`;
        visual.faceElement.style.height = `${faceHeight}px`;
        visual.faceElement.style.setProperty('--card-face-height', `${faceHeight}px`);
        visual.faceElement.style.zIndex = String(20 + entry.index);
        visual.faceElement.style.transform = [
          'translate(-50%, -50%)',
          `rotateZ(${-rotationZ}rad)`,
          `perspective(${Math.max(420, faceHeight * 5)}px)`,
          `rotateY(${visual.card.rotation.y}rad)`,
        ].join(' ');
      });
    }
    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(render);
  };

  resize();
  frameId = window.requestAnimationFrame(render);

  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      window.cancelAnimationFrame(frameId);
      Array.from(visuals.keys()).forEach(removeVisual);
      Array.from(gatherVisuals.keys()).forEach(removeGatherVisual);
      faceLayer.remove();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}