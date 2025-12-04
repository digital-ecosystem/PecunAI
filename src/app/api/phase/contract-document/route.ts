import { NextRequest, NextResponse } from 'next/server';
import { createFormDataForContactForm, PDFFormFiller } from '@/utils/pdfFormFiller';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userInfo,
      //   additionalData = {}, 
      // pdfFileNames,
      options = { flattenForm: true, debugMode: false },
      sessionId,
    } = body;

    // if (!pdfFileNames || pdfFileNames.length === 0) {
    //     return NextResponse.json(
    //         { success: false, error: 'PDF files are required' },
    //         { status: 400 }
    //     );
    // }

    const pdfFileNames = [
      "Depoteröffnungsantrag.pdf",
      "Deckblatt_Vertragspaket.pdf",
      "Serviceentgelt.pdf",
      "Servicegebühr.pdf",
      "Vermittlungsgebühr.pdf",
      "Vermögensverwaltungsvertrag.pdf",
      "Froots_Allgemeine_Informationsbroschüren.pdf"
    ];

    const finalPdfPaths: string[] = [];

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Sitzungs-ID ist erforderlich' },
        { status: 400 }
      );
    }

    if (!userInfo) {
      return NextResponse.json(
        { success: false, error: 'Benutzerinformationen sind erforderlich' },
        { status: 400 }
      );
    }

    // PDF File Names is an array, join to create path
    for (const pdfFileName of pdfFileNames) {
      if (typeof pdfFileName !== 'string' || pdfFileName.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Ungültiger PDF-Dateiname angegeben' },
          { status: 400 }
        );
      }


      // Use provided path or default to the static PDF
      const finalPdfPath = path.join(process.cwd(), "public/static-pdf/" + pdfFileName);

      console.log('📄 Filling PDF form:', finalPdfPath);

      // Load and fill the PDF
      const filler = await PDFFormFiller.loadFromFile(finalPdfPath, options);

      // Log loaded field names if in debug mode
      if (options.debugMode) {
        const fieldNames = filler?.getFieldNames();
        console.log('📝 Loaded form fields:', JSON.stringify(fieldNames));
      }

      // Create form data from user info
      const formData = createFormDataForContactForm(userInfo, pdfFileName);

      // Fill the form
      filler.fillForm(formData);
      // Flatten if requested
      if (options.flattenForm !== false) {
        filler.flattenForm();
      }

      // Get the filled PDF as base64
      const filledPdfBase64 = await filler.toBase64();

      // Validate the PDF base64 is not empty and has reasonable length
      if (!filledPdfBase64 || filledPdfBase64.length < 100) {
        throw new Error('Generiertes PDF scheint ungültig oder leer zu sein');
      }

      // save PDF for debugging if in debug mode
      const finalPath = path.join(process.cwd(), `/private-documents/${sessionId}/contract-document/${pdfFileName}`);
      // console.log("🚀 ~ POST ~ sessionId:", sessionId)
      await filler.saveToFile(finalPath);
      finalPdfPaths.push(`/private-documents/${sessionId}/contract-document/${pdfFileName}`);
      // console.log('💾 Filled PDF saved for debugging at:', finalPath);
    }
    return NextResponse.json({
      success: true,
      // pdfBase64: filledPdfBase64,
      finalPdfPaths,
      message: 'PDF-Formular erfolgreich ausgefüllt'
    });

  } catch (error) {
    console.error('❌ Error filling PDF form:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'PDF-Formular konnte nicht ausgefüllt werden'
      },
      { status: 500 }
    );
  }
}