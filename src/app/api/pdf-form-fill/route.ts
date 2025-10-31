import { NextRequest, NextResponse } from 'next/server';
import { PDFFormFiller, createFormDataFromUser, FormFieldData } from '@/utils/pdfFormFiller';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userInfo, 
      additionalData = {}, 
      pdfPath,
      options = { flattenForm: true, debugMode: false }
    } = body;

    if (!userInfo) {
      return NextResponse.json(
        { success: false, error: 'User information is required' },
        { status: 400 }
      );
    }

    // Use provided path or default to the static PDF
    const finalPdfPath = pdfPath || path.join(process.cwd(), 'public/static-pdf/4money_protokoll_PecunAI_v1.pdf');

    console.log('📄 Filling PDF form:', finalPdfPath);

    // Load and fill the PDF
    const filler = await PDFFormFiller.loadFromFile(finalPdfPath, options);
    
    // Create form data from user info
    const formData = createFormDataFromUser(userInfo, additionalData as FormFieldData);
    
    // Fill the form
    filler.fillForm(formData);
    
    // Flatten if requested
    if (options.flattenForm !== false) {
      filler.flattenForm();
    }
    
    // Get the filled PDF as base64
    const filledPdfBase64 = await filler.toBase64();

    return NextResponse.json({
      success: true,
      pdfBase64: filledPdfBase64,
      message: 'PDF form filled successfully'
    });

  } catch (error) {
    console.error('❌ Error filling PDF form:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fill PDF form' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'fields') {
      // Get form field information
      const pdfPath = searchParams.get('pdfPath') || 
        path.join(process.cwd(), 'public/static-pdf/4money_protokoll_PecunAI_v1.pdf');
      
      const filler = await PDFFormFiller.loadFromFile(pdfPath, { debugMode: true });
      const fieldNames = filler.getFieldNames();
      const fieldInfo = filler.getFieldInfo();
      
      return NextResponse.json({
        success: true,
        fieldNames,
        fieldInfo
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action parameter' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('❌ Error processing request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process request' 
      },
      { status: 500 }
    );
  }
}