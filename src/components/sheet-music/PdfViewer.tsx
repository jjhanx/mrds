"use client";

import { useState, useEffect, useRef, Component, ReactNode } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

// Next.js (App Router) ?? ?? ??
pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

interface PdfViewerProps {
    url: string;
}

class PdfErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error: Error, info: any) {
        console.error('PdfViewer error boundary caught', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="py-20 text-center text-stone-500">
                    <p className="font-medium">??? ? ????.</p>
                    <p className="text-sm mt-1">???? ???? ??? ?????.</p>
                </div>
            );
        }
        return this.props.children;
    }
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
                <PdfErrorBoundary>
                <Document
                    file={url}
                    options={{
                        cMapUrl: '/pdfjs/cmaps/',
                        cMapPacked: true,
                        standardFontDataUrl: '/pdfjs/standard_fonts/',
                    }}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(err) => console.error("Document Load Error:", err)}
                    loading={
                        <div className="flex flex-col items-center justify-center py-20 text-stone-500">
                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                            <p className="text-sm">??(PDF)? ???? ????...</p>
                        </div>
                    }
                    error={
                        <div className="py-20 text-stone-500 text-center px-4">
                            <p className="font-medium">??? ? ????.</p>
                            <p className="text-sm mt-1">???? ???? ??? ?????.</p>
                        </div>
                    }
                >
                    <Page
                        pageNumber={pageNumber}
                        width={containerWidth ? Math.min(containerWidth - 16, 800) : undefined}
                        scale={scale}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        onLoadError={(error) => console.error("Page Load Error:", error)}
                        onRenderError={(error) => console.error("Page Render Error:", error)}
                        error={
                            <div className="flex flex-col items-center py-10 text-stone-500 w-full">
                                <p className="text-sm font-medium">??? ? ????.</p>
                                <p className="text-xs mt-1">???? ???? ??? ?????.</p>
                            </div>
                        }
                        loading={
                            <div className="flex justify-center py-20">
                                <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                            </div>
                        }
                    />
                </Document>
            </PdfErrorBoundary>
            </div>
        </div>
    );
}
