import { ReactNode, RefObject, useEffect, useId, useRef } from 'react';
import { MenuIcon } from './icons';

interface ToolbarShellProps {
  primary: ReactNode;
  secondary?: ReactNode;
  expanded?: boolean;
  className?: string;
  tutorialId?: string;
  rootRef?: RefObject<HTMLElement>;
}

interface ToolbarOverflowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  label?: string;
}

export function ToolbarShell({
  primary,
  secondary,
  expanded = Boolean(secondary),
  className = '',
  tutorialId,
  rootRef,
}: ToolbarShellProps) {
  return (
    <header
      ref={rootRef}
      data-tutorial={tutorialId}
      data-toolbar-expanded={expanded}
      className={`relative z-30 shrink-0 border-b-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink shadow-sm ${className}`}
      style={{ '--sheet-toolbar-height': expanded ? '88px' : '48px' } as React.CSSProperties}
    >
      <div className="flex h-12 min-w-0 items-center gap-2 px-2">
        {primary}
      </div>
      {expanded && secondary && (
        <div className="flex h-10 min-w-0 items-center gap-1.5 border-t border-theme-border/50 bg-theme-background/65 px-2">
          {secondary}
        </div>
      )}
    </header>
  );
}

export function ToolbarOverflow({
  open,
  onOpenChange,
  children,
  label = 'Sheet menu',
}: ToolbarOverflowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onOpenChange(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpenChange, open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => onOpenChange(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-button border-[length:var(--border-width)] border-theme-border bg-theme-background text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper"
      >
        <MenuIcon className="h-4 w-4" />
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className="absolute left-0 top-full z-50 mt-2 max-h-[calc(100dvh-7rem)] w-[min(300px,calc(100vw-1rem))] overflow-y-auto overscroll-contain rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper shadow-theme animate-dropdown-in"
        >
          {children}
        </div>
      )}
    </div>
  );
}