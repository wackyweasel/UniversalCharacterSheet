import type { PlayLayout } from '../hooks/useWorkspaceNavigation';

interface WorkspaceToggleGroupProps {
  playLayout: PlayLayout;
  onCanvas: () => void;
  onList: () => void;
  listHighlighted?: boolean;
  className?: string;
  layoutClassName?: string;
}

export default function WorkspaceToggleGroup({
  playLayout,
  onCanvas,
  onList,
  listHighlighted = false,
  className = '',
  layoutClassName = 'min-[380px]:flex',
}: WorkspaceToggleGroupProps) {
  const layoutButton = (active: boolean) => `w-16 h-full text-xs font-body transition-colors ${
    active ? 'bg-theme-ink text-theme-paper' : 'text-theme-muted hover:text-theme-ink hover:bg-theme-accent/10'
  }`;

  return (
    <div className={`flex items-center gap-1 shrink-0 ${className}`}>
      <div className={`hidden ${layoutClassName} w-32 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button overflow-hidden`}>
        <button type="button" onClick={onCanvas} aria-pressed={playLayout === 'canvas'} className={layoutButton(playLayout === 'canvas')}>
          Canvas
        </button>
        <button
          type="button"
          data-tutorial="vertical-view-button"
          onClick={onList}
          aria-pressed={playLayout === 'list'}
          className={`${layoutButton(playLayout === 'list')} ${listHighlighted ? 'outline outline-2 outline-blue-500 outline-offset-[-2px]' : ''}`}
        >
          List
        </button>
      </div>
    </div>
  );
}
