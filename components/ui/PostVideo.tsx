"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";

interface PostVideoProps {
  src: string;
  thumbnail?: string;
  /** rounded corners + border to match card media */
  rounded?: boolean;
  className?: string;
}

/**
 * Video that shows a thumbnail/first-frame preview with a play button,
 * then plays inline on click. The container tracks the video's native
 * aspect ratio (from loadedmetadata) so the frame is never stretched or
 * cropped — object-contain keeps the whole frame visible.
 */
export function PostVideo({ src, thumbnail, rounded, className }: PostVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ratio, setRatio] = useState("16 / 9");

  // Without an explicit poster, hint the browser to render the first frame.
  const videoSrc =
    thumbnail || src.includes("#") ? src : `${src}#t=0.1`;

  const handlePlay = () => {
    setPlaying(true);
    videoRef.current?.play().catch(() => setPlaying(false));
  };

  return (
    <div
      className={`relative bg-black overflow-hidden ${
        rounded ? "rounded-xl border border-[#e5e5ea]" : ""
      } ${className ?? ""}`}
      style={{ aspectRatio: ratio }}
      onClick={(e) => e.stopPropagation()}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        poster={thumbnail}
        preload="metadata"
        playsInline
        controls={playing}
        className="w-full h-full object-contain"
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          if (el.videoWidth && el.videoHeight) {
            setRatio(`${el.videoWidth} / ${el.videoHeight}`);
          }
        }}
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <button
          type="button"
          aria-label="동영상 재생"
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/15 active:bg-black/25 transition-colors"
        >
          <span className="w-14 h-14 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center">
            <Play size={26} className="text-white fill-white ml-0.5" />
          </span>
        </button>
      )}
    </div>
  );
}
