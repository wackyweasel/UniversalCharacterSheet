declare module '@3d-dice/dice-box-threejs' {
  export interface DiceBoxConfig {
    shadows?: boolean;
    sounds?: boolean;
    theme_colorset?: string;
    theme_material?: 'none' | 'metal' | 'wood' | 'glass' | 'plastic';
    theme_texture?: string;
    light_intensity?: number;
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
    applyColorSet(colors: DiceColorSet): void;
  }

  export default class DiceBox {
    DiceFactory: DiceFactory;
    constructor(container: string, config?: DiceBoxConfig);
    initialize(): Promise<void>;
    roll(notation: string): Promise<DiceBoxRollResult>;
    clearDice(): void;
  }
}