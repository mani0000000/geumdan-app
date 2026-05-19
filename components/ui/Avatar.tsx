"use client";
import { User as UserIcon } from "lucide-react";

interface AvatarProps {
  src?: string | null;
  size?: number;
  alt?: string;
  className?: string;
}

export default function Avatar({ src, size = 24, alt = "프로필", className = "" }: AvatarProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={`rounded-full object-cover bg-[#e8f1fd] ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`rounded-full bg-[#e8f1fd] flex items-center justify-center text-[#0071e3] ${className}`}
      style={{ width: size, height: size }}
      aria-label={alt}
    >
      <UserIcon size={Math.round(size * 0.6)} strokeWidth={2} />
    </div>
  );
}
