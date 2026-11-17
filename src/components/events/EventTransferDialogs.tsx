import { useMemo, useRef, useState } from 'react';
import type { Character, CharacterEvent } from '../../types';
import { getEventTitle } from '../../events/registry';
import { parseEventsImport, planEventsImport, serializeEvents, type EventsImportPlan } from '../../events/transfer';
import { ModalShell, downloadText } from '../TransferModal';

const buttonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-button border border-theme-border px-2.5 text-xs font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper disabled:cursor-not-allowed disabled:opacity-40';
const primaryButtonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-button border border-theme-accent bg-theme-accent px-3 text-xs font-bold font-body text-theme-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40';

const fileNameFor = (events: CharacterEvent[]) => {
  const name = events.length === 1 ? events[0].name?.trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-') : '';
  return `${name || 'events'}.json`;
};

export function ExportEventsDialog({ character, events, onClose }: { character: Character; events: CharacterEvent[]; onClose: () => void }) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set(events.map((event) => event.id)));
  const selected = useMemo(() => events.filter((event) => selectedIds.has(event.id)), [events, selectedIds]);
  const text = useMemo(() => (selected.length ? serializeEvents(character, selected) : ''), [character, selected]);
  const [copied, setCopied] = useState(false);

  const toggle = (id: string) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the text stays selectable.
    }
  };

  return (
    <ModalShell title="Export events" titleId="events-export-title" onClose={onClose}>
      <p className="text-xs text-theme-muted font-body">Choose the events to export, then copy the text or download it to import into any character's events.</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold font-body text-theme-ink">{selected.length} of {events.length} selected</span>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setSelectedIds(new Set(events.map((event) => event.id)))} disabled={selected.length === events.length} className={buttonClass}>Check all</button>
          <button type="button" onClick={() => setSelectedIds(new Set())} disabled={selected.length === 0} className={buttonClass}>Uncheck all</button>
        </div>
      </div>
      <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded-button border border-theme-border p-1">
        {events.map((event) => (
          <li key={event.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded-button px-2 py-1 text-xs font-body text-theme-ink hover:bg-theme-background">
              <input type="checkbox" checked={selectedIds.has(event.id)} onChange={() => toggle(event.id)} className="accent-[var(--color-accent)]" />
              <span className="min-w-0 flex-1 truncate">{getEventTitle(character, event)}</span>
              {!event.enabled && <span className="shrink-0 text-theme-muted">off</span>}
            </label>
          </li>
        ))}
      </ul>
      <textarea
        readOnly
        value={text}
        aria-label="Exported event data"
        placeholder="Check at least one event to export."
        onFocus={(event) => event.currentTarget.select()}
        className="h-40 w-full resize-none rounded-button border border-theme-border bg-theme-background p-2 font-mono text-xs text-theme-ink focus:outline-none"
      />
      <div className="flex justify-end gap-2">
        <button type="button" disabled={!text} onClick={() => downloadText(fileNameFor(selected), text)} className={buttonClass}>Download file</button>
        <button type="button" disabled={!text} onClick={handleCopy} className={primaryButtonClass}>{copied ? 'Copied!' : 'Copy to Clipboard'}</button>
      </div>
    </ModalShell>
  );
}

export function ImportEventsDialog({ character, onImport, onClose }: { character: Character; onImport: (plan: EventsImportPlan) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(typeof reader.result === 'string' ? reader.result : '');
      setError(null);
    };
    reader.onerror = () => setError('That file could not be read.');
    reader.readAsText(file);
  };

  const handleImport = () => {
    const parsed = parseEventsImport(text);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    onImport(planEventsImport(character, parsed.data));
    onClose();
  };

  return (
    <ModalShell title="Import events" titleId="events-import-title" onClose={onClose}>
      <p className="text-xs text-theme-muted font-body">Paste exported events, or load them from a file. They are added after your current events.</p>
      <textarea
        autoFocus
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setError(null);
        }}
        aria-label="Event data to import"
        placeholder="Paste event JSON here"
        className="h-56 w-full resize-none rounded-button border border-theme-border bg-theme-background p-2 font-mono text-xs text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-accent/40"
      />
      {error && <p role="alert" className="text-xs text-red-500 font-body">{error}</p>}
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => fileInputRef.current?.click()} className={buttonClass}>Choose file…</button>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={buttonClass}>Cancel</button>
          <button type="button" disabled={!text.trim()} onClick={handleImport} className={primaryButtonClass}>Import</button>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFile} aria-label="Import events file" />
    </ModalShell>
  );
}
