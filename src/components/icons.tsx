import { SVGProps } from 'react';

/**
 * Shared SVG icon set for app chrome (toolbars, modals, menus).
 * Consistent 24x24 viewBox, stroke-based, sized via className (defaults to 1em).
 */

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M18 6L6 18M6 6l12 12" />
    </Base>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </Base>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20 6L9 17l-5-5" />
    </Base>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 9l6 6 6-6" />
    </Base>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M18 15l-6-6-6 6" />
    </Base>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Base>
  );
}

export function DotsVerticalIcon(props: IconProps) {
  return (
    <Base {...props} fill="currentColor" stroke="none">
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </Base>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </Base>
  );
}

export function PointerIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 3l14 9-6 2-3 6L5 3z" />
    </Base>
  );
}

export function HandIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V11M16 11V8a1.5 1.5 0 0 1 3 0v5c0 5-3 8-7 8-3 0-5-1.5-6.5-4L3 13.5a1.6 1.6 0 0 1 2.5-2L7 13" />
    </Base>
  );
}

export function WallIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 6h18v12H3zM3 10h18M3 14h18M8 6v4M16 6v4M6 10v4M14 10v4M10 14v4M18 14v4" />
    </Base>
  );
}

export function RulerIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m4 15 11-11 5 5L9 20H4v-5z" />
      <path d="m12 7 2 2M9 10l2 2M6 13l2 2M15 10l2 2" />
    </Base>
  );
}

export function EraserIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 21h10M4.5 16.5l9.8-12a2 2 0 0 1 2.9-.2l2.5 2.5a2 2 0 0 1-.2 2.9l-9.7 9.8a2 2 0 0 1-2.8 0l-2.5-2.5a2 2 0 0 1 0-2.5zM12 7l5 5" />
    </Base>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 7H3v6M3 13l4-4a8 8 0 1 1 1 11" />
    </Base>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 12h14" />
    </Base>
  );
}

export function ArrowUpDownIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m8 7 4-4 4 4M12 3v18M16 17l-4 4-4-4" />
    </Base>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6" />
    </Base>
  );
}

export function GripVerticalIcon(props: IconProps) {
  return (
    <Base {...props} fill="currentColor" stroke="none">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </Base>
  );
}

export function RowsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <rect x="3" y="10" width="18" height="4" rx="1" />
      <rect x="3" y="16" width="18" height="4" rx="1" />
    </Base>
  );
}

export function ColumnsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4" y="3" width="4" height="18" rx="1" />
      <rect x="10" y="3" width="4" height="18" rx="1" />
      <rect x="16" y="3" width="4" height="18" rx="1" />
    </Base>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Base {...props} fill="currentColor" stroke="none">
      <path d="M7 4.5v15a.5.5 0 0 0 .77.42l11.5-7.5a.5.5 0 0 0 0-.84L7.77 4.08A.5.5 0 0 0 7 4.5z" />
    </Base>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Base {...props} fill="currentColor" stroke="none">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </Base>
  );
}

export function ResetIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </Base>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </Base>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 12l10 5 10-5" />
      <path d="M2 17l10 5 10-5" />
    </Base>
  );
}

export function LayoutGridIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </Base>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </Base>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
    </Base>
  );
}

export function UnlinkIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0 .4-6.6M14 11a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0-.4 6.6M3 3l18 18" />
    </Base>
  );
}

export function BoldIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 4h6a4 4 0 0 1 0 8H7zM7 12h7a4 4 0 0 1 0 8H7z" />
    </Base>
  );
}

export function ItalicIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M10 4h8M6 20h8M14 4 10 20" />
    </Base>
  );
}

export function UnderlineIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 3v7a6 6 0 0 0 12 0V3M4 21h16" />
    </Base>
  );
}

export function StrikethroughIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M17 5.5A6.5 6.5 0 0 0 12 3c-3 0-5 1.5-5 4 0 1.2.5 2 1.4 2.7M7 18.5A6.5 6.5 0 0 0 12 21c3 0 5-1.5 5-4 0-1.2-.5-2-1.4-2.7M4 12h16" />
    </Base>
  );
}

export function PaletteIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h5a4 4 0 0 0 4-4c0-3.3-4-6-9-6z" />
      <circle cx="7.5" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 6h12M9 12h12M9 18h12" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function ListOrderedIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M10 6h11M10 12h11M10 18h11M4 4h1v4M4 11h2l-2 3h2M4 17h2l-2 3h2" />
    </Base>
  );
}

export function OutdentIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M11 6h10M11 12h10M11 18h10M8 9l-3 3 3 3" />
    </Base>
  );
}

export function IndentIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M11 6h10M11 12h10M11 18h10M5 9l3 3-3 3" />
    </Base>
  );
}

export function ClearFormattingIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 7V4h13v3M10.5 4 8 18M5 20h14M3 3l18 18" />
    </Base>
  );
}
