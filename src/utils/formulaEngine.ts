import { Character, Widget, WidgetData, NumberItem, DisplayNumber, PoolResource, InitiativeParticipant, DiceGroup, TableRow } from '../types';

/**
 * Collects all labels and their current values from a character.
 * Scans all sheets and all widgets.
 */
export function collectLabels(character: Character): Record<string, number> {
  const labels: Record<string, number> = {};

  for (const sheet of character.sheets) {
    for (const widget of sheet.widgets) {
      const data = widget.data;

      // Collect from fieldLabels (for simple scalar fields)
      if (data.fieldLabels) {
        for (const [field, labelName] of Object.entries(data.fieldLabels)) {
          if (labelName) {
            const value = getFieldValue(data, field);
            if (value !== undefined && !isNaN(value)) {
              labels[labelName] = value;
            }
          }
        }
      }

      // Collect from NumberItem arrays
      if (data.numberItems) {
        for (const item of data.numberItems as NumberItem[]) {
          if (item.valueLabel) {
            labels[item.valueLabel] = item.value ?? 0;
          }
        }
      }

      // Collect from DisplayNumber arrays
      if (data.displayNumbers) {
        for (const item of data.displayNumbers as DisplayNumber[]) {
          if (item.valueLabel) {
            labels[item.valueLabel] = item.value ?? 0;
          }
        }
      }

      // Collect from PoolResource arrays
      if (data.poolResources) {
        for (const res of data.poolResources as PoolResource[]) {
          if (res.maxLabel) labels[res.maxLabel] = res.max ?? 0;
          if (res.currentLabel) labels[res.currentLabel] = res.current ?? 0;
        }
      }

      // Collect from InitiativeParticipant arrays
      if (data.initiativePool) {
        for (const p of data.initiativePool as InitiativeParticipant[]) {
          if (p.flatBonusLabel) labels[p.flatBonusLabel] = p.flatBonus ?? 0;
        }
      }

      // Collect from DiceGroup arrays
      if (data.diceGroups) {
        for (const g of data.diceGroups as DiceGroup[]) {
          if (g.countLabel) labels[g.countLabel] = g.count ?? 0;
        }
      }

      // Collect from Table cell labels
      if (data.rows) {
        for (const row of data.rows as TableRow[]) {
          for (const cell of row.cells) {
            if (typeof cell !== 'string' && cell.label) {
              const num = parseFloat(cell.value);
              if (!isNaN(num)) labels[cell.label] = num;
            }
          }
        }
      }
    }
  }

  return labels;
}

function getFieldValue(data: WidgetData, field: string): number | undefined {
  switch (field) {
    case 'maxValue': return typeof data.maxValue === 'number' ? data.maxValue : undefined;
    case 'currentValue': return typeof data.currentValue === 'number' ? data.currentValue : undefined;
    case 'increment': return typeof data.increment === 'number' ? data.increment : undefined;
    case 'maxPool': return typeof data.maxPool === 'number' ? data.maxPool : undefined;
    case 'currentPool': return typeof data.currentPool === 'number' ? data.currentPool : undefined;
    case 'modifier': return typeof data.modifier === 'number' ? data.modifier : undefined;
    case 'healFlatAmount': return typeof data.healFlatAmount === 'number' ? data.healFlatAmount : undefined;
    default: return undefined;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Finds the rightmost (innermost) IF( in the expression for processing.
 */
function findInnermostIF(expr: string): { index: number; argsStart: number } | null {
  const regex = /\bIF\s*\(/gi;
  let lastMatch: { index: number; argsStart: number } | null = null;
  let match;
  while ((match = regex.exec(expr)) !== null) {
    lastMatch = { index: match.index, argsStart: match.index + match[0].length };
  }
  return lastMatch;
}

/**
 * Parses the comma-separated arguments of a function call starting right after
 * the opening parenthesis, respecting nested parentheses.
 */
function parseIFArguments(expr: string, startAfterParen: number): { args: string[]; endIndex: number } | null {
  let depth = 1;
  let argStart = startAfterParen;
  const args: string[] = [];
  for (let i = startAfterParen; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        args.push(expr.substring(argStart, i));
        return { args, endIndex: i };
      }
    } else if (ch === ',' && depth === 1) {
      args.push(expr.substring(argStart, i));
      argStart = i + 1;
    }
  }
  return null;
}

/**
 * Converts Excel-style comparison operators in a condition string to JS equivalents.
 * <> → !=, standalone = → ==, <=/>=/</> kept as-is.
 */
function convertComparison(condition: string): string {
  condition = condition.replace(/<>/g, '!=');
  condition = condition.replace(/(?<![<>!=])=(?!=)/g, '==');
  return condition;
}

/**
 * Processes all IF(condition, value_if_true, value_if_false) calls in an expression,
 * converting them to JavaScript ternary expressions.
 * Handles nested IF() calls by processing the innermost first.
 */
function processIFStatements(expr: string): string {
  let result = expr;
  const MAX_ITERATIONS = 20;
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const ifMatch = findInnermostIF(result);
    if (ifMatch === null) break;
    const parsed = parseIFArguments(result, ifMatch.argsStart);
    if (!parsed) break;
    if (parsed.args.length !== 3) break;
    const condition = convertComparison(parsed.args[0].trim());
    const trueVal = parsed.args[1].trim();
    const falseVal = parsed.args[2].trim();
    result = result.substring(0, ifMatch.index) + `(${condition} ? ${trueVal} : ${falseVal})` + result.substring(parsed.endIndex + 1);
  }
  return result;
}

/**
 * Evaluates a formula string, replacing @label references with values.
 * Supports basic arithmetic: +, -, *, /, parentheses, floor/ceil/round/min/max/abs,
 * and IF(condition, value_if_true, value_if_false) with =, <>, <, >, <=, >= comparisons.
 * Returns the computed number, or null if evaluation fails.
 */
export function evaluateFormula(formula: string, labels: Record<string, number>): number | null {
  if (!formula || !formula.trim()) return null;

  let expr = formula.trim();

  // Replace @label references with their values
  // Sort labels by length descending to avoid partial matches (e.g., @str before @s)
  const sortedLabels = Object.entries(labels).sort((a, b) => b[0].length - a[0].length);
  for (const [label, value] of sortedLabels) {
    expr = expr.replace(new RegExp(`@${escapeRegex(label)}\\b`, 'g'), String(value));
  }

  // Check for remaining unresolved @refs
  if (/@[\w]+/.test(expr)) return null;

  // Process IF() statements → JS ternary (before Math replacements, since args may contain functions)
  expr = processIFStatements(expr);

  // Replace floor/ceil/round with Math equivalents
  expr = expr.replace(/\bfloor\s*\(/g, 'Math.floor(');
  expr = expr.replace(/\bceil\s*\(/g, 'Math.ceil(');
  expr = expr.replace(/\bround\s*\(/g, 'Math.round(');
  expr = expr.replace(/\bmin\s*\(/g, 'Math.min(');
  expr = expr.replace(/\bmax\s*\(/g, 'Math.max(');
  expr = expr.replace(/\babs\s*\(/g, 'Math.abs(');

  // Validate: only allow safe characters (digits, operators, parens, spaces, dots, commas, Math methods, and ternary/comparison operators)
  const safeExpr = expr
    .replace(/Math\.(floor|ceil|round|min|max|abs)/g, '') // Remove known Math methods
    .replace(/[\d\s+\-*/().,?:!=<>]/g, ''); // Remove safe characters
  if (safeExpr.length > 0) return null;

  try {
    const result = Function(`"use strict"; return (${expr})`)() as number;
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return Math.round(result * 100) / 100; // Round to 2 decimal places
  } catch {
    return null;
  }
}

/**
 * Resolves all formulas in a character and returns updated character data.
 * Returns null if no changes were needed.
 * Runs up to 2 passes to handle chains of formula dependencies.
 * Also returns a list of changes for timeline logging.
 */
export function resolveCharacterFormulas(character: Character): Character | null {
  let current = character;
  let anyChanges = false;
  const allChanges: FormulaChange[] = [];

  // Up to 2 passes for chained dependencies
  for (let pass = 0; pass < 2; pass++) {
    const labels = collectLabels(current);
    let passChanged = false;

    const updatedSheets = current.sheets.map(sheet => {
      const updatedWidgets = sheet.widgets.map(widget => {
        const result = resolveWidgetFormulas(widget, labels);
        if (result) {
          passChanged = true;
          // Track changes for timeline
          allChanges.push(...detectFormulaChanges(widget, result, sheet.name));
          return result;
        }
        return widget;
      });
      return passChanged ? { ...sheet, widgets: updatedWidgets } : sheet;
    });

    if (passChanged) {
      anyChanges = true;
      current = { ...current, sheets: updatedSheets };
    } else {
      break; // No changes, no need for another pass
    }
  }

  if (anyChanges) {
    // Store changes for timeline event generation
    (current as any)._formulaChanges = allChanges;
  }

  return anyChanges ? current : null;
}

export interface FormulaChange {
  widgetLabel: string;
  fieldName: string;
  oldValue: number;
  newValue: number;
  formula: string;
  sheetName: string;
}

function detectFormulaChanges(oldWidget: Widget, newWidget: Widget, sheetName: string): FormulaChange[] {
  const changes: FormulaChange[] = [];
  const widgetLabel = oldWidget.data.label || oldWidget.type;

  // Check field-level formulas
  if (oldWidget.data.fieldFormulas) {
    for (const [field, formula] of Object.entries(oldWidget.data.fieldFormulas)) {
      if (formula) {
        const oldVal = getFieldValue(oldWidget.data, field);
        const newVal = getFieldValue(newWidget.data, field);
        if (oldVal !== undefined && newVal !== undefined && oldVal !== newVal) {
          changes.push({ widgetLabel, fieldName: field, oldValue: oldVal, newValue: newVal, formula, sheetName });
        }
      }
    }
  }

  // Check array item formula changes
  const checkArrayChanges = (
    oldItems: any[] | undefined,
    newItems: any[] | undefined,
    valueField: string,
    formulaField: string,
    nameField: string
  ) => {
    if (!oldItems || !newItems) return;
    for (let i = 0; i < Math.min(oldItems.length, newItems.length); i++) {
      if (newItems[i][formulaField] && oldItems[i][valueField] !== newItems[i][valueField]) {
        changes.push({
          widgetLabel,
          fieldName: `${oldItems[i][nameField] || `item ${i}`}`,
          oldValue: oldItems[i][valueField],
          newValue: newItems[i][valueField],
          formula: newItems[i][formulaField],
          sheetName
        });
      }
    }
  };

  checkArrayChanges(oldWidget.data.numberItems, newWidget.data.numberItems, 'value', 'valueFormula', 'name');
  checkArrayChanges(oldWidget.data.displayNumbers, newWidget.data.displayNumbers, 'value', 'valueFormula', 'label');
  checkArrayChanges(oldWidget.data.diceGroups, newWidget.data.diceGroups, 'count', 'countFormula', 'customDiceName');

  // Pool resources: check max and current separately
  if (oldWidget.data.poolResources && newWidget.data.poolResources) {
    for (let i = 0; i < Math.min(oldWidget.data.poolResources.length, newWidget.data.poolResources.length); i++) {
      const oldRes = oldWidget.data.poolResources[i] as PoolResource;
      const newRes = newWidget.data.poolResources[i] as PoolResource;
      if (newRes.maxFormula && oldRes.max !== newRes.max) {
        changes.push({ widgetLabel, fieldName: `${oldRes.name} max`, oldValue: oldRes.max, newValue: newRes.max, formula: newRes.maxFormula, sheetName });
      }
      if (newRes.currentFormula && oldRes.current !== newRes.current) {
        changes.push({ widgetLabel, fieldName: `${oldRes.name} current`, oldValue: oldRes.current, newValue: newRes.current, formula: newRes.currentFormula, sheetName });
      }
    }
  }

  // Initiative participants
  if (oldWidget.data.initiativePool && newWidget.data.initiativePool) {
    for (let i = 0; i < Math.min(oldWidget.data.initiativePool.length, newWidget.data.initiativePool.length); i++) {
      const oldP = oldWidget.data.initiativePool[i] as InitiativeParticipant;
      const newP = newWidget.data.initiativePool[i] as InitiativeParticipant;
      if (newP.flatBonusFormula && oldP.flatBonus !== newP.flatBonus) {
        changes.push({ widgetLabel, fieldName: `${oldP.name} bonus`, oldValue: oldP.flatBonus, newValue: newP.flatBonus, formula: newP.flatBonusFormula, sheetName });
      }
    }
  }

  // Table cell formula changes
  if (oldWidget.data.rows && newWidget.data.rows) {
    const oldRows = oldWidget.data.rows as TableRow[];
    const newRows = newWidget.data.rows as TableRow[];
    for (let r = 0; r < Math.min(oldRows.length, newRows.length); r++) {
      for (let c = 0; c < Math.min(oldRows[r].cells.length, newRows[r].cells.length); c++) {
        const oldCell = oldRows[r].cells[c];
        const newCell = newRows[r].cells[c];
        if (typeof newCell !== 'string' && newCell.formula) {
          const oldVal = typeof oldCell === 'string' ? parseFloat(oldCell) : parseFloat(oldCell.value);
          const newVal = parseFloat(newCell.value);
          if (!isNaN(oldVal) && !isNaN(newVal) && oldVal !== newVal) {
            changes.push({ widgetLabel, fieldName: `cell[${r},${c}]`, oldValue: oldVal, newValue: newVal, formula: newCell.formula, sheetName });
          }
        }
      }
    }
  }

  return changes;
}

/**
 * Resolves formulas in a single widget. Returns the updated widget or null if unchanged.
 */
function resolveWidgetFormulas(widget: Widget, labels: Record<string, number>): Widget | null {
  let changed = false;
  const updates: Partial<WidgetData> = {};

  // Resolve field-level formulas
  if (widget.data.fieldFormulas) {
    for (const [field, formula] of Object.entries(widget.data.fieldFormulas)) {
      if (formula) {
        const computed = evaluateFormula(formula, labels);
        if (computed !== null) {
          const currentVal = getFieldValue(widget.data, field);
          if (currentVal !== computed) {
            changed = true;
            switch (field) {
              case 'maxValue': updates.maxValue = computed; break;
              case 'currentValue': updates.currentValue = computed; break;
              case 'increment': updates.increment = computed; break;
              case 'maxPool': updates.maxPool = computed; break;
              case 'currentPool': updates.currentPool = computed; break;
              case 'modifier': updates.modifier = computed; break;
              case 'healFlatAmount': updates.healFlatAmount = computed; break;
            }
          }
        }
      }
    }
  }

  // Resolve NumberItem formulas
  if (widget.data.numberItems) {
    let itemsChanged = false;
    const updatedItems = (widget.data.numberItems as NumberItem[]).map(item => {
      if (!item.valueFormula) return item;
      const computed = evaluateFormula(item.valueFormula, labels);
      if (computed !== null && computed !== item.value) {
        itemsChanged = true;
        return { ...item, value: computed };
      }
      return item;
    });
    if (itemsChanged) {
      changed = true;
      updates.numberItems = updatedItems;
    }
  }

  // Resolve DisplayNumber formulas
  if (widget.data.displayNumbers) {
    let itemsChanged = false;
    const updatedItems = (widget.data.displayNumbers as DisplayNumber[]).map(item => {
      if (!item.valueFormula) return item;
      const computed = evaluateFormula(item.valueFormula, labels);
      if (computed !== null && computed !== item.value) {
        itemsChanged = true;
        return { ...item, value: computed };
      }
      return item;
    });
    if (itemsChanged) {
      changed = true;
      updates.displayNumbers = updatedItems;
    }
  }

  // Resolve PoolResource formulas
  if (widget.data.poolResources) {
    let itemsChanged = false;
    const updatedItems = (widget.data.poolResources as PoolResource[]).map(res => {
      let r = res;
      if (res.maxFormula) {
        const computed = evaluateFormula(res.maxFormula, labels);
        if (computed !== null && computed !== res.max) {
          itemsChanged = true;
          r = { ...r, max: computed };
        }
      }
      if (res.currentFormula) {
        const computed = evaluateFormula(res.currentFormula, labels);
        if (computed !== null && computed !== res.current) {
          itemsChanged = true;
          r = { ...r, current: computed };
        }
      }
      return r;
    });
    if (itemsChanged) {
      changed = true;
      updates.poolResources = updatedItems;
    }
  }

  // Resolve InitiativeParticipant formulas
  if (widget.data.initiativePool) {
    let itemsChanged = false;
    const updatedItems = (widget.data.initiativePool as InitiativeParticipant[]).map(p => {
      if (!p.flatBonusFormula) return p;
      const computed = evaluateFormula(p.flatBonusFormula, labels);
      if (computed !== null && computed !== p.flatBonus) {
        itemsChanged = true;
        return { ...p, flatBonus: computed };
      }
      return p;
    });
    if (itemsChanged) {
      changed = true;
      updates.initiativePool = updatedItems;
    }
  }

  // Resolve DiceGroup formulas
  if (widget.data.diceGroups) {
    let itemsChanged = false;
    const updatedItems = (widget.data.diceGroups as DiceGroup[]).map(g => {
      if (!g.countFormula) return g;
      const computed = evaluateFormula(g.countFormula, labels);
      if (computed !== null && computed !== g.count) {
        itemsChanged = true;
        return { ...g, count: Math.max(1, Math.round(computed)) };
      }
      return g;
    });
    if (itemsChanged) {
      changed = true;
      updates.diceGroups = updatedItems;
    }
  }

  // Resolve Table cell formulas
  if (widget.data.rows) {
    let rowsChanged = false;
    const updatedRows = (widget.data.rows as TableRow[]).map(row => {
      let rowChanged = false;
      const updatedCells = row.cells.map(cell => {
        if (typeof cell === 'string') return cell;
        if (!cell.formula) return cell;
        const computed = evaluateFormula(cell.formula, labels);
        if (computed !== null) {
          const newValue = String(computed);
          if (newValue !== cell.value) {
            rowChanged = true;
            return { ...cell, value: newValue };
          }
        }
        return cell;
      });
      if (rowChanged) {
        rowsChanged = true;
        return { ...row, cells: updatedCells };
      }
      return row;
    });
    if (rowsChanged) {
      changed = true;
      updates.rows = updatedRows;
    }
  }

  if (!changed) return null;
  return { ...widget, data: { ...widget.data, ...updates } };
}

/**
 * Gets a list of all available labels for display in the formula editor.
 */
export function getAvailableLabels(character: Character): { label: string; value: number; widgetLabel: string; sheetName: string }[] {
  const result: { label: string; value: number; widgetLabel: string; sheetName: string }[] = [];

  for (const sheet of character.sheets) {
    for (const widget of sheet.widgets) {
      const widgetLabel = widget.data.label || widget.type;
      const data = widget.data;

      if (data.fieldLabels) {
        for (const [field, labelName] of Object.entries(data.fieldLabels)) {
          if (labelName) {
            const value = getFieldValue(data, field) ?? 0;
            result.push({ label: labelName, value, widgetLabel, sheetName: sheet.name });
          }
        }
      }

      if (data.numberItems) {
        for (const item of data.numberItems as NumberItem[]) {
          if (item.valueLabel) {
            result.push({ label: item.valueLabel, value: item.value, widgetLabel, sheetName: sheet.name });
          }
        }
      }

      if (data.displayNumbers) {
        for (const item of data.displayNumbers as DisplayNumber[]) {
          if (item.valueLabel) {
            result.push({ label: item.valueLabel, value: item.value, widgetLabel, sheetName: sheet.name });
          }
        }
      }

      if (data.poolResources) {
        for (const res of data.poolResources as PoolResource[]) {
          if (res.maxLabel) result.push({ label: res.maxLabel, value: res.max, widgetLabel, sheetName: sheet.name });
          if (res.currentLabel) result.push({ label: res.currentLabel, value: res.current, widgetLabel, sheetName: sheet.name });
        }
      }

      if (data.initiativePool) {
        for (const p of data.initiativePool as InitiativeParticipant[]) {
          if (p.flatBonusLabel) result.push({ label: p.flatBonusLabel, value: p.flatBonus, widgetLabel, sheetName: sheet.name });
        }
      }

      if (data.diceGroups) {
        for (const g of data.diceGroups as DiceGroup[]) {
          if (g.countLabel) result.push({ label: g.countLabel, value: g.count, widgetLabel, sheetName: sheet.name });
        }
      }

      // Table cell labels
      if (data.rows) {
        for (const row of data.rows as TableRow[]) {
          for (const cell of row.cells) {
            if (typeof cell !== 'string' && cell.label) {
              const num = parseFloat(cell.value);
              result.push({ label: cell.label, value: isNaN(num) ? 0 : num, widgetLabel, sheetName: sheet.name });
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Extracts @label references from a formula string.
 */
function extractFormulaRefs(formula: string): string[] {
  const matches = formula.match(/@([a-zA-Z_][a-zA-Z0-9_]*)/g);
  return matches ? matches.map(m => m.slice(1)) : [];
}

/**
 * Builds a dependency graph: label -> list of labels it depends on (via its formula).
 * Scans all widgets in the character for formulas associated with labels.
 */
export function buildDependencyGraph(character: Character): Record<string, string[]> {
  const graph: Record<string, string[]> = {};

  for (const sheet of character.sheets) {
    for (const widget of sheet.widgets) {
      const data = widget.data;

      // Field-level: fieldLabels[field] is the label, fieldFormulas[field] is the formula
      if (data.fieldLabels && data.fieldFormulas) {
        for (const [field, labelName] of Object.entries(data.fieldLabels)) {
          if (labelName && data.fieldFormulas[field]) {
            graph[labelName] = extractFormulaRefs(data.fieldFormulas[field]);
          }
        }
      }

      // NumberItem arrays
      if (data.numberItems) {
        for (const item of data.numberItems as NumberItem[]) {
          if (item.valueLabel && item.valueFormula) {
            graph[item.valueLabel] = extractFormulaRefs(item.valueFormula);
          }
        }
      }

      // DisplayNumber arrays
      if (data.displayNumbers) {
        for (const item of data.displayNumbers as DisplayNumber[]) {
          if (item.valueLabel && item.valueFormula) {
            graph[item.valueLabel] = extractFormulaRefs(item.valueFormula);
          }
        }
      }

      // PoolResource arrays
      if (data.poolResources) {
        for (const res of data.poolResources as PoolResource[]) {
          if (res.maxLabel && res.maxFormula) graph[res.maxLabel] = extractFormulaRefs(res.maxFormula);
          if (res.currentLabel && res.currentFormula) graph[res.currentLabel] = extractFormulaRefs(res.currentFormula);
        }
      }

      // InitiativeParticipant arrays
      if (data.initiativePool) {
        for (const p of data.initiativePool as InitiativeParticipant[]) {
          if (p.flatBonusLabel && p.flatBonusFormula) {
            graph[p.flatBonusLabel] = extractFormulaRefs(p.flatBonusFormula);
          }
        }
      }

      // DiceGroup arrays
      if (data.diceGroups) {
        for (const g of data.diceGroups as DiceGroup[]) {
          if (g.countLabel && g.countFormula) {
            graph[g.countLabel] = extractFormulaRefs(g.countFormula);
          }
        }
      }

      // Table cell formulas
      if (data.rows) {
        for (const row of data.rows as TableRow[]) {
          for (const cell of row.cells) {
            if (typeof cell !== 'string' && cell.label && cell.formula) {
              graph[cell.label] = extractFormulaRefs(cell.formula);
            }
          }
        }
      }
    }
  }

  return graph;
}

/**
 * Checks whether setting a formula for `sourceLabel` that references the given labels
 * would create a circular dependency.
 * Returns the cycle path if circular (e.g. ["a", "b", "c", "a"]), or null if safe.
 */
export function detectCircularReference(
  sourceLabel: string,
  formulaStr: string,
  character: Character
): string[] | null {
  const graph = buildDependencyGraph(character);

  // Temporarily add the proposed edge
  const proposedDeps = extractFormulaRefs(formulaStr);
  graph[sourceLabel] = proposedDeps;

  // DFS cycle detection
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): string[] | null {
    if (inStack.has(node)) {
      // Found a cycle — extract the cycle portion
      const cycleStart = path.indexOf(node);
      return [...path.slice(cycleStart), node];
    }
    if (visited.has(node)) return null;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const dep of (graph[node] || [])) {
      const cycle = dfs(dep);
      if (cycle) return cycle;
    }

    path.pop();
    inStack.delete(node);
    return null;
  }

  return dfs(sourceLabel);
}
