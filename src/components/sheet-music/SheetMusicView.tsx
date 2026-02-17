"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Video } from "lucide-react";

const PART_LABELS: Record<string, string> = {
  soprano: "소프라노",
  alto: "알토",
  tenor: "테너",
  bass: "베이스",
  full: "전체",
};

interface SheetMusicViewProps {
  sheetMusic: {
    id: string;
    title: string;
    description: string | null;
    composer: string | null;
    filepath: string;
    videos: { id: string; part: string; videoUrl: string }[];
  };
}

export function SheetMusicView({ sheetMusic }: SheetMusicViewProps) {
  const isPdf = sheetMusic.filepath.toLowerCase().endsWith(".pdf");
  const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(sheetMusic.filepath);
  const isExternal = sheetMusic.filepath.startsWith("http");

  return (
    <article className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
      <div className="p-6 md:p-8">
        <Link
          href="/sheet-music"
          className="inline-flex items-center gap-2 text-stone-500 hover:text-amber-700 mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </Link>

        <h1 className="text-2xl font-bold text-stone-800 mb-1">
          {sheetMusic.title}
        </h1>
        {sheetMusic.composer && (
          <p className="text-stone-600 mb-6">{sheetMusic.composer}</p>
        )}
        {sheetMusic.description && (
          <p className="text-stone-600 mb-6">{sheetMusic.description}</p>
        )}

        {/* Video links by part */}
        {sheetMusic.videos.length > 0 && (
          <div className="mb-6">
            <h3 className="flex items-center gap-2 font-medium text-stone-700 mb-3">
              <Video className="w-4 h-4" />
              파트별 연습 영상
            </h3>
            <div className="flex flex-wrap gap-2">
              {sheetMusic.videos.map((v) => (
                <a
                  key={v.id}
                  href={v.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors font-medium"
                >
                  {PART_LABELS[v.part] || v.part}
                  <ExternalLink className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Score viewer */}
        <div className="border-t border-stone-100 pt-6">
          <h3 className="font-medium text-stone-700 mb-3">악보 보기</h3>
          <div className="bg-stone-50 rounded-xl p-4 min-h-[400px]">
            {isExternal ? (
              <a
                href={sheetMusic.filepath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                악보 열기 (새 탭)
              </a>
            ) : isPdf ? (
              <iframe
                src={sheetMusic.filepath}
                className="w-full h-[600px] rounded-lg border border-stone-200"
                title="악보"
              />
            ) : isImage ? (
              <img
                src={sheetMusic.filepath}
                alt={sheetMusic.title}
                className="max-w-full h-auto rounded-lg"
              />
            ) : (
              <a
                href={sheetMusic.filepath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                악보 다운로드/보기
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
