import { useMemo, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useAutomationsPanelStore } from '../store/useAutomationsPanelStore';
import { getWidgetTitle } from '../utils/characterVariables';
import { collectNumericTargets, numericTargetKey, type NumericTarget } from '../utils/numericTargets';
import { getEffectSourceActivationProblem, getWidgetEffectSources } from '../utils/widgetEffects';
import { EffectsEditButton } from './editors/EffectsEditButton';
import AutomationsPanelHeader from './AutomationsPanelHeader';
import { ArrowRightIcon, ChevronDownIcon, ChevronRightIcon, PlusIcon } from './icons';

type Filter = 'all' | 'active' | 'inactive' | 'problems';
const buttonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-button border border-theme-border px-2.5 text-xs font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper';
const inputClass = 'h-9 w-full rounded-button border border-theme-border bg-theme-background px-2.5 text-sm font-body text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-accent/40';
const cardButtonClass = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-button text-theme-muted transition-colors hover:bg-theme-accent/15 hover:text-theme-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent';

interface EffectEndpointProps {
  kind: 'Source' | 'Target';
  name: string;
  context?: string;
  breakdown?: string;
  amount?: number;
  allowExceedLimits?: boolean;
  onHighlight?: () => void;
}

function EffectEndpoint({ kind, name, context, breakdown, amount, allowExceedLimits, onHighlight }: EffectEndpointProps) {
  return (
    <button
      type="button"
      aria-label={`Highlight ${kind.toLowerCase()}: ${name}${amount !== undefined ? `, adjustment ${amount >= 0 ? '+' : ''}${amount}` : ''}`}
      title={onHighlight ? `Highlight ${kind.toLowerCase()}` : 'Target no longer exists. Select a replacement.'}
      disabled={!onHighlight}
      onClick={onHighlight}
      className="flex w-full min-w-0 flex-1 items-start gap-2 rounded-theme border border-theme-border-soft bg-theme-background p-2 text-left font-body transition-colors enabled:hover:border-theme-accent enabled:hover:bg-theme-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent disabled:cursor-not-allowed"
    >
      <span className="min-w-0 flex-1">
        <span className="block break-words text-xs font-semibold text-theme-ink">{name}</span>
        {context && <span className="mt-0.5 block break-words text-[11px] leading-snug text-theme-muted">{context}</span>}
        {breakdown && <span title="Net adjustment includes all active Effects and value limits." className="mt-1 block break-words text-[11px] leading-snug text-theme-muted">{breakdown}</span>}
      </span>
      {amount !== undefined && (
        <span
          aria-label={`Adjustment ${amount >= 0 ? '+' : ''}${amount}`}
          className={`inline-flex min-h-7 min-w-7 max-w-[40%] shrink-0 self-end items-center justify-center break-all rounded-button border px-2 py-0.5 font-mono text-sm font-bold leading-tight ${amount > 0 ? 'border-green-500/40 bg-green-500/10 text-green-600' : amount < 0 ? 'border-red-500/40 bg-red-500/10 text-red-600' : 'border-theme-border bg-theme-paper text-theme-muted'}`}
          title={allowExceedLimits ? 'Can exceed value limits' : 'Respects value limits'}
        >
          {amount >= 0 ? '+' : ''}{amount}
        </span>
      )}
    </button>
  );
}

interface Props {
  onRevealWidget: (sheetId: string, widgetId: string) => void;
  isBottom: boolean;
}

export default function EffectsPanel({ onRevealWidget, isBottom }: Props) {
  const character = useStore((state) => state.characters.find((item) => item.id === state.activeCharacterId));
  const setOpen = useAutomationsPanelStore((state) => state.setOpen);
  const showVariable = useAutomationsPanelStore((state) => state.showVariable);
  const setSourceActive = useStore((state) => state.setWidgetEffectSourceActive);
  const editingWidgetId = useStore((state) => state.editingWidgetId);
  const mode = useStore((state) => state.mode);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState(false);
  const [selectedKey, setSelectedKey] = useState('');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [activationError, setActivationError] = useState<{ key: string; message: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const targets = useMemo(() => new Map((character ? collectNumericTargets(character) : []).map((target) => [numericTargetKey(target.ref), target])), [character]);
  const sources = useMemo(() => character?.sheets.flatMap((sheet) => sheet.widgets.flatMap((widget) =>
    getWidgetEffectSources(widget, character.itemEffectValues).map((source) => ({
      key: JSON.stringify([widget.id, source.key]),
      widget, source, sheetId: sheet.id, context: `${sheet.name} - ${getWidgetTitle(widget)}`,
      effects: source.effects.map((effect) => {
        const target = effect.target ? targets.get(numericTargetKey(effect.target)) : undefined;
        const value = effect.target ? character.itemEffectValues?.[numericTargetKey(effect.target)] : undefined;
        const adjustment = value ? value.effective - value.base : 0;
        return {
          effect,
          target,
          targetName: target ? `${target.source} - ${target.title}` : effect.targetName || 'Unassigned value',
          targetTitle: target ? target.ref.kind === 'variable' ? `@${target.title}` : target.title : effect.targetName ?? 'Unassigned value',
          targetSource: target?.source,
          breakdown: target?.formula && value ? `${value.base} formula ${adjustment >= 0 ? '+' : '-'} ${Math.abs(adjustment)} net = ${value.effective} final` : undefined,
          problem: target?.problem ?? (!target ? 'Target missing. Select a replacement.' : undefined),
        };
      }),
    }))
  )) ?? [], [character, targets]);
  const configured = sources.filter((entry) => entry.effects.length > 0);
  const selected = sources.find((entry) => entry.key === selectedKey);
  const normalizedQuery = query.trim().toLowerCase();
  const visible = configured.filter((entry) => {
    if (filter === 'active' && !entry.source.active) return false;
    if (filter === 'inactive' && entry.source.active) return false;
    if (filter === 'problems' && !entry.effects.some((effect) => effect.problem)) return false;
    return !normalizedQuery || [entry.source.name, entry.context, ...entry.effects.map((effect) => `${effect.targetName} ${effect.effect.amount}`)]
      .some((text) => text.toLowerCase().includes(normalizedQuery));
  });
  const filters: { id: Filter; label: string; count: number; warning?: boolean }[] = [
    { id: 'all', label: 'All', count: configured.length },
    { id: 'active', label: 'Active', count: configured.filter((entry) => entry.source.active).length },
    { id: 'inactive', label: 'Inactive', count: configured.filter((entry) => !entry.source.active).length },
    { id: 'problems', label: 'Needs attention', count: configured.filter((entry) => entry.effects.some((effect) => effect.problem)).length, warning: configured.some((entry) => entry.effects.some((effect) => effect.problem)) },
  ];

  if (!character) return null;

  const revealWidget = (sheetId: string, widgetId: string) => {
    onRevealWidget(sheetId, widgetId);
    if (isBottom) setOpen(false);
  };
  const targetHighlight = (target: NumericTarget | undefined): (() => void) | undefined => {
    if (!target) return undefined;
    const ref = target.ref;
    if (ref.kind === 'variable') return () => showVariable(ref.variableId);
    const sheet = character.sheets.find((item) => item.widgets.some((widget) => widget.id === ref.widgetId));
    return sheet ? () => revealWidget(sheet.id, ref.widgetId) : undefined;
  };

  return (
    <section
      id="effects-panel"
      aria-label="Effects"
      className="flex min-h-0 flex-1 flex-col"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || event.defaultPrevented) return;
        if (adding) setAdding(false);
        else if (query) setQuery('');
        else return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <AutomationsPanelHeader
        description="Bonuses and penalties that apply while an item, skill, condition or other source is active."
        searchLabel="Search effects"
        searchPlaceholder="Search sources, widgets or affected values"
        query={query}
        onQueryChange={(value) => { setQuery(value); setCollapsed(new Set()); }}
        filter={filter}
        filterLabel="Filter effects"
        filters={filters}
        onFilterChange={setFilter}
        deletion={{ tab: 'effects', count: configured.reduce((sum, entry) => sum + entry.effects.length, 0) }}
        addAction={<button type="button" onClick={() => { setAdding(true); setSelectedKey(''); listRef.current?.scrollTo({ top: 0 }); }} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-button border border-theme-accent bg-theme-accent px-3 text-xs font-bold font-body text-theme-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40" disabled={sources.length === 0}><PlusIcon className="h-3.5 w-3.5" /> Add effects</button>}
        onCollapseAll={() => setCollapsed(new Set([...collapsed, ...visible.map((entry) => entry.key)]))}
        onExpandAll={() => setCollapsed(new Set())}
        collapseDisabled={visible.length === 0 || visible.every((entry) => collapsed.has(entry.key))}
        expandDisabled={!visible.some((entry) => collapsed.has(entry.key))}
      />
      <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden overscroll-contain p-3">
        {adding && (
          <div className="space-y-2 rounded-button border border-theme-border bg-theme-background p-3">
            <label className="block text-xs font-body">
              Apply effects while this source is active
              <select aria-label="Effect source" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)} className={`${inputClass} mt-1`}>
                <option value="">Choose an item, skill, condition or other source</option>
                {selectedKey && !selected && <option value={selectedKey}>Source no longer available - choose another</option>}
                {character.sheets.flatMap((sheet) => sheet.widgets.map((widget) => {
                  const entries = sources.filter((entry) => entry.widget.id === widget.id);
                  return entries.length ? (
                    <optgroup key={widget.id} label={`${sheet.name} - ${getWidgetTitle(widget)}`}>
                      {entries.map((entry) => <option key={entry.key} value={entry.key}>{entry.source.name || 'Unnamed entry'}</option>)}
                    </optgroup>
                  ) : null;
                }))}
              </select>
            </label>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setAdding(false)} className={buttonClass}>Cancel</button>
              {selected && <EffectsEditButton key={selected.key} widget={selected.widget} collection={selected.source.collection} index={selected.source.index} label="Configure effects" onSave={() => setAdding(false)} />}
            </div>
          </div>
        )}
        {configured.length === 0 ? (
          <div className="px-4 py-8 text-center font-body">
            <p className="font-heading font-bold">No effects yet</p>
            <p className="mt-2 text-sm text-theme-muted">A Ring of Strength can add +1 Strength while active, then remove the bonus when turned off.</p>
            <p className="mt-2 text-sm text-theme-muted">{sources.length ? 'Choose Add effects to configure a source.' : 'Add an Inventory, Equipment, Codex, skill, condition, checklist, switch, temporary entry or threshold zone to get started.'}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="px-4 py-8 text-center font-body">
            <p className="font-heading font-bold">No matching effects</p>
            <button type="button" onClick={() => { setQuery(''); setFilter('all'); }} className={`${buttonClass} mt-3`}>Show all effects</button>
          </div>
        ) : visible.map((entry) => {
          const activationProblem = getEffectSourceActivationProblem(entry.widget, entry.source, !entry.source.active)
            || (editingWidgetId ? 'Finish editing the widget before changing activation.' : undefined)
            || (mode === 'print' ? 'Activation is unavailable while printing.' : undefined)
            || (!entry.source.active ? entry.effects.find((effect) => effect.problem)?.problem : undefined);
          const name = entry.source.name || 'Unnamed entry';
          const activationHint = entry.source.collection === 'timedEffects'
            ? entry.source.active ? 'Deactivate and expire this timer' : 'Activate and restart the full duration'
            : entry.source.collection === 'skillNodes' ? entry.source.active ? 'Lock this skill and refund its points' : 'Unlock this skill using its point cost' : entry.source.hint;
          return (
          <article key={entry.key} aria-label={`Effects for ${name}`} className="rounded-theme border border-theme-border p-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={`${collapsed.has(entry.key) ? 'Expand' : 'Collapse'} effects for ${entry.source.name || 'entry'}`}
                aria-expanded={!collapsed.has(entry.key)}
                onClick={() => setCollapsed((current) => {
                  const next = new Set(current);
                  if (next.has(entry.key)) next.delete(entry.key); else next.add(entry.key);
                  return next;
                })}
                className={cardButtonClass}
              >
                {collapsed.has(entry.key) ? <ChevronRightIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                role="switch"
                aria-label={`Activate ${name}`}
                aria-checked={entry.source.active}
                disabled={!!activationProblem}
                title={activationProblem || activationHint}
                onClick={() => {
                  try {
                    setSourceActive(entry.widget.id, entry.source.key, !entry.source.active);
                    setActivationError(null);
                  } catch (cause) {
                    console.error('Could not change effect source activation', cause);
                    setActivationError({ key: entry.key, message: cause instanceof Error ? cause.message : 'Could not change activation.' });
                  }
                }}
                className={`relative h-6 w-11 shrink-0 rounded-full border border-theme-border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent disabled:cursor-not-allowed disabled:opacity-60 ${entry.source.active ? 'bg-theme-accent' : 'bg-theme-background'}`}
              >
                <span aria-hidden="true" className={`absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-black/25 bg-theme-paper shadow-sm transition-transform ${entry.source.active ? 'translate-x-[22px]' : 'translate-x-1'}`} />
              </button>
              <div className="min-w-0 flex-1">
                <h3 className="break-words font-heading text-sm font-bold">{collapsed.has(entry.key) ? name : entry.source.active ? 'Active' : 'Inactive'}</h3>
              </div>
              {entry.effects.length > 1 && <span className="shrink-0 text-xs text-theme-muted font-body">{entry.effects.length} effects</span>}
              <EffectsEditButton widget={entry.widget} collection={entry.source.collection} index={entry.source.index} iconOnly />
            </div>
            {!collapsed.has(entry.key) && <>
            {activationProblem && <p className="mt-1 break-words text-[11px] text-theme-muted font-body">{activationProblem}</p>}
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1.5">
              <EffectEndpoint kind="Source" name={name} context={entry.context} onHighlight={() => revealWidget(entry.sheetId, entry.widget.id)} />
              <ArrowRightIcon className="h-3.5 w-3.5 self-center text-theme-muted" />
              <ul className="flex min-w-0 flex-col gap-1.5">
                {entry.effects.map(({ effect, target, targetTitle, targetSource, breakdown, problem }) => (
                  <li key={effect.id} className="flex flex-1 flex-col">
                    <EffectEndpoint kind="Target" name={targetTitle} context={targetSource} breakdown={breakdown} amount={effect.amount} allowExceedLimits={effect.allowExceedLimits} onHighlight={targetHighlight(target)} />
                    {problem && <p className="mt-1 break-words text-xs text-red-500 font-body">{problem}</p>}
                  </li>
                ))}
              </ul>
            </div>
            </>}
            {activationError?.key === entry.key && <p role="alert" className="mt-1 break-words text-xs text-red-500 font-body">{activationError.message}</p>}
          </article>
        ); })}
      </div>
    </section>
  );
}
