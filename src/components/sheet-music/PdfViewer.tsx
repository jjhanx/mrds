"use client";

interface PdfViewerProps {
  url: string;
}

/**
 * 브라우저 기본 PDF 뷰어(iframe) 사용.
 * react-pdf(worker·cmaps) 대신 네이티브 뷰어로 전환해
 * "파일 있는데 불러오지 못함" 문제 해결.
 */
export function PdfViewer({ url }: PdfViewerProps) {
  const fullUrl = typeof window !== "undefined" && !url.startsWith("http")
    ? `${window.location.origin}${url}`
    : url;

  return (
    <div className="w-full rounded-lg border border-stone-200 overflow-hidden bg-white">
      <iframe
        src={fullUrl}
        title="PDF 뷰어"
        className="w-full min-h-[600px] border-0"
        style={{ minHeight: "clamp(400px, 80vh, 900px)" }}
      />
      <p className="text-sm text-stone-500 px-2 py-2 border-t border-stone-100">
        PDF가 보이지 않으면{" "}
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-600 hover:underline"
        >
          새 탭에서 열기
        </a>
      </p>
    </div>
  );
}
