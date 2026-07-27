import type { Character, TableCell, Widget, WidgetType } from '../types';
import { getWidgetTypeLabel } from './widgetMetadata';

export interface SheetSearchSegment {
  context: string;
  text: string;
}

export interface SheetSearchDocument {
  sheetId: string;
  sheetName: string;
  widgetId: string;
  widgetType: WidgetType;
  widgetLabel: string;
  segments: SheetSearchSegment[];
}

export interface SheetSearchResult extends SheetSearchDocument {
  match: SheetSearchSegment;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function richTextToPlainText(value: string): string {
  if (!value) return '';
  if (typeof DOMParser === 'undefined') return value.replace(/<[^>]*>/g, ' ');

  const document = new DOMParser().parseFromString(value, 'text/html');
  return document.body.textContent || '';
}

function isTextValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getTableCellText(cell: string | TableCell): string {
  return typeof cell === 'string' ? cell : cell.value;
}

function getSearchSegments(widget: Widget): SheetSearchSegment[] {
  const segments: SheetSearchSegment[] = [];
  const seen = new Set<string>();
  const add = (context: string, value: unknown) => {
    if (!isTextValue(value)) return;
    const text = value.replace(/\s+/g, ' ').trim();
    const key = normalize(text);
    if (!key || seen.has(key)) return;
    seen.add(key);
    segments.push({ context, text });
  };
  const data = widget.data;

  add('Widget', data.label);
  add('Widget type', getWidgetTypeLabel(widget.type));

  switch (widget.type) {
    case 'TEXT':
      add('Notes', data.richText ? richTextToPlainText(data.richText) : data.text);
      break;
    case 'LIST':
      data.items?.forEach((item) => add('List item', item));
      break;
    case 'NUMBER':
      data.numberItems?.forEach((item) => add('Tracker', item.name));
      break;
    case 'NUMBER_DISPLAY':
      data.displayNumbers?.forEach((item) => add('Display', item.label));
      break;
    case 'FORM':
      data.formItems?.forEach((item) => {
        add('Field', item.name);
        add(item.name || 'Field value', item.value);
      });
      break;
    case 'CHECKBOX':
      data.checkboxItems?.forEach((item) => add('Checklist item', item.name));
      break;
    case 'TOGGLE_GROUP':
      data.toggleItems?.forEach((item) => add('Condition', item.name));
      break;
    case 'TABLE':
      data.columns?.forEach((column) => add('Column', column));
      data.rows?.forEach((row, rowIndex) => row.cells.forEach((cell, columnIndex) => {
        if (typeof cell !== 'string') add('Cell label', cell.label);
        add(`Cell ${rowIndex + 1}, ${columnIndex + 1}`, getTableCellText(cell));
      }));
      break;
    case 'TIME_TRACKER':
      data.timedEffects?.forEach((effect) => add('Effect', effect.name));
      break;
    case 'POOL':
      data.poolResources?.forEach((resource) => add('Resource', resource.name));
      break;
    case 'REST_BUTTON':
      add('Button', data.buttonText);
      break;
    case 'ROLL_TABLE':
      data.rollTableItems?.forEach((item) => add('Table result', item.text));
      break;
    case 'DECK':
      data.deckCards?.forEach((card) => add('Card', card.name));
      data.deckState?.remaining.forEach((card) => add('Remaining card', card));
      data.deckState?.discarded.forEach((card) => add('Discarded card', card));
      break;
    case 'INITIATIVE_TRACKER':
      data.initiativeEncounter?.forEach((participant) => add('Encounter', participant.name));
      data.initiativePool?.forEach((participant) => add('Participant', participant.name));
      break;
    case 'INVENTORY':
      data.inventoryItems?.forEach((item) => {
        add('Inventory item', item.name);
        item.fields.forEach((field) => {
          add(`${item.name || 'Item'} field`, field.name);
          if (typeof field.value === 'string') add(field.name || item.name || 'Item value', field.value);
        });
      });
      break;
    case 'DICE_ROLLER':
      data.diceGroups?.forEach((group) => {
        add('Custom die', group.customDiceName);
        group.customFaces?.forEach((face) => {
          if (!/^[-+]?\d+(?:\.\d+)?$/.test(face.trim())) add('Die face', face);
        });
      });
      break;
    case 'GRID_MAP':
      data.gridMapTokens?.forEach((token) => add('Map token', token.name));
      break;
    case 'STEP_DICE':
      data.stepDiceItems?.forEach((item) => add('Die track', item.name));
      break;
  }

  return segments;
}

export function buildSheetSearchIndex(character: Character): SheetSearchDocument[] {
  return character.sheets.flatMap((sheet) => sheet.widgets.map((widget) => ({
    sheetId: sheet.id,
    sheetName: sheet.name,
    widgetId: widget.id,
    widgetType: widget.type,
    widgetLabel: widget.data.label?.trim() || getWidgetTypeLabel(widget.type),
    segments: getSearchSegments(widget),
  })));
}

export function searchSheetIndex(
  documents: SheetSearchDocument[],
  query: string,
  activeSheetId: string,
): SheetSearchResult[] {
  const tokens = [...new Set(normalize(query).split(' ').filter(Boolean))];
  if (tokens.length === 0) return [];

  return documents
    .map((document, documentIndex) => {
      const normalizedSegments = document.segments.map((segment) => normalize(segment.text));
      const searchableText = normalizedSegments.join(' ');
      if (!tokens.every((token) => searchableText.includes(token))) return null;

      let bestIndex = 0;
      let bestScore = -1;
      normalizedSegments.forEach((segment, index) => {
        const score = tokens.reduce((total, token) => total + (segment.includes(token) ? 1 : 0), 0);
        if (score > bestScore) {
          bestIndex = index;
          bestScore = score;
        }
      });

      return {
        ...document,
        match: document.segments[bestIndex],
        documentIndex,
      };
    })
    .filter((result): result is SheetSearchResult & { documentIndex: number } => result !== null)
    .sort((left, right) => {
      const leftActive = left.sheetId === activeSheetId ? 0 : 1;
      const rightActive = right.sheetId === activeSheetId ? 0 : 1;
      return leftActive - rightActive || left.documentIndex - right.documentIndex;
    })
    .map(({ documentIndex: _documentIndex, ...result }) => result);
}