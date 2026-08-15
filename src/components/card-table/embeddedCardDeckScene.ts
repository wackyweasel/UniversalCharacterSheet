import * as THREE from 'three';
import type { CardTableCard } from '../../types';
import { getCardDeckDragState, getCardDeckRegistrations } from './cardDeckRegistry';

interface DeckVisual {
  signature: string;
  cardId: string;
  faceUp: boolean;
  count: number;
  group: THREE.Group;
  card: THREE.Group;
  faceElement: HTMLDivElement;
  flipStartedAt: number;
  flipFrom: number;
  flipTo: number;
}

const CARD_WIDTH = 2.2;
const CARD_HEIGHT = 3.12;
const CARD_DEPTH = 0.12;
const TEXTURE_SCALE = 2;
const visuals = new Map<string, DeckVisual>();

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
) => {
  const canvas = document.createElement('canvas');
  canvas.width = 440 * TEXTURE_SCALE;
  canvas.height = 624 * TEXTURE_SCALE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Card texture canvas is unavailable.');
  context.scale(TEXTURE_SCALE, TEXTURE_SCALE);
  roundedRect(context, 5, 5, 430, 614, 28);
  context.fillStyle = colors.accent;
  context.fill();
  context.save();
  roundedRect(context, 22, 22, 396, 580, 20);
  context.clip();
  context.strokeStyle = colors.paper;
  context.globalAlpha = 0.2;
  context.lineWidth = 5;
  for (let offset = -canvas.height; offset < canvas.width + canvas.height; offset += 38) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset + canvas.height, canvas.height);
    context.stroke();
    context.beginPath();
    context.moveTo(offset + canvas.height, 0);
    context.lineTo(offset, canvas.height);
    context.stroke();
  }
  context.restore();
  context.globalAlpha = 1;
  context.strokeStyle = colors.paper;
  context.lineWidth = 7;
  roundedRect(context, 22, 22, 396, 580, 20);
  context.stroke();
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
    new THREE.MeshBasicMaterial({ map: createBackTexture(colors, anisotropy), transparent: true }),
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

  const title = document.createElement('div');
  title.className = 'card-deck-dom-face__title';
  title.textContent = card.title || 'Untitled card';
  face.appendChild(title);

  const symbol = document.createElement('div');
  symbol.className = 'card-deck-dom-face__symbol';
  symbol.textContent = card.symbol || ' ';
  face.appendChild(symbol);

  const divider = document.createElement('div');
  divider.className = 'card-deck-dom-face__divider';
  face.appendChild(divider);

  const body = document.createElement('div');
  body.className = 'card-deck-dom-face__body';
  body.textContent = card.body;
  face.appendChild(body);
  return face;
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

const cardSignature = (card: CardTableCard, colors: ReturnType<typeof getThemeColors>) => (
  `${card.id}\u001f${card.title}\u001f${card.symbol}\u001f${card.body}\u001f${Object.values(colors).join('\u001f')}`
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
    disposeTree(visual.group);
    visual.faceElement.remove();
    visuals.delete(widgetId);
  };

  const ensureVisual = (widgetId: string, card: CardTableCard, count: number, time: number) => {
    const colors = getThemeColors();
    const signature = cardSignature(card, colors);
    let visual = visuals.get(widgetId);
    if (!visual || visual.cardId !== card.id || visual.signature !== signature || visual.count !== count) {
      removeVisual(widgetId);
      const group = new THREE.Group();
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT),
        new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.2, depthWrite: false }),
      );
      shadow.position.set(0.08, -0.1, -0.2);
      group.add(shadow);
      const layerCount = Math.min(Math.max(count - 1, 0), 3);
      for (let index = layerCount; index > 0; index -= 1) {
        const layer = new THREE.Mesh(
          createBodyGeometry(),
          new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.65 }),
        );
        layer.position.set(-index * 0.035, index * 0.035, -index * 0.08);
        group.add(layer);
      }
      const cardGroup = createCard(colors, maxAnisotropy);
      cardGroup.rotation.y = card.faceUp ? 0 : Math.PI;
      group.add(cardGroup);
      const faceElement = createFaceElement(card, colors);
      faceLayer.appendChild(faceElement);
      scene.add(group);
      visual = {
        signature,
        cardId: card.id,
        faceUp: card.faceUp,
        count,
        group,
        card: cardGroup,
        faceElement,
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

    registrations.forEach((registration) => {
      const card = registration.cards[0];
      if (!card) {
        removeVisual(registration.widgetId);
        return;
      }
      const rect = registration.element.getBoundingClientRect();
      const visible = rect.width > 4 && rect.height > 4 && rect.right > 0 && rect.bottom > 0 && rect.left < viewportWidth && rect.top < viewportHeight;
      const visual = ensureVisual(registration.widgetId, card, registration.cards.length, time);
      visual.group.visible = visible;
      visual.faceElement.hidden = !visible;
      if (!visible) return;
      const maxWidth = rect.width * 0.68;
      const maxHeight = rect.height * 0.76;
      const cardHeight = Math.min(maxHeight, maxWidth / (CARD_WIDTH / CARD_HEIGHT));
      const scale = Math.max(1, cardHeight / CARD_HEIGHT);
      let x = rect.left + rect.width / 2;
      let y = rect.top + rect.height / 2;
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
      visual.group.position.copy(screenPosition(x, y - dragLift, viewportWidth, viewportHeight, isDragged ? 80 : 10));
      visual.group.scale.setScalar(scale * (isDragged ? 1.04 : 1));
      visual.group.rotation.z = isDragged && drag?.phase === 'dragging'
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
      const cardWidth = cardHeight * (CARD_WIDTH / CARD_HEIGHT);
      const faceWidth = cardWidth * ((CARD_WIDTH - 0.08) / CARD_WIDTH);
      const faceHeight = cardHeight * ((CARD_HEIGHT - 0.08) / CARD_HEIGHT);
      visual.faceElement.style.left = `${x}px`;
      visual.faceElement.style.top = `${y - dragLift}px`;
      visual.faceElement.style.width = `${faceWidth}px`;
      visual.faceElement.style.height = `${faceHeight}px`;
      visual.faceElement.style.setProperty('--card-face-height', `${faceHeight}px`);
      visual.faceElement.style.zIndex = isDragged ? '2' : '1';
      visual.faceElement.style.transform = [
        'translate(-50%, -50%)',
        `rotateZ(${-visual.group.rotation.z}rad)`,
        `perspective(${Math.max(420, faceHeight * 5)}px)`,
        `rotateY(${visual.card.rotation.y}rad)`,
      ].join(' ');
    });
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
      faceLayer.remove();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}