import { useEffect, useId, useRef } from 'react';
import type DiceBox from '@3d-dice/dice-box-threejs';
import type { DiceMesh } from '@3d-dice/dice-box-threejs';
import { applyDiceTheme, type DiceRenderTheme } from './DicePhysicsOverlay';

interface DiceThemePreviewProps {
  theme: DiceRenderTheme;
}

const BASE_DIE_QUATERNION = { x: 0.6804, y: -0.1928, z: 0.5667, w: 0.4228 };
const ROTATION_AXIS = { x: 0.7687, y: 0.5381, z: 0.3459 };
const ROTATION_RADIANS_PER_SECOND = Math.PI / 12;

const setDieRotation = (die: DiceMesh, rotation: number) => {
  const halfRotation = rotation / 2;
  const sine = Math.sin(halfRotation);
  const cosine = Math.cos(halfRotation);
  const { x, y, z, w } = BASE_DIE_QUATERNION;
  const rotationX = ROTATION_AXIS.x * sine;
  const rotationY = ROTATION_AXIS.y * sine;
  const rotationZ = ROTATION_AXIS.z * sine;

  die.quaternion.set(
    cosine * x + rotationX * w + rotationY * z - rotationZ * y,
    cosine * y - rotationX * z + rotationY * w + rotationZ * x,
    cosine * z + rotationX * y - rotationY * x + rotationZ * w,
    cosine * w - rotationX * x - rotationY * y - rotationZ * z,
  );
};

export default function DiceThemePreview({ theme }: DiceThemePreviewProps) {
  const stageId = `dice-theme-preview-${useId().replace(/:/g, '')}`;
  const stageRef = useRef<HTMLDivElement>(null);
  const diceBoxRef = useRef<DiceBox | null>(null);
  const diceBoxPromiseRef = useRef<Promise<DiceBox | null> | null>(null);
  const renderQueueRef = useRef(Promise.resolve());
  const renderVersionRef = useRef(0);
  const rotationRef = useRef(0);
  const staticDieRef = useRef<DiceMesh | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let disposed = false;
    const diceBoxPromise = import('@3d-dice/dice-box-threejs').then(async ({ default: DiceBoxClass }) => {
      if (disposed || !stage.isConnected) return null;

      const existingChildren = new Set(stage.children);
      const diceBox = new DiceBoxClass(`#${stageId}`, {
        shadows: true,
        sounds: false,
        theme_colorset: 'white',
        theme_material: 'plastic',
        theme_texture: '',
        light_intensity: 0.85,
        baseScale: 92,
        strength: 0.8,
      });
      await diceBox.initialize();

      if (disposed) {
        diceBox.clearDice();
        Array.from(stage.children).forEach((child) => {
          if (!existingChildren.has(child)) child.remove();
        });
        return null;
      }

      diceBoxRef.current = diceBox;
      return diceBox;
    });
    diceBoxPromiseRef.current = diceBoxPromise;

    return () => {
      disposed = true;
      renderVersionRef.current += 1;
      void diceBoxPromise.then((diceBox) => {
        if (!diceBox) return;
        if (staticDieRef.current) diceBox.scene.remove(staticDieRef.current);
        if (diceBoxRef.current === diceBox) diceBoxRef.current = null;
        diceBox.clearDice();
      });
    };
  }, [stageId]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let animationFrameId = 0;
    let previousTime = performance.now();
    const animate = (time: number) => {
      const diceBox = diceBoxRef.current;
      const die = staticDieRef.current;
      if (diceBox && die) {
        const elapsedSeconds = Math.min((time - previousTime) / 1000, 0.1);
        rotationRef.current = (rotationRef.current + elapsedSeconds * ROTATION_RADIANS_PER_SECOND) % (Math.PI * 2);
        setDieRotation(die, rotationRef.current);
        diceBox.renderer.render(diceBox.scene, diceBox.camera);
      }
      previousTime = time;
      animationFrameId = window.requestAnimationFrame(animate);
    };

    animationFrameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    const version = renderVersionRef.current + 1;
    renderVersionRef.current = version;
    const timeoutId = window.setTimeout(() => {
      renderQueueRef.current = renderQueueRef.current.then(async () => {
        if (version !== renderVersionRef.current || !diceBoxPromiseRef.current) return;

        try {
          const diceBox = await diceBoxPromiseRef.current;
          if (!diceBox || version !== renderVersionRef.current) return;

          await applyDiceTheme(diceBox, theme);
          if (version !== renderVersionRef.current) return;

          if (staticDieRef.current) diceBox.scene.remove(staticDieRef.current);

          const die = diceBox.DiceFactory.create('d20');
          if (!die) return;

          die.position.set(0, 0, 64);
          setDieRotation(die, rotationRef.current);
          die.castShadow = true;
          die.receiveShadow = true;
          diceBox.scene.add(die);
          diceBox.renderer.render(diceBox.scene, diceBox.camera);
          staticDieRef.current = die;
        } catch (error) {
          console.warn('3D dice theme preview unavailable.', error);
        }
      });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [theme.diceColor, theme.textColor, theme.textureKey, theme.textureOpacity]);

  return (
    <div
      ref={stageRef}
      id={stageId}
      className="dice-theme-preview"
      aria-label="3D dice appearance preview"
    />
  );
}