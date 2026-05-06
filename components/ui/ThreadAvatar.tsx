"use client";

const PALETTE = [
  "#FF8FAB", "#FFB860", "#88D8B0", "#7DB9FF", "#C39DFF",
  "#FF6B9D", "#F4C842", "#5DCED2", "#FFA07A", "#9DD9D2",
];

function colorFor(name: string) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum = (sum + name.charCodeAt(i)) % 9973;
  return PALETTE[sum % PALETTE.length];
}

interface Props {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

export default function ThreadAvatar({ name, src, size = 40, className = "" }: Props) {
  const trimmed = (name ?? "").trim();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={trimmed || "프로필"}
        width={size}
        height={size}
        className={`rounded-full object-cover bg-[#e8f1fd] shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = trimmed ? Array.from(trimmed)[0] : "·";
  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size, background: colorFor(trimmed || "?") }}
    >
      <span className="text-white font-semibold" style={{ fontSize: size * 0.42 }}>{initial}</span>
    </div>
  );
}
