import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * Serves product PDF files from public/products (optionally under year/month).
 * Use this endpoint instead of static /products/ so that newly uploaded
 * files are available without a rebuild.
 * GET /api/products/file/123_filename.pdf
 * GET /api/products/file/2025/02/123_filename.pdf
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;

    if (!pathSegments?.length) {
      return NextResponse.json(
        { error: 'Dateiname fehlt' },
        { status: 400 }
      );
    }

    const baseDir = path.resolve(process.cwd(), 'public', 'products');
    const filePath = path.join(baseDir, ...pathSegments);

    // Security: prevent directory traversal
    const realPath = path.resolve(filePath);
    if (!realPath.startsWith(baseDir)) {
      return NextResponse.json(
        { error: 'Unbefugter Zugriff' },
        { status: 403 }
      );
    }

    const fileBuffer = await readFile(realPath);
    const body = new Uint8Array(fileBuffer);

    const fileName = String(pathSegments[pathSegments.length - 1]);
    const asciiFileName = fileName.replace(/[^\x00-\x7F]/g, '_');

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${asciiFileName}"`,
      },
    });
  } catch (error) {
    console.error('Error serving product file:', error);
    return NextResponse.json(
      { error: 'Produktdatei nicht gefunden' },
      { status: 404 }
    );
  }
}
