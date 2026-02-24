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
        className={`flex flex-col items-center justify-center rounded-lg border border-stone-200 bg-stone-800 text-stone-300 p-4 ${className}`}
      >
        <p className="text-sm font-medium">동영상을 재생할 수 없습니다</p>
        <p className="text-xs text-stone-400 text-center max-w-xs mt-1">
          PC에서는 H.264 MP4가 필요합니다. 업로드 시 ffmpeg으로 변환됩니다.
          <br />
          관리자: ffmpeg 설치 후 새로 업로드. .env에 FFMPEG_PATH=/usr/bin/ffmpeg 추가 시도.
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
