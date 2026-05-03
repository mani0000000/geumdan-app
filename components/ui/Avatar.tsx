"use client";

interface AvatarProps {
  src?: string | null;
  size?: number;
  className?: string;
  fallback?: string;
}

export default function Avatar({ src, size = 36, className = "", fallback = "👤" }: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.5) };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`rounded-full object-cover bg-[#e8f1fd] ${className}`}
        style={style}
      />
    );
  }
  return (
    <div
      className={`rounded-full bg-[#e8f1fd] flex items-center justify-center ${className}`}
      style={style}
    >
      <span>{fallback}</span>
    </div>
  );
}
