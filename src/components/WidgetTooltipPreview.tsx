import { Widget, WidgetType } from '../types';

import NumberWidget from './widgets/NumberWidget';
import NumberDisplayWidget from './widgets/NumberDisplayWidget';
import ListWidget from './widgets/ListWidget';
import TextWidget from './widgets/TextWidget';
import CheckboxWidget from './widgets/CheckboxWidget';
import HealthBarWidget from './widgets/HealthBarWidget';
import DiceRollerWidget from './widgets/DiceRollerWidget';
import DiceTrayWidget from './widgets/DiceTrayWidget';
import SpellSlotWidget from './widgets/SpellSlotWidget';
import ImageWidget from './widgets/ImageWidget';
import PoolWidget from './widgets/PoolWidget';
import ConditionWidget from './widgets/ConditionWidget';
import TableWidget from './widgets/TableWidget';
import TimeTrackerWidget from './widgets/TimeTrackerWidget';
import FormWidget from './widgets/FormWidget';
import RestButtonWidget from './widgets/RestButtonWidget';
import ProgressBarWidget from './widgets/ProgressBarWidget';
import MapSketcherWidget from './widgets/MapSketcherWidget';
import RollTableWidget from './widgets/RollTableWidget';
import InitiativeTrackerWidget from './widgets/InitiativeTrackerWidget';
import DeckWidget from './widgets/DeckWidget';
import TimerWidget from './widgets/TimerWidget';
import StepDiceWidget from './widgets/StepDiceWidget';

const PREVIEW_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#d6c7a4"/>
        <stop offset="100%" stop-color="#84745b"/>
      </linearGradient>
    </defs>
    <rect width="320" height="180" fill="url(#bg)"/>
    <circle cx="160" cy="68" r="34" fill="#f5ead4" fill-opacity="0.85"/>
    <path d="M95 156c15-37 47-58 65-58 19 0 52 21 66 58" fill="#2e2a26" fill-opacity="0.5"/>
  </svg>`
)}`;

const PREVIEW_WIDGETS: Record<WidgetType, Widget> = {
  NUMBER: {
    id: 'preview-number',
    type: 'NUMBER',
    x: 0,
    y: 0,
    w: 220,
    h: 118,
    locked: true,
    data: {
      label: 'Trackers',
      numberItems: [
        { name: 'Ammo', value: 6 },
        { name: 'Luck', value: 2 },
      ],
    },
  },
  NUMBER_DISPLAY: {
    id: 'preview-number-display',
    type: 'NUMBER_DISPLAY',
    x: 0,
    y: 0,
    w: 220,
    h: 112,
    locked: true,
    data: {
      label: 'Stats',
      displayLayout: 'horizontal',
      displayNumbers: [
        { label: 'STR', value: 14 },
        { label: 'DEX', value: 12 },
        { label: 'WIL', value: 16 },
      ],
    },
  },
  LIST: {
    id: 'preview-list',
    type: 'LIST',
    x: 0,
    y: 0,
    w: 220,
    h: 120,
    locked: true,
    data: {
      label: 'Inventory',
      itemCount: 3,
      items: ['Silver key', 'Rope', 'Torch'],
    },
  },
  TEXT: {
    id: 'preview-text',
    type: 'TEXT',
    x: 0,
    y: 0,
    w: 220,
    h: 120,
    locked: true,
    data: {
      label: 'Notes',
      text: 'Meet the ferryman before dusk. The western gate is trapped.',
    },
  },
  CHECKBOX: {
    id: 'preview-checkbox',
    type: 'CHECKBOX',
    x: 0,
    y: 0,
    w: 220,
    h: 120,
    locked: true,
    data: {
      label: 'Checklist',
      checkboxItems: [
        { name: 'Rations', checked: true },
        { name: 'Torches', checked: false },
        { name: 'Waterskin', checked: true },
      ],
    },
  },
  HEALTH_BAR: {
    id: 'preview-health',
    type: 'HEALTH_BAR',
    x: 0,
    y: 0,
    w: 220,
    h: 92,
    locked: true,
    data: {
      label: 'Health',
      currentValue: 17,
      maxValue: 25,
      increment: 1,
    },
  },
  DICE_ROLLER: {
    id: 'preview-dice-roller',
    type: 'DICE_ROLLER',
    x: 0,
    y: 0,
    w: 220,
    h: 120,
    locked: true,
    data: {
      label: 'Roll',
      diceGroups: [
        { count: 2, faces: 20 },
        { count: 1, faces: 6 },
      ],
      modifier: 3,
    },
  },
  DICE_TRAY: {
    id: 'preview-dice-tray',
    type: 'DICE_TRAY',
    x: 0,
    y: 0,
    w: 220,
    h: 116,
    locked: true,
    data: {
      label: 'Dice Tray',
      availableDice: [4, 6, 8, 10, 12, 20],
    },
  },
  SPELL_SLOT: {
    id: 'preview-spell-slot',
    type: 'SPELL_SLOT',
    x: 0,
    y: 0,
    w: 220,
    h: 132,
    locked: true,
    data: {
      label: 'Spell Slots',
      spellLevels: [
        { level: 1, max: 4, used: 1 },
        { level: 2, max: 3, used: 2 },
        { level: 3, max: 2, used: 1 },
      ],
    },
  },
  IMAGE: {
    id: 'preview-image',
    type: 'IMAGE',
    x: 0,
    y: 0,
    w: 220,
    h: 150,
    locked: true,
    data: {
      label: 'Portrait',
      imageUrl: PREVIEW_IMAGE,
    },
  },
  POOL: {
    id: 'preview-pool',
    type: 'POOL',
    x: 0,
    y: 0,
    w: 220,
    h: 118,
    locked: true,
    data: {
      label: 'Resources',
      poolResources: [
        { name: 'Stress', current: 4, max: 6, style: 'dots' },
        { name: 'Mana', current: 2, max: 4, style: 'squares' },
      ],
      showPoolCount: false,
    },
  },
  TOGGLE_GROUP: {
    id: 'preview-toggle-group',
    type: 'TOGGLE_GROUP',
    x: 0,
    y: 0,
    w: 220,
    h: 96,
    locked: true,
    data: {
      label: 'Conditions',
      toggleItems: [
        { name: 'Poisoned', active: true },
        { name: 'Blessed', active: false },
        { name: 'Hidden', active: false },
      ],
    },
  },
  TABLE: {
    id: 'preview-table',
    type: 'TABLE',
    x: 0,
    y: 0,
    w: 220,
    h: 136,
    locked: true,
    data: {
      label: 'Table',
      columns: ['Name', 'Qty', 'Wt'],
      rows: [
        { cells: ['Potion', '2', '1'] },
        { cells: ['Rope', '1', '3'] },
      ],
    },
  },
  TIME_TRACKER: {
    id: 'preview-time-tracker',
    type: 'TIME_TRACKER',
    x: 0,
    y: 0,
    w: 220,
    h: 136,
    locked: true,
    data: {
      label: 'Temporary Effects',
      timedEffects: [
        { name: 'Shield', remainingSeconds: 18, initialSeconds: 30 },
        { name: 'Light', remainingSeconds: 420, initialSeconds: 600 },
      ],
      roundMode: false,
      effectSuggestions: ['Bless', 'Poison', 'Haste'],
    },
  },
  FORM: {
    id: 'preview-form',
    type: 'FORM',
    x: 0,
    y: 0,
    w: 220,
    h: 120,
    locked: true,
    data: {
      label: 'Character Info',
      labelWidth: 36,
      formItems: [
        { name: 'Class', value: 'Ranger' },
        { name: 'Origin', value: 'Woodlands' },
      ],
    },
  },
  REST_BUTTON: {
    id: 'preview-rest-button',
    type: 'REST_BUTTON',
    x: 0,
    y: 0,
    w: 220,
    h: 92,
    locked: true,
    data: {
      label: 'Rest',
      buttonText: 'Take Rest',
      healToFull: true,
      clearConditions: true,
    },
  },
  PROGRESS_BAR: {
    id: 'preview-progress-bar',
    type: 'PROGRESS_BAR',
    x: 0,
    y: 0,
    w: 220,
    h: 92,
    locked: true,
    data: {
      label: 'Progress',
      currentValue: 6,
      maxValue: 8,
      showPercentage: false,
      showValues: true,
    },
  },
  MAP_SKETCHER: {
    id: 'preview-map-sketcher',
    type: 'MAP_SKETCHER',
    x: 0,
    y: 0,
    w: 220,
    h: 150,
    locked: true,
    data: {
      label: 'Map',
      gridEnabled: true,
      gridSize: 20,
      strokeColor: '#333333',
      strokeWidth: 2,
      corridorWidth: 10,
      mapShapes: [
        {
          id: 'room-1',
          type: 'rectangle',
          points: [],
          bounds: { x: 18, y: 16, width: 58, height: 42 },
          color: '#333333',
          strokeWidth: 2,
        },
        {
          id: 'hall-1',
          type: 'corridor',
          points: [],
          corridorStart: { x: 76, y: 37 },
          corridorEnd: { x: 126, y: 37 },
          corridorWidth: 10,
          color: '#333333',
          strokeWidth: 2,
        },
        {
          id: 'room-2',
          type: 'rectangle',
          points: [],
          bounds: { x: 126, y: 16, width: 52, height: 64 },
          color: '#333333',
          strokeWidth: 2,
        },
      ],
    },
  },
  ROLL_TABLE: {
    id: 'preview-roll-table',
    type: 'ROLL_TABLE',
    x: 0,
    y: 0,
    w: 220,
    h: 132,
    locked: true,
    data: {
      label: 'Random Table',
      showRollTableItems: true,
      rollTableItems: [
        { text: 'Quiet corridor', weight: 2 },
        { text: 'Enemy patrol', weight: 3 },
        { text: 'Strange omen', weight: 1 },
      ],
    },
  },
  INITIATIVE_TRACKER: {
    id: 'preview-initiative-tracker',
    type: 'INITIATIVE_TRACKER',
    x: 0,
    y: 0,
    w: 220,
    h: 168,
    locked: true,
    data: {
      label: 'Initiative Tracker',
      initiativePool: [
        { name: 'Scout', diceFaces: 20, flatBonus: 2 },
        { name: 'Ghoul', diceFaces: 20, flatBonus: 1 },
      ],
      initiativeEncounter: [
        { id: 'enc-1', name: 'Scout', diceFaces: 20, flatBonus: 2, rollResult: 18 },
        { id: 'enc-2', name: 'Ghoul', diceFaces: 20, flatBonus: 1, rollResult: 12 },
      ],
      initiativeShowRollButton: true,
      initiativeCurrentIndex: 0,
      initiativeAdvanceTimeTrackers: false,
      initiativeAdvanceByRound: true,
      initiativeAdvanceTimeAmount: 1,
      initiativeAdvanceTimeUnit: 'rounds',
    },
  },
  DECK: {
    id: 'preview-deck',
    type: 'DECK',
    x: 0,
    y: 0,
    w: 220,
    h: 126,
    locked: true,
    data: {
      label: 'Deck',
      deckCards: [
        { name: 'Ace of Blades', amount: 1 },
        { name: 'Moon', amount: 2 },
        { name: 'Skull', amount: 1 },
      ],
      deckState: {
        remaining: ['Ace of Blades', 'Moon'],
        discarded: ['Skull'],
      },
      showDeckCards: true,
    },
  },
  TIMER: {
    id: 'preview-timer',
    type: 'TIMER',
    x: 0,
    y: 0,
    w: 220,
    h: 108,
    locked: true,
    data: {
      label: 'Timer',
      timerElapsed: 272000,
      timerRunning: false,
      timerCountDown: true,
      timerDuration: 600000,
    },
  },
  STEP_DICE: {
    id: 'preview-step-dice',
    type: 'STEP_DICE',
    x: 0,
    y: 0,
    w: 220,
    h: 126,
    locked: true,
    data: {
      label: 'Step Dice',
      stepDiceChain: [4, 6, 8, 10, 12, 20],
      stepDiceItems: [
        { name: 'Agility', currentStep: 2 },
        { name: 'Spirit', currentStep: 3 },
        { name: 'Might', currentStep: 1 },
      ],
    },
  },
};

function renderWidget(widget: Widget) {
  const props = {
    widget,
    mode: 'play' as const,
    width: widget.w || 220,
    height: widget.h || 120,
  };

  switch (widget.type) {
    case 'NUMBER': return <NumberWidget {...props} showFieldControls={false} />;
    case 'NUMBER_DISPLAY': return <NumberDisplayWidget {...props} />;
    case 'LIST': return <ListWidget {...props} showFieldControls={false} />;
    case 'TEXT': return <TextWidget {...props} />;
    case 'CHECKBOX': return <CheckboxWidget {...props} showFieldControls={false} interactive={false} />;
    case 'HEALTH_BAR': return <HealthBarWidget {...props} showMaxControl={false} interactive={false} />;
    case 'DICE_ROLLER': return <DiceRollerWidget {...props} interactive={false} />;
    case 'DICE_TRAY': return <DiceTrayWidget {...props} />;
    case 'SPELL_SLOT': return <SpellSlotWidget {...props} />;
    case 'IMAGE': return <ImageWidget {...props} showUploadControl={false} />;
    case 'POOL': return <PoolWidget {...props} showFieldControls={false} interactive={false} />;
    case 'TOGGLE_GROUP': return <ConditionWidget {...props} showFieldControls={false} interactive={false} />;
    case 'TABLE': return <TableWidget {...props} />;
    case 'TIME_TRACKER': return <TimeTrackerWidget {...props} />;
    case 'FORM': return <FormWidget {...props} showFieldControls={false} />;
    case 'REST_BUTTON': return <RestButtonWidget {...props} />;
    case 'PROGRESS_BAR': return <ProgressBarWidget {...props} showMaxControl={false} interactive={false} />;
    case 'MAP_SKETCHER': return <MapSketcherWidget {...props} />;
    case 'ROLL_TABLE': return <RollTableWidget {...props} />;
    case 'INITIATIVE_TRACKER': return <InitiativeTrackerWidget {...props} />;
    case 'DECK': return <DeckWidget {...props} />;
    case 'TIMER': return <TimerWidget {...props} />;
    case 'STEP_DICE': return <StepDiceWidget {...props} />;
    default: return null;
  }
}

export default function WidgetTooltipPreview({ type }: { type: WidgetType }) {
  const widget = PREVIEW_WIDGETS[type];

  return (
    <div className="pointer-events-none">
      <div
        className="bg-theme-paper border-[length:var(--border-width)] border-theme-border p-1 rounded-theme shadow-theme overflow-hidden"
        style={{
          width: `${widget.w || 220}px`,
          height: `${widget.h || 120}px`,
        }}
      >
        {renderWidget(widget)}
      </div>
    </div>
  );
}