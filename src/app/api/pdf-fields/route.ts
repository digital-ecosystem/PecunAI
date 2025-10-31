import { NextResponse } from 'next/server';
import { PDFFormFiller } from '@/utils/pdfFormFiller';
import path from 'path';

export async function GET() {
  try {
    const pdfPath = path.join(process.cwd(), 'public/static-pdf/4money_protokoll_PecunAI_v1.pdf');
    
    console.log('📄 Analyzing PDF form fields:', pdfPath);
    
    const filler = await PDFFormFiller.loadFromFile(pdfPath, { debugMode: true });
    const fieldNames = filler.getFieldNames();
    const fieldInfo = filler.getFieldInfo();
    
    console.log('📝 PDF Form Fields:', fieldNames);
    console.log('📊 Field Details:', fieldInfo);
    
    return NextResponse.json({
      success: true,
      fieldNames,
      fieldInfo,
      totalFields: fieldNames.length
    });
    
  } catch (error) {
    console.error('❌ Error analyzing PDF fields:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze PDF fields' 
      },
      { status: 500 }
    );
  }
}