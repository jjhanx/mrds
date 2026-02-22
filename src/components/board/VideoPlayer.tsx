"use client";

import { useState, useRef, useEffect } from "react";

interface VideoPlayerProps {
  src: string;
  className?: string;
}

export function VideoPlayer({ src, className = "" }: VideoPlayerProps) {
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !ref.current) return;
    const el = ref.current;
    const onError = () => setError(true);
    el.addEventListener("error", onError);
    return () => el.removeEventListener("error", onError);
  }, [mounted, src]);

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-lg border border-stone-200 bg-stone-800 text-stone-300 p-6 ${className}`}
      >
        <p className="text-sm font-medium mb-2">동영상을 재생할 수 없습니다</p>
        <p className="text-xs text-stone-400 text-center max-w-xs">
          PC에서 iPhone 녹화(MOV/HEVC) 재생이 안 될 수 있습니다.
          <br />
          MP4(H.264) 형식을 권장합니다.
        </p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-amber-500 text-sm hover:underline"
        >
          다운로드
        </a>
      </div>
    );
  }

  return (
    <video
      ref={ref}
      src={src}
      controls
      playsInline
      preload="metadata"
      className={`max-w-full rounded-lg border border-stone-200 bg-stone-900 ${className}`}
    />
  );
}
