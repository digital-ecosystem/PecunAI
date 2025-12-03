import { PDFDocument } from 'pdf-lib';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

export interface MergeOptions {
  outputFileName?: string;
  debugMode?: boolean;
}

/**
 * Merge multiple PDF files into a single PDF
 * @param pdfFilePaths Array of absolute paths to PDF files to merge
 * @param options Configuration options
 * @returns Buffer containing the merged PDF
 */
export async function mergePDFs(
  pdfFilePaths: string[],
  options: MergeOptions = {}
): Promise<Buffer> {
  try {
    if (!pdfFilePaths || pdfFilePaths.length === 0) {
      throw new Error('No PDF files provided for merging');
    }

    if (options.debugMode) {
      console.log('📄 Merging PDFs:', pdfFilePaths);
    }

    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();

    // Process each PDF file
    for (const filePath of pdfFilePaths) {
      try {
        // Read the PDF file
        const pdfBuffer = await readFile(filePath);

        // Load the PDF document
        const pdfDoc = await PDFDocument.load(pdfBuffer);

        if (options.debugMode) {
          console.log(`✅ Loaded PDF: ${path.basename(filePath)} (${pdfDoc.getPageCount()} pages)`);
        }

        // Copy all pages from this PDF to the merged document
        const pageIndices = pdfDoc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pageIndices);

        for (const page of copiedPages) {
          mergedPdf.addPage(page);
        }
      } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error);
        throw new Error(`Failed to process PDF file: ${path.basename(filePath)}`);
      }
    }

    // Save the merged PDF as bytes
    const mergedPdfBytes = await mergedPdf.save();

    if (options.debugMode) {
      console.log(`✅ Merged PDF created successfully with ${mergedPdf.getPageCount()} pages`);
    }

    return Buffer.from(mergedPdfBytes);
  } catch (error) {
    console.error('❌ Error merging PDFs:', error);
    throw error;
  }
}

/**
 * Merge PDFs from a directory and save to a file
 * @param inputPdfPaths Array of PDF file paths to merge
 * @param outputPath Absolute path where merged PDF should be saved
 * @param options Configuration options
 */
export async function mergePDFsAndSave(
  inputPdfPaths: string[],
  outputPath: string,
  options: MergeOptions = {}
): Promise<string> {
  try {
    const mergedBuffer = await mergePDFs(inputPdfPaths, options);

    // Save merged PDF
    await writeFile(outputPath, mergedBuffer);

    if (options.debugMode) {
      console.log(`💾 Merged PDF saved to: ${outputPath}`);
    }

    return outputPath;
  } catch (error) {
    console.error('❌ Error saving merged PDF:', error);
    throw error;
  }
}
