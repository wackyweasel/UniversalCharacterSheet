import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type DiceBox from '@3d-dice/dice-box-threejs';
import { IMAGE_TEXTURES } from '../store/useThemeStore';
import { useDiceSettingsStore } from '../store/useDiceSettingsStore';

export interface PhysicalDieRequest {
  faces: number;
  labels?: string[];
  notation?: 'd100';
}

interface QueuedPhysicsRoll {
  id: number;
  dice: PhysicalDieRequest[];
  resolve: (values: number[] | null) => void;
}

const SUPPORTED_PHYSICAL_DICE = new Set([2, 4, 6, 8, 10, 12, 20]);
const queuedRolls: QueuedPhysicsRoll[] = [];
const subscribers = new Set<() => void>();
let nextRollId = 1;
let nextCustomDieTypeId = 1;
const customDieTypes = new Map<string, string>();
const diceTextureCache = new Map<string, Promise<HTMLCanvasElement | null>>();
const DICE_TEXTURE_SIZE = 512;
const DICE_TEXTURE_ZOOM = 5;

export const isPhysicalDieSupported = (faces: number): boolean => (
  Number.isInteger(faces) && SUPPORTED_PHYSICAL_DICE.has(faces)
);

const isPhysicalRequestSupported = (die: PhysicalDieRequest): boolean => (
  die.notation === 'd100'
    ? die.faces === 100 && !die.labels
    : isPhysicalDieSupported(die.faces)
);

const emitQueueChange = () => {
  subscribers.forEach((subscriber) => subscriber());
};

const subscribeToQueue = (subscriber: () => void) => {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
};

const getCurrentRoll = () => queuedRolls[0] ?? null;

export const rollPhysicalDice = (dice: PhysicalDieRequest[]): Promise<number[] | null> => {
  if (
    !useDiceSettingsStore.getState().threeDDiceEnabled
    || dice.length === 0
    || dice.some((die) => !isPhysicalRequestSupported(die))
  ) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    queuedRolls.push({
      id: nextRollId,
      dice: dice.map((die) => ({ ...die })),
      resolve,
    });
    nextRollId += 1;
    emitQueueChange();
  });
};

const completeRoll = (id: number, values: number[] | null) => {
  const activeRoll = queuedRolls[0];
  if (!activeRoll || activeRoll.id !== id) return;

  queuedRolls.shift();
  activeRoll.resolve(values);
  emitQueueChange();
};

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const getDiceTexture = (textureKey: string, opacity: number): Promise<HTMLCanvasElement | null> => {
  const source = IMAGE_TEXTURES[textureKey];
  if (!source || opacity <= 0) return Promise.resolve(null);

  const cacheKey = `${source}:${opacity}`;
  const cachedTexture = diceTextureCache.get(cacheKey);
  if (cachedTexture) return cachedTexture;

  const texturePromise = new Promise<HTMLCanvasElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = DICE_TEXTURE_SIZE;
      canvas.height = DICE_TEXTURE_SIZE;
      const context = canvas.getContext('2d');
      if (!context) {
        resolve(null);
        return;
      }

      const cropSize = Math.min(image.naturalWidth, image.naturalHeight) / DICE_TEXTURE_ZOOM;
      const sourceX = (image.naturalWidth - cropSize) / 2;
      const sourceY = (image.naturalHeight - cropSize) / 2;
      context.filter = 'contrast(1.75) saturate(1.15)';
      context.globalAlpha = opacity;
      context.drawImage(
        image,
        sourceX,
        sourceY,
        cropSize,
        cropSize,
        0,
        0,
        canvas.width,
        canvas.height
      );
      resolve(canvas);
    };
    image.onerror = () => resolve(null);
    image.src = source;
  });

  diceTextureCache.set(cacheKey, texturePromise);
  return texturePromise;
};

const applyDiceTheme = async (diceBox: DiceBox) => {
  const styles = getComputedStyle(document.documentElement);
  const diceColor = styles.getPropertyValue('--dice-color').trim() || '#ffffff';
  const textColor = styles.getPropertyValue('--dice-text-color').trim() || '#000000';
  const textureKey = styles.getPropertyValue('--dice-texture-key').trim() || 'none';
  const configuredOpacity = Number.parseFloat(styles.getPropertyValue('--dice-texture-opacity'));
  const textureOpacity = Number.isFinite(configuredOpacity)
    ? Math.min(1, Math.max(0, configuredOpacity))
    : 0.25;
  const textureCanvas = await getDiceTexture(textureKey, textureOpacity);

  diceBox.DiceFactory.applyColorSet({
    foreground: textColor,
    background: diceColor,
    outline: 'none',
    edge: diceColor,
    texture: {
      name: textureCanvas ? `ucs-${textureKey}-${textureOpacity}` : 'none',
      composite: 'source-over',
      texture: textureCanvas,
      bump: textureCanvas,
      material: 'none',
    },
  });
};

const getDieType = (diceBox: DiceBox, die: PhysicalDieRequest) => {
  if (die.notation) return die.notation;
  if (!die.labels) return `d${die.faces}`;

  const signature = `${die.faces}:${die.labels.join('\u001f')}`;
  const existingType = customDieTypes.get(signature);
  if (existingType) return existingType;

  const standardType = `d${die.faces}`;
  const standardDefinition = diceBox.DiceFactory.get(standardType);
  if (!standardDefinition) return standardType;

  const customType = `ucsdie${nextCustomDieTypeId}`;
  nextCustomDieTypeId += 1;

  const customDefinition = new standardDefinition.constructor(standardType);
  customDefinition.type = customType;
  customDefinition.font = '"Trebuchet MS", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';
  customDefinition.labels = [];
  customDefinition.setLabels(die.labels);
  customDefinition.setValues(1, die.faces);
  diceBox.DiceFactory.constructor.dice[customType] = customDefinition;
  customDieTypes.set(signature, customType);

  return customType;
};

export default function DicePhysicsOverlay() {
  const activeRoll = useSyncExternalStore(subscribeToQueue, getCurrentRoll, getCurrentRoll);
  const diceBoxPromiseRef = useRef<Promise<DiceBox> | null>(null);

  useEffect(() => {
    if (!activeRoll) return;

    let cancelled = false;

    const getDiceBox = () => {
      if (!diceBoxPromiseRef.current) {
        diceBoxPromiseRef.current = import('@3d-dice/dice-box-threejs').then(async ({ default: DiceBoxClass }) => {
          const diceBox = new DiceBoxClass('#dice-physics-stage', {
            shadows: true,
            sounds: false,
            theme_colorset: 'white',
            theme_material: 'plastic',
            theme_texture: '',
            light_intensity: 0.85,
            strength: 1.15,
          });
          await diceBox.initialize();
          return diceBox;
        });
      }

      return diceBoxPromiseRef.current;
    };

    const runRoll = async () => {
      try {
        const diceBox = await getDiceBox();
        if (cancelled) return;

        window.dispatchEvent(new Event('resize'));
        await new Promise((resolve) => window.requestAnimationFrame(resolve));
        if (cancelled) return;

        await applyDiceTheme(diceBox);
        if (cancelled) return;

        const notation = activeRoll.dice.map((die) => `1${getDieType(diceBox, die)}`).join('+');
        const results = await diceBox.roll(notation);
        if (cancelled) return;

        const values = results.sets.flatMap((set) => set.rolls.map((roll) => roll.value));
        const valuesAreValid = values.length === activeRoll.dice.length && values.every((value, index) => {
          const die = activeRoll.dice[index];
          return die.notation === 'd100'
            ? Number.isInteger(value) && value >= 10 && value <= 100 && value % 10 === 0
            : Number.isInteger(value) && value >= 1 && value <= die.faces;
        });

        await wait(1200);
        if (cancelled) return;

        diceBox.clearDice();
        completeRoll(activeRoll.id, valuesAreValid ? values : null);
      } catch (error) {
        console.warn('3D dice simulation unavailable; using standard dice results.', error);
        completeRoll(activeRoll.id, null);
      }
    };

    void runRoll();

    return () => {
      cancelled = true;
    };
  }, [activeRoll]);

  return createPortal(
    <div
      className={`dice-physics-overlay${activeRoll ? ' dice-physics-overlay--active' : ''}`}
      aria-hidden={!activeRoll}
    >
      <div id="dice-physics-stage" className="dice-physics-stage" />
      <div className="dice-physics-table-edge" />
      {activeRoll && <span className="sr-only" role="status">Rolling dice</span>}
    </div>,
    document.body
  );
}