"use client";

interface ThreadAvatarProps {
  name: string;
  src?: string | null;
  size?: number;
}

export default function ThreadAvatar({ name, src, size = 40 }: ThreadAvatarProps) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500',
    'bg-orange-500', 'bg-pink-500', 'bg-teal-500',
  ];
  const colorClass = colors[name.charCodeAt(0) % colors.length];

  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center shrink-0 ${!src ? colorClass : ''}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-white font-bold" style={{ fontSize: size * 0.4 }}>
          {initial}
        </span>
      )}
    </div>
  );
}
