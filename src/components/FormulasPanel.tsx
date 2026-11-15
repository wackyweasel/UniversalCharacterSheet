import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { useAutomationsPanelStore } from '../store/useAutomationsPanelStore';
import { useEventsPanelStore } from '../store/useEventsPanelStore';
import { useCompendiumPanelStore } from '../store/useCompendiumPanelStore';
import { collectCharacterFormulas, previewCharacterFormula, type CharacterFormula, type FormulaCategory } from '../utils/characterFormulas';
import { collectLabels } from '../utils/formulaEngine';
import { FormulaEditorDialog } from './FormulaEditorDialog';
import { getTutorialStepIndex, isTutorialStep, useTutorialStore } from '../store/useTutorialStore';
import AutomationsPanelHeader from './AutomationsPanelHeader';
import { ArrowRightIcon, BookIcon, BoltIcon, ChevronDownIcon, ChevronRightIcon, PencilIcon } from './icons';

type Filter = 'all' | FormulaCategory | 'problems';
const categoryLabels: Record<FormulaCategory, string> = { fields: 'Fields', inline: 'Inline text', events: 'Events', library: 'Library' };
const buttonClass = 'inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-button border border-theme-border px-2 text-xs font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper';
const cardButtonClass = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-button text-theme-muted transition-colors hover:bg-theme-accent/15 hover:text-theme-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent';

function FormulaCode({ formula }: { formula: string }) {
  return <code className="block whitespace-pre-wrap break-words font-mono text-xs leading-snug text-theme-ink">
    {formula.split(/(@[A-Za-z_][A-Za-z0-9_]*)/g).map((part, index) => part.startsWith('@')
      ? <span key={index} className="font-semibold text-theme-accent">{part}</span> : part)}
  </code>;
}

interface Props {
  onRevealWidget: (sheetId: string, widgetId: string) => void;
  isBottom: boolean;
}

export default function FormulasPanel({ onRevealWidget, isBottom }: Props) {
  const character = useStore((state) => state.characters.find((entry) => entry.id === state.activeCharacterId));
  const saveFormula = useStore((state) => state.saveCharacterFormula);
  const setEditingWidgetId = useStore((state) => state.setEditingWidgetId);
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const setOpen = useAutomationsPanelStore((state) => state.setOpen);
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const guidedFormula = ['automation-formula-editor', 'advanced-table-sum', 'advanced-table-sum-expression', 'advanced-table-lookup', 'advanced-table-apply']
    .some((id) => isTutorialStep(tutorialStep, id));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [editing, setEditing] = useState<CharacterFormula | null>(null);
  const [error, setError] = useState<string | null>(null);

  const entries = useMemo(() => {
    if (!character) return [];
    const labels = collectLabels(character);
    return collectCharacterFormulas(character).map((entry) => ({ entry, preview: previewCharacterFormula(character, entry, labels) }));
  }, [character]);
  const problemCount = entries.filter((item) => item.preview.kind === 'problem').length;
  const normalizedQuery = query.trim().toLowerCase();
  const visible = entries.filter(({ entry, preview }) => {
    if (filter === 'problems' && preview.kind !== 'problem') return false;
    if (filter !== 'all' && filter !== 'problems' && entry.category !== filter) return false;
    return !normalizedQuery || [entry.title, entry.formula, entry.groupTitle, entry.context, preview.message ?? '', String(preview.value ?? '')]
      .some((text) => text.toLowerCase().includes(normalizedQuery));
  });
  const groups = new Map<string, typeof entries>();
  for (const item of visible) {
    const group = groups.get(item.entry.groupKey) ?? [];
    group.push(item);
    groups.set(item.entry.groupKey, group);
  }

  if (!character) return null;

  const reveal = (entry: CharacterFormula, edit = false) => {
    if (entry.eventId) {
      useEventsPanelStore.getState().openEditor({ eventId: entry.eventId });
    } else if (entry.widgetId && entry.sheetId) {
      if (entry.noteTabId) updateWidgetData(entry.widgetId, { activeNoteTabId: entry.noteTabId });
      onRevealWidget(entry.sheetId, entry.widgetId);
      if (edit) setEditingWidgetId(entry.widgetId);
      if (isBottom) setOpen(false);
    } else if (entry.category === 'library') {
      useCompendiumPanelStore.getState().setOpen(true);
    }
  };
  const apply = (formula: string | undefined) => {
    if (!editing) return;
    try {
      saveFormula(editing, formula);
      setEditing(null);
      setError(null);
      const tutorial = useTutorialStore.getState();
      if (isTutorialStep(tutorial.tutorialStep, 'automation-formula-editor') || isTutorialStep(tutorial.tutorialStep, 'advanced-table-apply')) tutorial.advanceTutorial();
    } catch (cause) {
      console.error('Could not save formula', cause);
      setError(cause instanceof Error ? cause.message : 'Could not save formula.');
    }
  };

  return (
    <section
      id="formulas-panel"
      aria-label="Formulas"
      className="flex min-h-0 flex-1 flex-col"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && query && !editing && !event.defaultPrevented) {
          event.preventDefault();
          event.stopPropagation();
          setQuery('');
        }
      }}
    >
      <AutomationsPanelHeader
        description="Calculations across all sheets, labels, text and events. Results update with your character."
        searchLabel="Search formulas"
        searchPlaceholder="Search formulas, labels or widgets"
        query={query}
        onQueryChange={(value) => { setQuery(value); setCollapsed(new Set()); }}
        filter={filter}
        filterLabel="Filter formulas"
        filters={[
          { id: 'all', label: 'All', count: entries.length },
          ...(Object.keys(categoryLabels) as FormulaCategory[]).map((category) => ({ id: category, label: categoryLabels[category], count: entries.filter((item) => item.entry.category === category).length })),
          { id: 'problems', label: 'Needs attention', count: problemCount, warning: problemCount > 0 },
        ]}
        onFilterChange={setFilter}
        deletion={{ tab: 'formulas', count: entries.length, editableFormulaCount: entries.filter((item) => item.entry.editable).length }}
        onCollapseAll={() => setCollapsed(new Set([...collapsed, ...groups.keys()]))}
        onExpandAll={() => setCollapsed(new Set())}
        collapseDisabled={groups.size === 0 || [...groups.keys()].every((key) => collapsed.has(key))}
        expandDisabled={![...groups.keys()].some((key) => collapsed.has(key))}
      />
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span aria-hidden="true" className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-theme-accent/15 font-heading text-xl font-bold italic text-theme-accent">fx</span>
            <h3 className="font-heading font-bold">No formulas yet</h3>
            <p className="mt-2 max-w-xs text-sm text-theme-muted font-body">Use the fx button beside a value to calculate it from other labels, such as <code className="font-mono text-theme-accent">floor((@strength - 10) / 2)</code>.</p>
            <p className="mt-2 text-xs text-theme-muted font-body">Formulas in text and event conditions appear here too. Dice rolls are not listed.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <h3 className="font-heading font-bold">No matching formulas</h3>
            <p className="mt-2 text-sm text-theme-muted font-body">Try another search or source.</p>
            <button type="button" onClick={() => { setQuery(''); setFilter('all'); }} className={`${buttonClass} mt-3`}>Show all formulas</button>
          </div>
        ) : (
          <div className="space-y-3 p-3">
            <p className="text-[11px] text-theme-muted font-body">{visible.length} {visible.length === 1 ? 'formula' : 'formulas'} in {groups.size} {groups.size === 1 ? 'source' : 'sources'}</p>
            {[...groups].map(([key, items]) => {
              const first = items[0].entry;
              const isCollapsed = collapsed.has(key);
              return (
                <section key={key} aria-label={first.groupTitle} className="overflow-hidden rounded-theme border border-theme-border">
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} formulas in ${first.groupTitle}`}
                    onClick={() => setCollapsed((current) => {
                      const next = new Set(current);
                      if (next.has(key)) next.delete(key); else next.add(key);
                      return next;
                    })}
                    className="flex w-full items-center gap-2 bg-theme-background/60 px-3 py-2 text-left transition-colors hover:bg-theme-accent/10"
                  >
                    {isCollapsed ? <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-theme-muted" /> : <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-theme-muted" />}
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-sm font-heading font-bold">{first.groupTitle}</h3>
                      <p className="mt-0.5 break-words text-[11px] text-theme-muted font-body">{first.context}</p>
                    </div>
                    <span className="rounded-full border border-theme-border px-2 py-0.5 text-[11px] tabular-nums text-theme-muted font-body">{items.length}</span>
                  </button>
                  {!isCollapsed && <div className="space-y-1.5 p-2">
                    {items.map(({ entry, preview }) => (
                      <article key={entry.key} aria-label={`Formula for ${entry.title}`} className={`space-y-1 rounded-theme border border-theme-border-soft px-2 py-2 ${preview.kind === 'problem' ? 'bg-amber-500/5' : ''}`}>
                        <div className="flex items-center gap-2">
                          <h4 className="min-w-0 flex-1 break-words text-xs font-bold text-theme-ink font-body">{entry.title}</h4>
                          <div className="flex shrink-0 gap-0.5">
                            {entry.editable && <button type="button"
                              data-tutorial={entry.groupTitle === 'Defense' ? 'automation-edit-formula' : entry.groupTitle === 'Total Load' ? 'advanced-table-edit-formula' : undefined}
                              aria-label={`Edit formula for ${entry.title}`} title="Edit formula" onClick={() => {
                                setError(null);
                                setEditing(entry);
                                const tutorial = useTutorialStore.getState();
                                if (entry.groupTitle === 'Defense' && isTutorialStep(tutorial.tutorialStep, 'automation-formulas-overview')
                                  || entry.groupTitle === 'Total Load' && isTutorialStep(tutorial.tutorialStep, 'advanced-table-edit-total')) tutorial.advanceTutorial();
                              }} className={cardButtonClass}><PencilIcon className="h-3.5 w-3.5" /></button>}
                            {(entry.widgetId || entry.eventId || entry.category === 'library') && <button type="button" aria-label={entry.eventId ? 'Edit event' : entry.category === 'library' ? 'Library' : entry.editable ? 'Show widget' : 'Edit in widget'} title={entry.eventId ? 'Edit event' : entry.category === 'library' ? 'Library' : entry.editable ? 'Show widget' : 'Edit in widget'} onClick={() => reveal(entry, !entry.editable)} className={cardButtonClass}>
                              {entry.eventId ? <BoltIcon className="h-3 w-3" /> : entry.category === 'library' ? <BookIcon className="h-3 w-3" /> : <ArrowRightIcon className="h-3 w-3" />}
                            </button>}
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1"><FormulaCode formula={entry.formula} /></div>
                          {preview.kind === 'value' && <span aria-label={`Result ${preview.value}`} className="max-w-[45%] shrink-0 break-words text-right font-mono text-xs leading-snug text-theme-accent">
                            = {typeof preview.value === 'string' ? JSON.stringify(preview.value) : preview.value}
                          </span>}
                        </div>
                        {preview.kind !== 'value' && <p className={`break-words text-[11px] font-body ${preview.kind === 'problem' ? 'text-amber-600' : 'text-theme-muted'}`}>{preview.message}</p>}
                      </article>
                    ))}
                  </div>}
                </section>
              );
            })}
          </div>
        )}
      </div>
      {editing && <FormulaEditorDialog
        key={editing.key}
        formula={editing.formula}
        character={character}
        sourceLabels={editing.sourceLabels}
        resultType={editing.resultType}
        saveError={error}
        onApply={apply}
        onClear={guidedFormula ? undefined : () => apply(undefined)}
        onCancel={() => {
          setEditing(null);
          setError(null);
          const tutorial = useTutorialStore.getState();
          if (isTutorialStep(tutorial.tutorialStep, 'automation-formula-editor')) tutorial.setTutorialStep(getTutorialStepIndex('automation-formulas-overview'));
          else if (['advanced-table-sum', 'advanced-table-sum-expression', 'advanced-table-lookup', 'advanced-table-apply'].some((id) => isTutorialStep(tutorial.tutorialStep, id))) tutorial.setTutorialStep(getTutorialStepIndex('advanced-table-edit-total'));
        }}
      />}
    </section>
  );
}
