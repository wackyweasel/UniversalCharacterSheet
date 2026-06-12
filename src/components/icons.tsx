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
