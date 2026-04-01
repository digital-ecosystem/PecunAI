import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Keine Datei bereitgestellt' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Nur PDF-Dateien sind erlaubt' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Dateigröße überschreitet das Limit von 10 MB' },
        { status: 400 }
      );
    }

    // Organize by year/month for monthly product updates
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = now.getMonth() + 1;
    const monthStr = month < 10 ? `0${month}` : month.toString();

    const productsDir = path.join(process.cwd(), 'public', 'products', year, monthStr);
    try {
      await mkdir(productsDir, { recursive: true });
    } catch (error) {
      console.log('Directory already exists or error creating directory:', error);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${originalName}`;
    const filePath = path.join(productsDir, fileName);

    console.log('Saving file to:', filePath);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return path relative to public: /products/YYYY/MM/filename
    const relativePath = `/products/${year}/${monthStr}/${fileName}`;

    return NextResponse.json({
      success: true,
      data: {
        fileName: relativePath,
        originalName: file.name,
        size: file.size,
      },
      message: 'Datei erfolgreich hochgeladen',
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}