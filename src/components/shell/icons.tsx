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

export const NAV_ICONS: Record<NavKey, (props: IconProps) => React.JSX.Element> = {
  chat: ChatIcon,
  memory: MemoryIcon,
  circle: CircleIcon,
  profile: ProfileIcon,
};
