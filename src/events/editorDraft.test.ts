import { describe, expect, it } from 'vitest';
import type { Character, CharacterEvent, CharacterEventStep } from '../types';
import { collectLabels } from '../utils/formulaEngine';
import { getDraftProblems, initDraft, toEventPayload } from './editorDraft';

const log = (id: string) => ({ id, kind: 'log.message', params: { message: 'Hi' } });

function characterWith(steps: CharacterEventStep[]): Character {
  const event: CharacterEvent = { id: 'event', enabled: true, trigger: { kind: 'manual' }, steps };
  return { id: 'c', name: 'Test', sheets: [{ id: 's', name: 'Main', widgets: [] }], activeSheetId: 's', events: [event] } as Character;
}

describe('event editor draft', () => {
  it('keeps a blank condition that still has otherwise effects, and asks for it to be written', () => {
    const character = characterWith([{ id: 'a', condition: ' ', effects: [log('1')], otherwise: [log('2')] }]);
    const draft = initDraft(character, { eventId: 'event' })!;
    expect(draft.steps[0].condition).toBe('');
    expect(getDraftProblems(character, draft, collectLabels(character)).conditions).toEqual({ a: ['Write the condition, or remove it'] });
    // Saved as a draft, the otherwise effects come back with the condition still to write.
    expect(toEventPayload(character, draft).steps[0]).toMatchObject({ otherwise: [{ id: '2' }] });
  });

  it('drops a blank condition that holds nothing', () => {
    const character = characterWith([{ id: 'a', condition: '', effects: [log('1')], stopIfFalse: true }, { id: 'b', effects: [log('2')] }]);
    const draft = initDraft(character, { eventId: 'event' })!;
    expect(draft.steps).toEqual([{ id: 'a', effects: [log('1'), log('2')] }]);
    expect(getDraftProblems(character, draft, collectLabels(character)).count).toBe(0);
  });
});
