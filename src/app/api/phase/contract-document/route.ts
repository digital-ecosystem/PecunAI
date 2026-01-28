import { NextRequest, NextResponse } from 'next/server';
import { createFormDataForContactForm, PDFFormFiller, suggestedProduct, Partner } from '@/utils/pdfFormFiller';
import { prisma } from '@/lib/prisma';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userInfo,
      //   additionalData = {}, 
      // pdfFileNames,
      questions = [],
      answers = {},
      options = { flattenForm: true, debugMode: false },
      sessionId,
    } = body;

    const pdfFileNames = [
      "Deckblatt_Vertragspaket.pdf",
      "Depoteröffnungsantrag.pdf",
      "Serviceentgelt.pdf",
      "Servicegebühr.pdf",
      "Vermittlungsgebühr.pdf",
      "Vermögensverwaltungsvertrag.pdf",
      "Froots_Allgemeine_Informationsbroschüren.pdf",
      "4money_protokoll_PecunAI_v.pdf"
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

    // fetch session to verify it exists
    const session = await prisma.qASession.findUnique({
      where: { id: sessionId },
      include: { 
        partner: true,
        productSuggestions: { include: { product: true } }
      }
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Ungültige Sitzungs-ID' },
        { status: 404 }
      );
    }


    const suggestedProductData: suggestedProduct = {
      id: session?.productSuggestions?.product?.id || '',
      shortName: session?.productSuggestions?.product?.shortName || '',
      name: session?.productSuggestions?.product?.name || '',
      sri: session?.productSuggestions?.product?.sri || '',
      maximumYear: session?.productSuggestions?.product?.maximumYear || 0,
      minimumYear: session?.productSuggestions?.product?.minimumYear || 0,
      startTime: session?.createdAt || '',
    }

    console.log("🚀 ~ POST ~ suggestedProductData:", suggestedProductData)

    const partner: Partner = {
      id: session.partner.id,
      email: session.partner.email,
      phone: session.partner.phone,
      firstName: session.partner.firstName,
      lastName: session.partner.lastName,
      birthday: session.partner.birthday,
      referralCode: session.partner.referralCode,
      agentNumber: session.partner.agentNumber,
      isActive: session.partner.isActive,
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

      //console.log('📄 Filling PDF form:', finalPdfPath);

      // Load and fill the PDF
      const filler = await PDFFormFiller.loadFromFile(finalPdfPath, options);

      // Log loaded field names if in debug mode
      if (options.debugMode) {
        const fieldNames = filler?.getFieldNames();
        console.log('📝 Loaded form fields:', JSON.stringify(fieldNames));
      }

      // Create form data from user info with product information
      const formData = createFormDataForContactForm(userInfo, pdfFileName, questions, answers, suggestedProductData, partner);

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