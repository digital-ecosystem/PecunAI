import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      base64Data, 
      filename, 
      sessionId,
      documentId 
    } = body;

    if (!base64Data || !filename || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'Fehlende erforderliche Felder: base64Data, filename, sessionId' },
        { status: 400 }
      );
    }

    // Create the documents directory if it doesn't exist
    const documentsDir = join(process.cwd(), 'private-documents', `${sessionId}`, 'signed');
    try {
      await mkdir(documentsDir, { recursive: true });
    } catch (error) {
      console.log("🚀 ~ POST ~ error:", error)
      // Directory might already exist, ignore the error
    }

    // Generate a unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalFilename = `signature.pdf`;
    const finalFilenameX = `${sessionId}_${timestamp}_${sanitizedFilename}`;
    console.log("🚀 ~ POST ~ finalFilenameX:", finalFilenameX)
    const filePath = join(documentsDir, finalFilename);

    // Convert base64 to buffer and save
    const buffer = Buffer.from(base64Data, 'base64');
    await writeFile(filePath, buffer);

    // Create public URL path
    const publicUrl = `/documents/signed/${finalFilename}`;

    console.log('✅ Signed document saved:', {
      sessionId,
      documentId,
      filename: finalFilename,
      size: buffer.length,
      path: publicUrl
    });

    return NextResponse.json({
      success: true,
      filename: finalFilename,
      path: publicUrl,
      size: buffer.length,
      savedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Document save error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Dokument konnte nicht gespeichert werden' 
      },
      { status: 500 }
    );
  }
}