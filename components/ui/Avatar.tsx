const PALETTE = [
  "#F87171", "#FB923C", "#F59E0B", "#34D399",
  "#10B981", "#22D3EE", "#3B82F6", "#6366F1",
  "#A855F7", "#EC4899", "#F43F5E", "#84CC16",
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

const SIZES = {
  sm: { px: 32, text: "text-[13px]" },
  md: { px: 40, text: "text-[15px]" },
  lg: { px: 48, text: "text-[17px]" },
} as const;

export type AvatarSize = keyof typeof SIZES;

interface Props {
  nickname: string;
  imageUrl?: string | null;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ nickname, imageUrl, size = "sm", className = "" }: Props) {
  const { px, text } = SIZES[size];
  const initial = (nickname || "검").trim().slice(0, 1).toUpperCase();
  const bg = colorFor(nickname || "검");

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={nickname}
        width={px}
        height={px}
        className={`shrink-0 rounded-full object-cover bg-[#f5f5f7] ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center font-bold text-white ${text} ${className}`}
      style={{ width: px, height: px, backgroundColor: bg }}
      aria-label={nickname}
    >
      {initial}
    </div>
  );
}
