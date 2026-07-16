declare module '@3d-dice/dice-box-threejs' {
  export interface DiceBoxConfig {
    shadows?: boolean;
    sounds?: boolean;
    theme_colorset?: string;
    theme_material?: 'none' | 'metal' | 'wood' | 'glass' | 'plastic';
    theme_texture?: string;
    light_intensity?: number;
    baseScale?: number;
    strength?: number;
  }

  export interface DiceBoxRoll {
    type: string;
    sides: number;
    id: number;
    value: number;
  }

  export interface DiceBoxRollSet {
    num: number;
    type: string;
    sides: number;
    rolls: DiceBoxRoll[];
    total: number;
  }

  export interface DiceBoxRollResult {
    notation: string;
    sets: DiceBoxRollSet[];
    modifier: number;
    total: number;
  }

  export interface DiceDefinition {
    constructor: new (type: string) => DiceDefinition;
    type: string;
    font: string;
    labels: unknown[];
    setLabels(labels: string[]): void;
    setValues(minimum: number, maximum: number, step?: number): void;
  }

  export interface DiceFactoryConstructor {
    dice: Record<string, DiceDefinition>;
  }

  export interface DiceTexture {
    name: string;
    composite: string;
    texture: HTMLCanvasElement | null;
    bump: HTMLCanvasElement | null;
    material: string;
  }

  export interface DiceColorSet {
    foreground: string;
    background: string;
    outline: string;
    edge: string;
    texture: DiceTexture;
  }

  export interface DiceFactory {
    constructor: DiceFactoryConstructor;
    get(type: string): DiceDefinition | null;
    create(type: string): DiceMesh | null;
    applyColorSet(colors: DiceColorSet): void;
  }

  export interface DiceMesh {
    castShadow: boolean;
    receiveShadow: boolean;
    position: { set(x: number, y: number, z: number): void };
    quaternion: { set(x: number, y: number, z: number, w: number): void };
    rotation: { set(x: number, y: number, z: number): void };
  }

  export interface DiceScene {
    add(object: DiceMesh): void;
    remove(object: DiceMesh): void;
  }

  export interface DiceRenderer {
    render(scene: DiceScene, camera: unknown): void;
  }

  export default class DiceBox {
    DiceFactory: DiceFactory;
    camera: unknown;
    renderer: DiceRenderer;
    scene: DiceScene;
    constructor(container: string, config?: DiceBoxConfig);
    initialize(): Promise<void>;
    roll(notation: string): Promise<DiceBoxRollResult>;
    clearDice(): void;
  }
}