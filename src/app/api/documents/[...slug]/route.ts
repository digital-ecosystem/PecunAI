import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    // Await params before using
    const { slug } = await params;

    // Reconstruct the file path from slug
    // slug will be: ['contract-document', '123456', 'Depoteröffnungsantrag.pdf']
    const filePath = path.join(
      process.cwd(),
      'private-documents',
      ...slug
    );

    // Security: Prevent directory traversal attacks
    const realPath = path.resolve(filePath);
    const baseDir = path.resolve(process.cwd(), 'private-documents');
    
    if (!realPath.startsWith(baseDir)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Read the file
    const fileBuffer = await readFile(realPath);

    // Convert Buffer to Uint8Array so it's compatible with BodyInit
    const body = new Uint8Array(fileBuffer);

    // Set appropriate headers
    // Use a simple ASCII-safe filename to avoid proxy/tunnel issues
    const fileName = String(slug[slug.length - 1]);
    // Create ASCII-safe fallback by removing non-ASCII characters
    const asciiFileName = fileName.replace(/[^\x00-\x7F]/g, '_');

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${asciiFileName}"`,
      },
    });
  } catch (error) {
    console.error('Error serving document:', error);
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  }
}