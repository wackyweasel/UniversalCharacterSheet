import type { TriggerDef } from '../types';

export const BUTTON_PRESSED_KIND = 'button.pressed';

export const buttonPressedTrigger: TriggerDef = {
  kind: BUTTON_PRESSED_KIND,
  label: 'The button is pressed',
  mode: 'action',
  match: ({ action }) => (action.kind === 'press' ? { text: 'Button pressed' } : null),
  describe: (d) => `${d.widget} is pressed`,
};

export const EVENT_BUTTON_TRIGGERS = [buttonPressedTrigger];
