import { NextRequest, NextResponse } from 'next/server';
import { stat, readFile } from 'fs/promises';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const { path: pathParams } = params;
        const filePath = path.join(process.cwd(), 'public', 'pdfjs', ...pathParams);

        try {
            const stats = await stat(filePath);
            if (!stats.isFile()) {
                return new NextResponse('File not found', { status: 404 });
            }
        } catch (e) {
            return new NextResponse('File not found', { status: 404 });
        }

        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.mjs' || ext === '.js') contentType = 'application/javascript';
        else if (ext === '.bcmap' || ext === '.pfb' || ext === '.ttf') contentType = 'application/octet-stream';
        else if (ext === '.css') contentType = 'text/css';

        const buffer = await readFile(filePath);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Dynamic pdfjs file serving error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
