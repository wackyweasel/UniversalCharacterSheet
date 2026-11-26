import { useEffect, useState } from 'react';
import { Check, Copy, LoaderCircle, Users } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useSessionStore } from '../store/useSessionStore';

const primaryButton = 'px-4 py-2 rounded-button font-body text-sm font-bold bg-theme-accent text-theme-paper hover:bg-theme-accent-hover disabled:opacity-50 disabled:cursor-not-allowed';
const secondaryButton = 'px-4 py-2 rounded-button font-body text-sm border border-theme-border hover:bg-theme-accent/10';
const inputClass = 'mt-1 w-full px-3 py-2 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink';

function ParticipantList() {
  const participants = useSessionStore((state) => state.participants);
  if (participants.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="font-body text-xs font-bold uppercase tracking-wider text-theme-muted">In this session</p>
      <ul className="mt-1 space-y-1">
        {participants.map((participant) => (
          <li key={participant.id} className="flex items-center gap-2 font-body text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: participant.color }} aria-hidden="true" />
            <span className="truncate">{participant.name}</span>
            {participant.isHost && <span className="text-xs text-theme-muted">host</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NameField({ autoFocus }: { autoFocus?: boolean }) {
  const displayName = useSessionStore((state) => state.displayName);
  const setDisplayName = useSessionStore((state) => state.setDisplayName);
  return (
    <label className="mt-4 block font-body text-sm font-semibold">
      Your name
      <input
        autoFocus={autoFocus}
        value={displayName}
        maxLength={32}
        placeholder="Shown to the others"
        onChange={(event) => setDisplayName(event.target.value)}
        className={inputClass}
      />
    </label>
  );
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Clipboard access can be blocked; the link stays selectable in the field.
    }
  };

  return (
    <div className="mt-2 flex gap-2">
      <input
        readOnly
        value={link}
        aria-label="Session link"
        onFocus={(event) => event.currentTarget.select()}
        className="min-w-0 flex-1 px-3 py-2 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button font-body text-xs text-theme-ink"
      />
      <button type="button" onClick={() => void copy()} className={`${secondaryButton} flex items-center gap-1.5`}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export default function SessionDialog() {
  const role = useSessionStore((state) => state.role);
  const phase = useSessionStore((state) => state.phase);
  const link = useSessionStore((state) => state.link);
  const detail = useSessionStore((state) => state.detail);
  const hostId = useSessionStore((state) => state.hostId);
  const characterId = useSessionStore((state) => state.characterId);
  const dialogOpen = useSessionStore((state) => state.dialogOpen);
  const pendingJoinId = useSessionStore((state) => state.pendingJoinId);
  const closeDialog = useSessionStore((state) => state.closeDialog);
  const startHosting = useSessionStore((state) => state.startHosting);
  const joinSession = useSessionStore((state) => state.joinSession);
  const leaveSession = useSessionStore((state) => state.leaveSession);
  const saveGuestCopy = useSessionStore((state) => state.saveGuestCopy);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const transientCharacterIds = useStore((state) => state.transientCharacterIds);
  const sharedName = useStore((state) => state.characters.find((character) => character.id === (characterId ?? activeCharacterId))?.name);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!dialogOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeDialog, dialogOpen]);

  useEffect(() => {
    if (!dialogOpen) setNotice(null);
  }, [dialogOpen]);

  if (!dialogOpen) return null;

  const canHostActive = !!activeCharacterId && !transientCharacterIds.includes(activeCharacterId);
  const busy = phase === 'starting' || phase === 'connecting';
  const joinTarget = pendingJoinId !== null && role !== 'host' && !(role === 'guest' && phase === 'active') ? pendingJoinId : null;

  let title = 'Live session';
  let body;
  if (joinTarget) {
    title = 'Join a shared character';
    body = (
      <>
        <p className="font-body text-sm text-theme-muted mt-2">
          You were invited to edit a character together. You will see a temporary copy that stays in sync with the host; nothing is saved to your workspace unless you choose to.
        </p>
        <NameField autoFocus />
        {detail && <p role="alert" className="mt-3 font-body text-sm text-red-500">{detail}</p>}
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={closeDialog} className={secondaryButton}>Cancel</button>
          <button type="button" disabled={busy} onClick={() => void joinSession(joinTarget)} className={`${primaryButton} flex items-center gap-2`}>
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Join session
          </button>
        </div>
      </>
    );
  } else if (role === 'host') {
    title = 'Hosting a live session';
    body = (
      <>
        <p className="font-body text-sm text-theme-muted mt-2">
          {sharedName ? `${sharedName} is shared.` : 'Your character is shared.'} Anyone with the link can edit it while you keep this tab open. Your own copy is saved as usual.
        </p>
        {phase === 'starting' || !link ? (
          <p className="mt-4 flex items-center gap-2 font-body text-sm"><LoaderCircle className="h-4 w-4 animate-spin" />Starting the session…</p>
        ) : (
          <>
            <p className="mt-4 font-body text-xs font-bold uppercase tracking-wider text-theme-muted">Invite link</p>
            <CopyLink link={link} />
          </>
        )}
        {detail && <p role="alert" className="mt-3 font-body text-sm text-amber-500">{detail}</p>}
        <ParticipantList />
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={closeDialog} className={secondaryButton}>Close</button>
          <button type="button" onClick={leaveSession} className={`${primaryButton} !bg-red-600 hover:!bg-red-700`}>End session</button>
        </div>
      </>
    );
  } else if (role === 'guest') {
    title = phase === 'active' ? 'In a live session' : phase === 'connecting' ? 'Connecting…' : 'Session ended';
    body = (
      <>
        {phase === 'connecting' && <p className="mt-4 flex items-center gap-2 font-body text-sm"><LoaderCircle className="h-4 w-4 animate-spin" />Connecting to the host…</p>}
        {phase === 'active' && (
          <p className="font-body text-sm text-theme-muted mt-2">
            You are editing {sharedName ? `“${sharedName}”` : 'the shared character'} together with the host. This is a temporary copy: it is not saved to your workspace.
          </p>
        )}
        {phase !== 'active' && phase !== 'connecting' && (
          <p className="font-body text-sm text-theme-muted mt-2">
            {detail ?? 'The session is over.'} The copy on screen is yours until you leave, but it is no longer being updated.
          </p>
        )}
        {phase === 'active' && <ParticipantList />}
        {notice && <p role="status" className="mt-3 font-body text-sm text-green-600">{notice}</p>}
        <div className="flex flex-wrap justify-end gap-2 mt-6">
          {phase !== 'connecting' && (
            <button
              type="button"
              onClick={() => setNotice(saveGuestCopy() ? 'A copy was added to your workspace.' : 'Nothing to save.')}
              className={secondaryButton}
            >
              Save a copy
            </button>
          )}
          {phase === 'lost' && hostId && <button type="button" onClick={() => void joinSession(hostId)} className={secondaryButton}>Reconnect</button>}
          <button type="button" onClick={closeDialog} className={secondaryButton}>Close</button>
          <button type="button" onClick={leaveSession} className={`${primaryButton} !bg-red-600 hover:!bg-red-700`}>Leave session</button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <p className="font-body text-sm text-theme-muted mt-2">
          Share a link so other people can edit this character with you in real time. Everyone works on the same sheet while your browser tab stays open. No account is needed.
        </p>
        {canHostActive ? (
          <p className="font-body text-sm mt-3">Character: <strong>{sharedName}</strong></p>
        ) : (
          <p className="font-body text-sm text-amber-500 mt-3">Open one of your saved characters to host a session.</p>
        )}
        <NameField />
        {detail && <p role="alert" className="mt-3 font-body text-sm text-red-500">{detail}</p>}
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={closeDialog} className={secondaryButton}>Cancel</button>
          <button
            type="button"
            disabled={!canHostActive}
            onClick={() => activeCharacterId && void startHosting(activeCharacterId)}
            className={primaryButton}
          >
            Start session
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[110] animate-fade-in" onClick={closeDialog} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-dialog-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] p-6 rounded-theme shadow-xl w-[90vw] max-w-[460px] max-h-[90dvh] overflow-y-auto bg-theme-paper text-theme-ink border-[length:var(--border-width)] border-theme-border animate-fade-in"
      >
        <p className="font-body text-xs font-bold uppercase tracking-wider text-theme-muted flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Multi-user</p>
        <h2 id="session-dialog-title" className="font-heading font-bold text-xl mt-1">{title}</h2>
        {body}
      </div>
    </>
  );
}

/** A small badge that keeps a running session visible and reopens its dialog. */
export function SessionIndicator() {
  const role = useSessionStore((state) => state.role);
  const phase = useSessionStore((state) => state.phase);
  const participants = useSessionStore((state) => state.participants);
  const selfId = useSessionStore((state) => state.selfId);
  const dialogOpen = useSessionStore((state) => state.dialogOpen);
  const openDialog = useSessionStore((state) => state.openDialog);
  if (role === 'none' || dialogOpen) return null;

  const live = phase === 'active';
  const label = role === 'host'
    ? live ? 'Hosting' : 'Starting…'
    : live ? 'Live' : phase === 'connecting' ? 'Connecting…' : 'Session ended';

  return (
    <button
      type="button"
      onClick={openDialog}
      aria-label="Live session"
      className="fixed left-3 bottom-3 z-[60] flex max-w-[220px] min-w-[140px] flex-col items-stretch gap-1.5 px-3 py-2 text-left rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink font-body text-xs shadow-theme hover:bg-theme-accent/10 transition-colors"
    >
      <span className="flex items-center gap-2 font-bold">
        <span className={`h-2 w-2 shrink-0 rounded-full ${live ? 'bg-green-500' : 'bg-amber-500'}`} aria-hidden="true" />
        {label}{live ? ` · ${participants.length}` : ''}
      </span>
      {participants.length > 0 && (
        <ul className="max-h-[40vh] space-y-1 overflow-y-auto">
          {participants.map((participant) => (
            <li key={participant.id} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: participant.color }} aria-hidden="true" />
              <span className="truncate">{participant.name}</span>
              {participant.id === selfId && <span className="shrink-0 text-theme-muted">(you)</span>}
              {participant.isHost && <span className="shrink-0 text-theme-muted">host</span>}
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}
