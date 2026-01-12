import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { CONFIG } from '@/config/constants';

// You should store your SignTeq API token in environment variables
const SIGNTEQ_API_TOKEN = process.env.NEXT_PUBLIC_ENV === "production" ? process.env.SIGNTEQ_API_KEY_PRO || '' : process.env.SIGNTEQ_API_KEY_DEV || '';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      documentBase64, 
      recipientEmail, 
      recipientName,
    } = body;

    if (!SIGNTEQ_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'SignTeq API-Token nicht konfiguriert' },
        { status: 500 }
      );
    }

    // Clean base64 data
    let cleanBase64 = documentBase64;
    if (documentBase64.startsWith('data:')) {
      cleanBase64 = documentBase64.split(',')[1];
    }

    // Try the most basic payload structure
    const payload = {
      subject: "Document Signature Required",
      type: "signature",
      recipients: [{
        id: 1,
        type: "signatory",
        email: recipientEmail,
        name: recipientName,
        language: "en"
      }],
      documents: [{
        name: "document.pdf",
        base64: cleanBase64
      }]
    };

    console.log("🧪 Testing basic payload:", JSON.stringify(payload, null, 2));

    const response = await axios.post(`${CONFIG.SIGNTEQ.API_URL}/sign`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${SIGNTEQ_API_TOKEN}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('❌ Test payload error:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('❌ API Response:', error.response?.data);
      return NextResponse.json(
        { 
          success: false, 
          error: error.response?.data || error.message,
          status: error.response?.status
        },
        { status: error.response?.status || 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten' 
      },
      { status: 500 }
    );
  }
}