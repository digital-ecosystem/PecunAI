import { NextRequest, NextResponse } from 'next/server';
import { mergePDFs } from '@/utils/pdfMerge';
import path from 'path';
import { readdir, writeFile, mkdir } from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      pdfFileNames,
      debugMode = false,
      base64Encode = false,
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Sitzungs-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Determine which PDF files to merge
    let filesToMerge = pdfFileNames;
    console.log("🚀 ~ POST ~ filesToMerge:", filesToMerge)

    const ORDERED_PDFS = [
      "Deckblatt_Vertragspaket.pdf",
      "Depoteröffnungsantrag.pdf",
      "Serviceentgelt.pdf",
      "Servicegebühr.pdf",
      "Vermittlungsgebühr.pdf",
      "Vermögensverwaltungsvertrag.pdf",
      "4money_protokoll_PecunAI_v2.pdf"
    ];

    // If no specific files provided, merge all PDFs in the session folder
    if (!filesToMerge || filesToMerge.length === 0) {
      try {
        const sessionDir = path.join(
          process.cwd(),
          `private-documents/${sessionId}/contract-document`
        );
        const allFiles = await readdir(sessionDir);

        // Filter available files based on the ordered list
        filesToMerge = ORDERED_PDFS.filter(orderedFile => allFiles.includes(orderedFile));

        if (debugMode) {
          console.log('📂 Found PDF files:', filesToMerge);
        }
      } catch (error) {
        console.error('❌ Error reading session directory:', error);
        return NextResponse.json(
          { success: false, error: 'Sitzungsverzeichnis nicht gefunden' },
          { status: 404 }
        );
      }
    }

    console.log("🚀 ~ POST ~ filesToMerge:", filesToMerge)
    if (filesToMerge.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Keine PDF-Dateien zum Zusammenführen gefunden' },
        { status: 400 }
      );
    }

    // Build full paths for all PDFs
    const pdfPaths = filesToMerge.map((fileName: string) =>
      path.join(
        process.cwd(),
        `private-documents/${sessionId}/contract-document/${fileName}`
      )
    );

    console.log('🔀 Merging PDFs:', pdfPaths);

    // Merge all PDFs
    const mergedPdfBuffer = await mergePDFs(pdfPaths, { debugMode });

    // Save the merged PDF to private-documents
    const mergedFileName = `merged-contracts.pdf`;
    const mergedFilePath = path.join(
      process.cwd(),
      `private-documents/${sessionId}/merge-document/${mergedFileName}`
    );

    try {
      // Create directory if it doesn't exist
      const mergedDir = path.dirname(mergedFilePath);
      await mkdir(mergedDir, { recursive: true });

      await writeFile(mergedFilePath, mergedPdfBuffer);
      console.log('💾 Merged PDF saved to:', mergedFilePath);
    } catch (saveError) {
      console.error('⚠️ Warning: Could not save merged PDF to disk:', saveError);
      // Continue anyway - we can still return the PDF
    }

    if (base64Encode) {
      const mergedPdfBase64 = mergedPdfBuffer.toString('base64');
      return NextResponse.json({
        success: true,
        mergedPdfBase64,
        message: 'PDFs erfolgreich zusammengeführt',
      });
    }

    // Return the merged PDF as a response
    return new NextResponse(new Uint8Array(mergedPdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${mergedFileName}"`,
      },
    });
  } catch (error) {
    console.error('❌ Error merging PDFs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'PDFs konnten nicht zusammengeführt werden',
      },
      { status: 500 }
    );
  }
}
