"use client";

import Link from "next/link";
import { ArrowLeft, Printer, Download, Share2, FileDown, Video } from "lucide-react";
import { VideoPlayer } from "@/components/board/VideoPlayer";
import { CommentList } from "@/components/comments/CommentList";

interface SheetMusicViewProps {
  sheetMusic: {
    id: string;
    title: string;
    description: string | null;
    composer: string | null;
    filepath: string;
    folder?: { id: string; name: string; slug: string } | null;
    videos: { id: string; part: string; videoUrl: string }[];
    nwcFiles?: { id: string; filepath: string; label: string | null }[];
  };
  currentUserId: string;
}

export function SheetMusicView({ sheetMusic, currentUserId }: SheetMusicViewProps) {
  const isPdf = sheetMusic.filepath.toLowerCase().endsWith(".pdf");
  const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(sheetMusic.filepath);
  const isVideo = /\.(mp4|webm|mov|avi|mkv|m4v|ogv|wmv)(\?|$)/i.test(sheetMusic.filepath);
  const isExternal = sheetMusic.filepath.startsWith("http");
  const hasNwc = sheetMusic.nwcFiles && sheetMusic.nwcFiles.length > 0;
  const hasVideo = sheetMusic.videos && sheetMusic.videos.length > 0;
  const hideAttach = ["choir", "art-song", "nwc"].includes(
    (sheetMusic.folder?.slug ?? "").toLowerCase()
  );

  const handlePrint = () => {
    if (isExternal) {
      window.open(sheetMusic.filepath);
    } else {
      const w = window.open(sheetMusic.filepath, "_blank", "width=900,height=700");
      w?.addEventListener("load", () => w?.print());
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = isExternal ? sheetMusic.filepath : sheetMusic.filepath;
    a.download = sheetMusic.title + (sheetMusic.filepath.match(/\.\w+$/)?.[0] || "");
    a.target = "_blank";
    a.click();
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: sheetMusic.title,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert("링크가 복사되었습니다.");
    }
  };

  return (
    <article className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500 mb-4">
          <Link
            href="/sheet-music"
            className="inline-flex items-center gap-2 hover:text-amber-700"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </Link>
          {sheetMusic.folder && (
            <>
              <span>·</span>
              <Link
                href={`/sheet-music?folderId=${sheetMusic.folder.id}`}
                className="hover:text-amber-700"
              >
                {sheetMusic.folder.name}
              </Link>
            </>
          )}
        </div>

        <h1 className="text-2xl font-bold text-stone-800 mb-6">{sheetMusic.title}</h1>

        {/* 액션 버튼 */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-800 rounded-lg hover:bg-stone-200 font-medium"
          >
            <Printer className="w-4 h-4" />
            인쇄
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-800 rounded-lg hover:bg-stone-200 font-medium"
          >
            <Download className="w-4 h-4" />
            다운로드
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-800 rounded-lg hover:bg-stone-200 font-medium"
          >
            <Share2 className="w-4 h-4" />
            공유
          </button>
        </div>

        {/* NWC / 연습 동영상 - 합창곡·애창곡·NWC 폴더에서는 숨김 */}
        {!hideAttach && (hasNwc || hasVideo) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {hasNwc &&
              sheetMusic.nwcFiles!.map((nwc) => (
                <a
                  key={nwc.id}
                  href={nwc.filepath.startsWith("http") ? nwc.filepath : nwc.filepath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-800 rounded-lg hover:bg-stone-200 font-medium"
                >
                  <FileDown className="w-4 h-4" />
                  NWC 다운로드
                </a>
              ))}
            {hasVideo &&
              sheetMusic.videos.map((v) => (
                <a
                  key={v.id}
                  href={v.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 font-medium"
                >
                  <Video className="w-4 h-4" />
                  연습 동영상
                </a>
              ))}
          </div>
        )}

        {/* 악보/동영상 뷰어 */}
        <div className="border-t border-stone-100 pt-6">
          <h3 className="font-medium text-stone-700 mb-3">
            {isVideo ? "동영상 보기" : "악보 보기"}
          </h3>
          <p className="text-sm text-stone-500 mb-3">
            {isPdf && "PDF는 브라우저 기본 뷰어로 페이지를 넘겨보실 수 있습니다."}
          </p>
          <div className="bg-stone-50 rounded-xl p-4 min-h-[500px]">
            {isExternal ? (
              <a
                href={sheetMusic.filepath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
              >
                악보 열기 (새 탭)
              </a>
            ) : isPdf ? (
              <iframe
                src={`${sheetMusic.filepath}#view=FitH`}
                className="w-full h-[700px] rounded-lg border border-stone-200"
                title="악보"
              />
            ) : isImage ? (
              <img
                src={sheetMusic.filepath}
                alt={sheetMusic.title}
                className="max-w-full h-auto rounded-lg"
              />
            ) : isVideo ? (
              <div className="my-2 max-w-full">
                <VideoPlayer src={sheetMusic.filepath} className="w-full aspect-video max-w-2xl" />
                <a
                  href={sheetMusic.filepath}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 text-amber-600 hover:text-amber-700 text-sm"
                >
                  <Download className="w-4 h-4" />
                  다운로드
                </a>
              </div>
            ) : (
              <a
                href={sheetMusic.filepath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
              >
                악보 다운로드/보기
              </a>
            )}
          </div>
        </div>

        <div className="mt-4">
          <CommentList sheetMusicId={sheetMusic.id} currentUserId={currentUserId} />
        </div>
      </div>
    </article>
  );
}
