import type { PlayLayout, SheetWorkspace } from '../hooks/useWorkspaceNavigation';

interface WorkspaceToggleGroupProps {
  workspace: SheetWorkspace;
  playLayout: PlayLayout;
  onBuild: () => void;
  onPlay: () => void;
  onCanvas: () => void;
  onList: () => void;
  workspaceHighlighted?: boolean;
  listHighlighted?: boolean;
  className?: string;
}

export default function WorkspaceToggleGroup({
  workspace,
  playLayout,
  onBuild,
  onPlay,
  onCanvas,
  onList,
  workspaceHighlighted = false,
  listHighlighted = false,
  className = '',
}: WorkspaceToggleGroupProps) {
  const workspaceButton = (active: boolean) => `w-14 h-full text-xs font-body transition-colors ${
    active ? 'bg-theme-accent text-theme-paper' : 'text-theme-muted hover:text-theme-ink hover:bg-theme-accent/10'
  }`;
  const layoutButton = (active: boolean) => `w-16 h-full text-xs font-body transition-colors ${
    active ? 'bg-theme-ink text-theme-paper' : 'text-theme-muted hover:text-theme-ink hover:bg-theme-accent/10'
  }`;

  return (
    <div className={`flex items-center gap-1 shrink-0 ${className}`}>
      <div
        data-tutorial="edit-mode-button"
        className={`flex w-28 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button overflow-hidden ${workspaceHighlighted ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
      >
        <button type="button" onClick={onBuild} aria-pressed={workspace === 'build'} className={workspaceButton(workspace === 'build')}>
          Build
        </button>
        <button type="button" onClick={onPlay} aria-pressed={workspace === 'play'} className={workspaceButton(workspace === 'play')}>
          Play
        </button>
      </div>
      <div className="flex w-32 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button overflow-hidden">
        <button type="button" onClick={onCanvas} aria-pressed={workspace === 'play' && playLayout === 'canvas'} className={layoutButton(workspace === 'play' && playLayout === 'canvas')}>
          Canvas
        </button>
        <button
          type="button"
          data-tutorial="vertical-view-button"
          onClick={onList}
          aria-pressed={workspace === 'play' && playLayout === 'list'}
          className={`${layoutButton(workspace === 'play' && playLayout === 'list')} ${listHighlighted ? 'outline outline-2 outline-blue-500 outline-offset-[-2px]' : ''}`}
        >
          List
        </button>
      </div>
    </div>
  );
}
