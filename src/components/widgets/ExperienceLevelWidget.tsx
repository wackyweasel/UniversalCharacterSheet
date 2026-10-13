import { useEffect, useRef, useState } from 'react';
import { InlineFormulaText } from '../InlineFormulaText';
import { Tooltip } from '../Tooltip';
import type { ExperienceLevel, Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { useFormulaLabels } from '../../hooks/useFormulaLabels';
import { isFormulaBroken } from '../../utils/formulaEngine';
import {
  applyExperienceChange,
  formatXp,
  getExperienceProgress,
  normalizeXp,
  type ExperienceChangeMode,
  type ExperienceProgress,
} from '../../utils/experienceLevel';
import { WidgetDialogShell, WidgetEmptyState } from './WidgetPrimitives';

interface Props {
  widget: Widget;
  mode: 'play' | 'print';
  width: number;
  height: number;
  interactive?: boolean;
}

const INPUT_CLASS = 'h-10 w-full min-w-0 rounded-button border border-theme-border bg-theme-paper px-2 text-center text-lg font-bold text-theme-ink placeholder:font-normal placeholder:text-theme-muted focus:border-theme-accent focus:outline-none';

const CHANGE_MODES: { id: ExperienceChangeMode; label: string }[] = [
  { id: 'add', label: 'Add' },
  { id: 'remove', label: 'Remove' },
  { id: 'set', label: 'Set total' },
];

function describeLevel(progress: ExperienceProgress): string {
  return progress.name ? `${progress.level} (${progress.name})` : String(progress.level);
}

function ExperienceDialog({
  widgetId,
  levels,
  firstLevel,
  currentXp,
  onConfirm,
  onCancel,
}: {
  widgetId: string;
  levels: ExperienceLevel[];
  firstLevel: number | undefined;
  currentXp: number;
  onConfirm: (next: number, changeMode: ExperienceChangeMode) => void;
  onCancel: () => void;
}) {
  const [changeMode, setChangeMode] = useState<ExperienceChangeMode>('add');
  const [draft, setDraft] = useState('');
  const parsed = draft.trim() === '' ? null : Number(draft);
  const hasAmount = parsed !== null && Number.isFinite(parsed) && parsed >= 0;
  const next = hasAmount ? applyExperienceChange(currentXp, changeMode, parsed) : currentXp;
  const before = getExperienceProgress(levels, currentXp, firstLevel);
  const after = getExperienceProgress(levels, next, firstLevel);
  const canApply = hasAmount && next !== currentXp;
  const inputId = `xp-amount-${widgetId}`;

  let levelNote = before && after ? `Stays at level ${describeLevel(after)}` : '';
  let levelNoteClass = 'text-theme-muted';
  if (before && after && after.level > before.level) {
    levelNote = `Level up! ${before.level} → ${describeLevel(after)}`;
    levelNoteClass = 'font-bold text-theme-accent';
  } else if (before && after && after.level < before.level) {
    levelNote = `Level down: ${before.level} → ${describeLevel(after)}`;
    levelNoteClass = 'font-semibold text-theme-ink';
  }

  return (
    <WidgetDialogShell
      titleId={`xp-title-${widgetId}`}
      title="Experience points"
      onCancel={onCancel}
      onSubmit={() => {
        if (canApply) onConfirm(next, changeMode);
      }}
    >
      <div role="group" aria-label="Change type" className="mt-3 grid grid-cols-3 gap-1">
        {CHANGE_MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={changeMode === id}
            onClick={() => setChangeMode(id)}
            className={`widget-control min-w-0 px-2 py-1.5 text-sm ${changeMode === id ? 'widget-control--primary' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>
      <label htmlFor={inputId} className="mt-3 block text-sm font-medium">
        {changeMode === 'set' ? 'New total' : 'Amount'}
      </label>
      <input
        id={inputId}
        autoFocus
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        value={draft}
        placeholder={changeMode === 'set' ? String(currentXp) : '0'}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        className={`mt-1 ${INPUT_CLASS}`}
      />
      <div className="mt-3 space-y-0.5 text-sm" aria-live="polite">
        <p className="text-theme-muted">
          XP <span className="tabular-nums text-theme-ink">{formatXp(currentXp)}</span>
          {canApply && <> → <strong className="tabular-nums text-theme-ink">{formatXp(next)}</strong></>}
        </p>
        <p className={levelNoteClass}>{levelNote}</p>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
        <button type="submit" disabled={!canApply} className="widget-control widget-control--primary px-3 py-1.5 text-sm">Apply</button>
      </div>
    </WidgetDialogShell>
  );
}

export default function ExperienceLevelWidget({ widget, mode, interactive = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, fillColor, xpLevels, xpFirstLevel, xpShowLevelName = true } = widget.data;
  const fieldFormulas = widget.data.fieldFormulas as Record<string, string> | undefined;
  const hasXpFormula = !!fieldFormulas?.currentValue;
  const formulas = [
    fieldFormulas?.currentValue,
    ...(xpLevels ?? []).map((level) => level.xpFormula),
  ].filter((formula): formula is string => !!formula);
  const labels = useFormulaLabels(formulas.length > 0);
  const brokenFormula = formulas.find((formula) => isFormulaBroken(formula, labels));

  const progress = getExperienceProgress(xpLevels, widget.data.currentValue, xpFirstLevel);
  const canEdit = interactive && mode === 'play' && !hasXpFormula;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [leveledUp, setLeveledUp] = useState(false);
  const level = progress?.level;
  const previousLevelRef = useRef(level);

  useEffect(() => {
    const previousLevel = previousLevelRef.current;
    previousLevelRef.current = level;
    if (mode === 'print' || level === undefined || previousLevel === undefined || level <= previousLevel) return;
    setLeveledUp(true);
    const timer = window.setTimeout(() => setLeveledUp(false), 1400);
    return () => window.clearTimeout(timer);
  }, [level, mode]);

  const applyChange = (next: number, changeMode: ExperienceChangeMode) => {
    setDialogOpen(false);
    if (!progress || !xpLevels) return;
    const after = getExperienceProgress(xpLevels, next, xpFirstLevel);
    if (!after || next === progress.xp) return;
    updateWidgetData(widget.id, { currentValue: next });

    const delta = next - progress.xp;
    let description = changeMode === 'set'
      ? `XP set: ${formatXp(progress.xp)} → ${formatXp(next)}`
      : `${delta > 0 ? 'Gained' : 'Lost'} ${formatXp(Math.abs(delta))} XP (${formatXp(progress.xp)} → ${formatXp(next)})`;
    let icon = changeMode === 'set' ? '✏️' : delta > 0 ? '✨' : '🔻';
    if (after.level > progress.level) {
      description += ` · Level up! ${progress.level} → ${describeLevel(after)}`;
      icon = '⭐';
    } else if (after.level < progress.level) {
      description += ` · Level ${progress.level} → ${describeLevel(after)}`;
    }
    addTimelineEvent(label || 'Experience', 'XP_LEVEL', description, icon);
  };

  const header = label && (
    <div className="widget-header flex-shrink-0">
      <div className="widget-header-title min-w-0 flex-1 truncate">
        <InlineFormulaText text={label} />
      </div>
    </div>
  );

  if (!progress || !xpLevels) {
    return (
      <div className="xp-level-widget flex h-full w-full flex-col gap-1.5 font-body">
        {header}
        <WidgetEmptyState title="No levels" hint={interactive && mode === 'play' ? 'Add levels in the widget editor.' : undefined} />
      </div>
    );
  }

  const percent = Math.round(progress.fraction * 100);
  const showName = xpShowLevelName && progress.name;

  return (
    <div className="xp-level-widget flex h-full w-full flex-col gap-1.5 font-body">
      {header}

      <div className="xp-level__main flex min-h-0 flex-1 items-center gap-3">
        <div className={`xp-level__badge ${leveledUp ? 'xp-level__badge--level-up' : ''}`}>
          <span className="xp-level__badge-caption">Level</span>
          <span className="xp-level__badge-number">{progress.level}</span>
        </div>

        <div className="xp-level__details min-w-0 flex-1">
          {showName && <div className="xp-level__title truncate">{progress.name}</div>}
          <div
            className="xp-level__bar"
            role="progressbar"
            aria-label={`${label || 'Experience'} progress to next level`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={progress.isMaxLevel ? 'Maximum level reached' : `${formatXp(progress.xp)} of ${formatXp(progress.nextXp ?? 0)} XP`}
          >
            <div className="xp-level__bar-fill" style={{ width: `${percent}%`, ...(fillColor ? { backgroundColor: fillColor } : {}) }} />
          </div>
          <div className="xp-level__xp">
            {brokenFormula && <span className="mr-0.5 text-[9px] text-red-500" title={`Broken formula: ${brokenFormula}`}>⚠</span>}
            <strong>{formatXp(progress.xp)}</strong>
            <span>{progress.isMaxLevel ? ' XP · Max level' : ` / ${formatXp(progress.nextXp ?? 0)} XP`}</span>
          </div>
        </div>

        {canEdit && (
          <Tooltip content="Add, remove or set experience points">
            <button
              type="button"
              aria-label="Change experience points"
              className="widget-control h-7 min-h-0 flex-shrink-0 px-2 text-[11px] font-semibold"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setDialogOpen(true);
              }}
            >
              ± XP
            </button>
          </Tooltip>
        )}
      </div>

      {dialogOpen && canEdit && (
        <ExperienceDialog
          widgetId={widget.id}
          levels={xpLevels}
          firstLevel={xpFirstLevel}
          currentXp={normalizeXp(widget.data.currentValue)}
          onConfirm={applyChange}
          onCancel={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
