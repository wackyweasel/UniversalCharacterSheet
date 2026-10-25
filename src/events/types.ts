import type {
  Character,
  CharacterEventEffect,
  CharacterEventParams,
  CharacterEventTrigger,
  Widget,
  WidgetData,
} from '../types';
import type { DiceExpressionRollResult } from '../utils/diceExpression';
import type { DiceResultView } from '../utils/diceResult';
import type { FormulaLabels } from '../utils/formulaSyntax';

export interface EventOption {
  value: string;
  label: string;
}

/** What the editor knows while it lists targets and options. */
export interface SpecContext {
  character: Character;
  widget?: Widget;
  /** The chosen target, for param options that depend on it. */
  target?: string;
}

export type EventParamType = 'text' | 'formula' | 'amount' | 'select' | 'dice';

export interface EventParamSpec {
  key: string;
  label: string;
  type: EventParamType;
  options?: EventOption[] | ((ctx: SpecContext) => EventOption[]);
  default?: string;
  placeholder?: string;
  help?: string;
  /** Hides the field unless it applies to the current choices. */
  visible?: (params: CharacterEventParams) => boolean;
}

export interface TargetSpec {
  label: string;
  options: (ctx: SpecContext) => EventOption[];
  /** Label of the "any item" choice, stored as `*`; absent when a specific item is required. */
  any?: string;
  /** Name shown for a choice that no longer exists, instead of its stored value (e.g. for ids). */
  missing?: string;
  /** Shown instead of the choices when there are none yet, e.g. how to add one. */
  empty?: string;
}

export const ANY_TARGET = '*';

export type WidgetActionKind = 'roll' | 'draw' | 'shuffle' | 'rest' | 'round' | 'turn' | 'finish' | 'press';

/** Something a widget did that isn't visible as a data change, such as a dice roll. */
export interface WidgetAction {
  widgetId: string;
  kind: WidgetActionKind;
  total?: number;
  /** Individual die results. */
  dice?: number[];
  /** Result text, such as a roll's notation or the name whose turn started. */
  text?: string;
  /** Key of the item the action concerns, such as a step dice trait. */
  target?: string;
  /** Picked entries, such as roll table results or drawn cards. */
  results?: string[];
  /** Dice pool outcome kind (success, failure, botch, critical, partial). */
  outcome?: string;
  successes?: number;
}

export type TriggerOutputType = 'number' | 'text';

/** A piece of data a trigger passes to its event, read there as `@event_<key>`. */
export interface TriggerOutput {
  key: string;
  /** Short description for the editor, e.g. "Damage taken". */
  label: string;
  type: TriggerOutputType;
}

export type TriggerData = Record<string, number | string>;

export interface TriggerMatch {
  /** Values of the trigger's outputs, by key; missing ones read as 0 or empty text. */
  data?: TriggerData;
  /** What happened, for the timeline. */
  text: string;
}

interface TriggerContextBase {
  trigger: CharacterEventTrigger;
  /** Trigger params with defaults filled in. */
  params: CharacterEventParams;
}

export interface StateTriggerContext extends TriggerContextBase {
  prev?: Widget;
  next?: Widget;
  prevCharacter: Character;
  nextCharacter: Character;
  prevLabels: () => FormulaLabels;
  nextLabels: () => FormulaLabels;
}

export interface ActionTriggerContext extends TriggerContextBase {
  action: WidgetAction;
  widget?: Widget;
  character: Character;
  labels: () => FormulaLabels;
}

/** Text pieces used to build a readable sentence for a trigger or effect. */
export interface DescribeContext {
  params: CharacterEventParams;
  /** Name of the selected item or label, or the "any" text. */
  target: string;
  /** Title of the selected widget. */
  widget: string;
}

export interface TriggerDef {
  kind: string;
  label: string;
  mode: 'state' | 'action' | 'manual';
  target?: TargetSpec;
  /** Only offers its widget as a trigger source once the target has something to choose. */
  needsTarget?: boolean;
  params?: EventParamSpec[];
  /** Data passed to the event's condition and effects. */
  outputs?: TriggerOutput[];
  detect?: (ctx: StateTriggerContext) => TriggerMatch | null;
  match?: (ctx: ActionTriggerContext) => TriggerMatch | null;
  describe: (ctx: DescribeContext) => string;
}

export interface EventAmount {
  value: number;
  /** e.g. "5" or "1d6 + 2 = 5". */
  text: string;
  roll?: DiceExpressionRollResult;
}

export interface EffectContext {
  effect: CharacterEventEffect;
  params: CharacterEventParams;
  character: Character;
  widget?: Widget;
  labels: FormulaLabels;
  /** Evaluates a number, formula or dice expression param; null when it can't be evaluated. */
  amount: (key: string) => EventAmount | null;
  /** Text param with inline `{formulas}` replaced by their values. */
  text: (key: string) => string;
}

export interface EventDiceDisplay {
  title: string;
  subtitle?: string;
  result?: DiceExpressionRollResult;
  /** Pre-built view for results that aren't plain expressions (pools, roll tables). */
  view?: DiceResultView;
}

export interface EffectOutcome {
  /** Patch for the effect's widget. */
  data?: Partial<WidgetData>;
  /** Replacement character, for effects that change more than one widget. */
  character?: Character;
  /** What happened, for the timeline. */
  text: string;
  /** Rolls to show in the dice result dialog. */
  rolls?: EventDiceDisplay[];
  /** Widget actions caused by the effect, which can trigger further events. */
  actions?: WidgetAction[];
  /** Another event to run right away, before the next effect. */
  runEventId?: string;
}

export interface EffectDef {
  kind: string;
  label: string;
  target?: TargetSpec;
  params?: EventParamSpec[];
  /** Returns null when the effect can't do anything; `text` explains a skipped effect. */
  apply: (ctx: EffectContext) => EffectOutcome | null;
  describe: (ctx: DescribeContext) => string;
}

export interface WidgetEventDefs {
  triggers: TriggerDef[];
  effects: EffectDef[];
}
