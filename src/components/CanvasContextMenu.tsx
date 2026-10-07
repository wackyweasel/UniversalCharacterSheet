import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { WidgetType } from '../types';
import { WIDGET_CATEGORIES, WIDGET_OPTIONS, type WidgetCategory } from '../utils/widgetMetadata';
import { ChevronDownIcon } from './icons';

const VIEWPORT_PADDING = 8;
const MENU_WIDTH = 216;
const SUBMENU_WIDTH = 184;

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onSelect: (type: WidgetType) => void;
  onClose: () => void;
}

function Submenu({ category, openLeft, onSelect }: { category: WidgetCategory; openLeft: boolean; onSelect: (type: WidgetType) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shiftY, setShiftY] = useState(0);

  // Keep the flyout inside the viewport vertically.
  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const naturalTop = rect.top - shiftY;
    const maxTop = window.innerHeight - rect.height - VIEWPORT_PADDING;
    setShiftY(Math.min(0, maxTop - naturalTop));
  }, [category]);

  return (
    <div
      ref={ref}
      className="absolute rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper p-1 shadow-theme"
      style={{
        width: SUBMENU_WIDTH,
        top: -4,
        [openLeft ? 'right' : 'left']: 'calc(100% + 4px)',
        transform: `translateY(${shiftY}px)`,
      }}
    >
      {WIDGET_OPTIONS.filter((option) => option.category === category).map((option) => (
        <button
          key={option.type}
          type="button"
          className="block w-full truncate rounded-button px-2.5 py-1.5 text-left text-sm text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper"
          onClick={() => onSelect(option.type)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function CanvasContextMenu({ x, y, onSelect, onClose }: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [activeCategory, setActiveCategory] = useState<WidgetCategory | null>(null);

  useLayoutEffect(() => {
    const rect = menuRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      left: Math.max(VIEWPORT_PADDING, Math.min(x, window.innerWidth - rect.width - VIEWPORT_PADDING)),
      top: Math.max(VIEWPORT_PADDING, Math.min(y, window.innerHeight - rect.height - VIEWPORT_PADDING)),
    });
  }, [x, y]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', onClose);
    window.addEventListener('blur', onClose);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('blur', onClose);
    };
  }, [onClose]);

  const left = position?.left ?? x;
  const openLeft = left + MENU_WIDTH + SUBMENU_WIDTH + VIEWPORT_PADDING > window.innerWidth;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[10003] rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper p-1 shadow-theme font-body"
      style={{
        left,
        top: position?.top ?? y,
        width: MENU_WIDTH,
        visibility: position ? 'visible' : 'hidden',
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-theme-muted">Add widget</div>
      {WIDGET_CATEGORIES.map((category) => (
        <div
          key={category}
          className="relative"
          onMouseEnter={() => setActiveCategory(category)}
        >
          <button
            type="button"
            className={`flex w-full items-center justify-between gap-2 rounded-button px-2.5 py-1.5 text-left text-sm transition-colors ${activeCategory === category ? 'bg-theme-accent text-theme-paper' : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'}`}
            onClick={() => setActiveCategory(category)}
          >
            <span className="truncate">{category}</span>
            <ChevronDownIcon className="h-3.5 w-3.5 shrink-0" style={{ transform: `rotate(${openLeft ? 90 : -90}deg)` }} />
          </button>
          {activeCategory === category && <Submenu category={category} openLeft={openLeft} onSelect={onSelect} />}
        </div>
      ))}
    </div>,
    document.body,
  );
}
