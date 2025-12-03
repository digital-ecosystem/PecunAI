import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { fileName, pdfBase64, seessionId } = await request.json();
    if (!fileName || !pdfBase64) {
      return NextResponse.json({ message: 'Missing fileName or pdfBase64' }, { status: 400 });
    }

    // Decode base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Save to public/pdfs directory
    const pdfDir = path.join(process.cwd(), 'private-documents', seessionId, 'signed');
    const filePath = path.join(pdfDir, fileName);

    // Ensure directory exists
    await import('fs/promises').then(fs => fs.mkdir(pdfDir, { recursive: true }));

    // Write file
    await writeFile(filePath, pdfBuffer);

    // Return the public URL
    const fileUrl = `private-documents/${seessionId}/signed/${fileName}`;
    return NextResponse.json({ success: true, fileUrl });
  } catch (error) {
    console.error('Error saving PDF:', error);
    return NextResponse.json({ success: false, message: 'Failed to save PDF' }, { status: 500 });
  }
}
