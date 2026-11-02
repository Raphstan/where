import type { SVGProps } from "react";
import type { NavKey } from "@/lib/navigation";

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  "aria-hidden": true,
};

/* Tracés repris de docs/prototype.html (ICON). */
export function ChatIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v6a3.5 3.5 0 0 1-3.5 3.5H10l-4.5 4v-4A3.5 3.5 0 0 1 4 12.5z" />
    </svg>
  );
}

export function MemoryIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 4h11a3 3 0 0 1 3 3v13l-4-3-4 3-4-3-2 1.5V4z" />
    </svg>
  );
}

export function CircleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <circle cx="17" cy="10" r="2.4" />
      <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5M15 18.5c0-2 1.5-3.5 4-3.5 1 0 2 .3 2.5.8" />
    </svg>
  );
}

export function ProfileIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c.8-3.6 3.9-5.5 7.5-5.5s6.7 1.9 7.5 5.5" />
    </svg>
  );
}

export function SourcesIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="6" rx="2" />
      <rect x="3" y="14" width="18" height="6" rx="2" />
      <path d="M7 7h.01M7 17h.01" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="10" width="14" height="10" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </svg>
  );
}

export function EdgeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l9.5 17h-19z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export function NewQuestionIcon(props: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V12" />
      <path d="M17.8 3.7a1.9 1.9 0 0 1 2.7 2.7L12.6 14.3 9 15l.7-3.6z" />
    </svg>
  );
}

export function PlugIcon(props: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 3v4M15 3v4M6.5 7h11v3.5a5.5 5.5 0 0 1-11 0z" />
      <path d="M12 16v5" />
    </svg>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} strokeLinecap="round" {...props}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

export const NAV_ICONS: Record<NavKey, (props: IconProps) => React.JSX.Element> = {
  chat: ChatIcon,
  memory: MemoryIcon,
  circle: CircleIcon,
  sources: PlugIcon,
  privacy: LockIcon,
  edge: EdgeIcon,
  profile: ProfileIcon,
};

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
