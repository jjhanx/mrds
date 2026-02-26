"use client";

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

// Next.js (App Router) 호환 워커 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
    url: string;
}

export function PdfViewer({ url }: PdfViewerProps) {
    const [numPages, setNumPages] = useState<number>();
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [containerWidth, setContainerWidth] = useState<number>();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.clientWidth);
            }
        };
        // 약간의 딜레이를 주어 부모 컨테이너가 마운트된 후 너비 취득
        setTimeout(updateWidth, 100);
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
        setNumPages(numPages);
        setPageNumber(1);
    }

    return (
        <div className="flex flex-col items-center w-full bg-stone-50 rounded-lg p-2 sm:p-4 border border-stone-200" ref={containerRef}>
            {/* 뷰어 컨트롤바 */}
            <div className="flex flex-wrap items-center justify-between w-full mb-4 bg-white p-2 rounded-lg border border-stone-200 shadow-sm gap-2">
                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        disabled={pageNumber <= 1}
                        onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                        className="p-1.5 rounded hover:bg-stone-100 disabled:opacity-50 text-stone-600"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap text-stone-700 min-w-[60px] text-center">
                        {pageNumber} / {numPages || '-'}
                    </span>
                    <button
                        disabled={!numPages || pageNumber >= numPages}
                        onClick={() => setPageNumber(p => Math.min(numPages || p, p + 1))}
                        className="p-1.5 rounded hover:bg-stone-100 disabled:opacity-50 text-stone-600"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                    <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1.5 rounded hover:bg-stone-100 text-stone-600">
                        <ZoomOut className="w-5 h-5" />
                    </button>
                    <span className="text-xs sm:text-sm font-medium w-12 text-center text-stone-700">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-1.5 rounded hover:bg-stone-100 text-stone-600">
                        <ZoomIn className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="w-full flex justify-center overflow-x-auto overflow-y-hidden custom-scrollbar bg-white shadow-sm border border-stone-100">
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                        <div className="flex flex-col items-center justify-center py-20 text-stone-500">
                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                            <p className="text-sm">악보(PDF)를 불러오는 중입니다...</p>
                        </div>
                    }
                    error={
                        <div className="py-20 text-red-500 text-center px-4">
                            <p className="mb-2">문서를 바로 불러올 수 없습니다.</p>
                            <p className="text-sm text-stone-500">다운로드 또는 외부 열기 버튼을 이용해주세요.</p>
                        </div>
                    }
                >
                    <Page
                        pageNumber={pageNumber}
                        width={containerWidth ? Math.min(containerWidth - 16, 800) : undefined}
                        scale={scale}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        loading={
                            <div className="flex justify-center py-20">
                                <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                            </div>
                        }
                    />
                </Document>
            </div>
        </div>
    );
}
