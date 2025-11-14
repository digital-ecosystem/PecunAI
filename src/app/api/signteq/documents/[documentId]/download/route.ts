import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const SIGNTEQ_API_TOKEN = process.env.SIGNTEQ_API_KEY || process.env.SIGNTEQ_API_TOKEN || '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'completed';

    if (!SIGNTEQ_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'SignTeq API token not configured' },
        { status: 500 }
      );
    }

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required' },
        { status: 400 }
      );
    }

    console.log('📄 Downloading SignTeq document:', { documentId, type });

    const response = await axios.get(
      `https://api.signteq.io/v1/documents/${documentId}/download`,
      {
        params: { type },
        headers: {
          'Authorization': `Bearer ${SIGNTEQ_API_TOKEN}`,
          'Accept': 'application/json',
        },
        responseType: 'arraybuffer', // Important for binary data
        timeout: 30000,
      }
    );

    // Convert arraybuffer to base64 for storage or transmission
    const base64 = Buffer.from(response.data).toString('base64');

    console.log('✅ Document downloaded successfully:', {
      documentId,
      size: response.data.byteLength,
      contentType: response.headers['content-type']
    });

    // Return the document as base64 for frontend processing
    return NextResponse.json({
      success: true,
      documentId,
      base64,
      contentType: response.headers['content-type'] || 'application/pdf',
      size: response.data.byteLength
    });

  } catch (error) {
    console.error('❌ SignTeq document download error:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('❌ API Response:', error.response?.data);
      return NextResponse.json(
        { 
          success: false, 
          error: error.response?.data?.message || error.message || 'Document download failed'
        },
        { status: error.response?.status || 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      },
      { status: 500 }
    );
  }
}