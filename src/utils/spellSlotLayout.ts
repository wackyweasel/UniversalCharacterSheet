export const SPELL_SLOT_MIN_SIZE = 12;
export const SPELL_SLOT_MAX_SIZE = 40;
// Level label (w-6) plus the gap that follows it.
const LEVEL_LABEL_WIDTH = 28;

export interface SpellSlotLayout {
  slotSize: number;
  columns: number[];
}

function getColumns(slotCounts: number[], availableWidth: number, slotSize: number, horizontalSpacing: number) {
  const fitting = Math.floor((availableWidth + horizontalSpacing) / (slotSize + horizontalSpacing));
  return slotCounts.map((count) => Math.max(1, Math.min(count, fitting)));
}

// Picks the largest slot size whose rows fit the height. Horizontal spacing is fixed, so slots wrap into more columns per level when the width is tight.
export function getSpellSlotLayout(slotCounts: number[], width: number, height: number, horizontalSpacing: number, verticalSpacing: number): SpellSlotLayout {
  const availableWidth = Math.max(0, width - LEVEL_LABEL_WIDTH);
  const levelGaps = Math.max(0, slotCounts.length - 1) * verticalSpacing;

  for (let slotSize = SPELL_SLOT_MAX_SIZE; slotSize >= SPELL_SLOT_MIN_SIZE; slotSize--) {
    const columns = getColumns(slotCounts, availableWidth, slotSize, horizontalSpacing);
    const totalHeight = slotCounts.reduce((sum, count, index) => {
      const rows = Math.ceil(count / columns[index]);
      return sum + rows * slotSize + Math.max(0, rows - 1) * horizontalSpacing;
    }, levelGaps);
    if (totalHeight <= height) return { slotSize, columns };
  }

  return { slotSize: SPELL_SLOT_MIN_SIZE, columns: getColumns(slotCounts, availableWidth, SPELL_SLOT_MIN_SIZE, horizontalSpacing) };
}
