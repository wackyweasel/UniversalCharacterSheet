import { describe, expect, it } from 'vitest';
import type { Character, CharacterEvent, CharacterEventStep } from '../types';
import { collectLabels } from '../utils/formulaEngine';
import { getDraftProblems, getNodeProblems, initDraft, toEventPayload } from './editorDraft';

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

  it('tidies nested steps when it opens an event', () => {
    const character = characterWith([{
      id: 'a',
      condition: '1',
      effects: [log('1')],
      steps: [{ id: 'b', condition: ' ', effects: [log('2')] }, { id: 'c', effects: [log('3')] }],
    }]);
    // The blank nested condition holds nothing, so what it guarded simply follows on the same side.
    expect(initDraft(character, { eventId: 'event' })!.steps).toEqual([{ id: 'a', condition: '1', effects: [log('1'), log('2'), log('3')] }]);
  });

  it('checks nested steps where they sit, and saves them nested', () => {
    const roll = { id: 'r', kind: 'dice.roll', resultName: 'bonus', params: { dice: '1d6' } };
    const character = characterWith([{
      id: 'a',
      condition: '1',
      effects: [log('1')],
      steps: [{ id: 'b', condition: '2', effects: [], otherwise: [{ id: '3', kind: 'log.message', params: { message: '{@event_bonus_total}' } }] }],
      otherwiseSteps: [{ id: 'c', condition: '0', effects: [roll] }],
    }]);
    const draft = initDraft(character, { eventId: 'event' })!;
    const problems = getDraftProblems(character, draft, collectLabels(character));
    expect(problems.steps).toEqual({});
    // The roll is on the other side of the first condition, so its result can't be read here.
    expect(problems.effects).toEqual({ 3: [expect.stringContaining('@event_bonus_total')] });
    expect([...getNodeProblems(draft, problems).keys()]).toEqual(['fx:3']);
    expect(toEventPayload(character, draft).steps[0]).toMatchObject({ steps: [{ id: 'b', otherwise: [{ id: '3' }] }], otherwiseSteps: [{ id: 'c', effects: [{ id: 'r' }] }] });
  });
});
