import { NextRequest, NextResponse } from 'next/server';
import { stat, readFile } from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: pathParams } = await context.params;
        // Construct the absolute path to the file in the public directory
        const filePath = path.join(process.cwd(), 'public', 'uploads', ...pathParams);

        // Verify file exists
        try {
            const stats = await stat(filePath);
            if (!stats.isFile()) {
                return new NextResponse('File not found', { status: 404 });
            }
        } catch (e) {
            return new NextResponse('File not found', { status: 404 });
        }

        // Determine basic MIME types to ensure browser handles PDFs/images correctly
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.pdf') contentType = 'application/pdf';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.mp4') contentType = 'video/mp4';
        else if (ext === '.nwc') contentType = 'application/x-nwc';

        // Read and return the file buffer
        const buffer = await readFile(filePath);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Dynamic file serving error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
