"use client";

export const AVATAR_COLORS = ["red", "blue", "yellow", "green", "orange", "pink"] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

const COLOR_MAP: Record<AvatarColor, { main: string; bg: string }> = {
  red:    { main: "#F87171", bg: "#FEF2F2" },
  blue:   { main: "#60A5FA", bg: "#EFF6FF" },
  yellow: { main: "#FBBF24", bg: "#FFFBEB" },
  green:  { main: "#34D399", bg: "#ECFDF5" },
  orange: { main: "#FB923C", bg: "#FFF7ED" },
  pink:   { main: "#F472B6", bg: "#FDF2F8" },
};

interface Props {
  color: AvatarColor;
  size?: number;
  swing?: boolean;
}

export default function SwingAvatar({ color, size = 64, swing = true }: Props) {
  const { main, bg } = COLOR_MAP[color];

  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pastel background circle */}
      <circle cx="40" cy="44" r="38" fill={bg} />

      {/* Top bar */}
      <rect x="8" y="10" width="64" height="6" rx="3" fill={main} />

      {/* Left rope */}
      <rect x="21" y="16" width="3" height="28" rx="1.5" fill={main} opacity="0.7" />
      {/* Right rope */}
      <rect x="56" y="16" width="3" height="28" rx="1.5" fill={main} opacity="0.7" />

      {/* Seat */}
      <rect x="14" y="44" width="52" height="8" rx="4" fill={main} />

      {/* Body */}
      <ellipse cx="40" cy="39" rx="8" ry="6" fill={main} opacity="0.5" />

      {/* Left arm (gripping rope) */}
      <line x1="32" y1="39" x2="22" y2="33" stroke={main} strokeWidth="3" strokeLinecap="round" />
      {/* Right arm (gripping rope) */}
      <line x1="48" y1="39" x2="58" y2="33" stroke={main} strokeWidth="3" strokeLinecap="round" />

      {/* Head */}
      <circle cx="40" cy="28" r="10" fill={main} opacity="0.9" />

      {/* Eyes */}
      <circle cx="36.5" cy="26.5" r="1.8" fill="white" />
      <circle cx="43.5" cy="26.5" r="1.8" fill="white" />

      {/* Smile */}
      <path
        d="M36 30.5 Q40 34 44 30.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Cheeks */}
      <circle cx="33" cy="29" r="2.2" fill="white" opacity="0.25" />
      <circle cx="47" cy="29" r="2.2" fill="white" opacity="0.25" />

      {/* Left leg */}
      <line x1="36" y1="52" x2="33" y2="66" stroke={main} strokeWidth="3" strokeLinecap="round" />
      {/* Right leg */}
      <line x1="44" y1="52" x2="47" y2="66" stroke={main} strokeWidth="3" strokeLinecap="round" />

      {/* Left foot */}
      <line x1="33" y1="66" x2="28" y2="68" stroke={main} strokeWidth="2.5" strokeLinecap="round" />
      {/* Right foot */}
      <line x1="47" y1="66" x2="52" y2="68" stroke={main} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );

  if (!swing) return svg;

  return (
    <div
      className="animate-sway inline-block"
      style={{ display: "inline-block", transformOrigin: "50% 14%" }}
    >
      {svg}
    </div>
  );
}
