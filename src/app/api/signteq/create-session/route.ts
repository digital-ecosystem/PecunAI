import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// You should store your SignTeq API token in environment variables
const SIGNTEQ_API_TOKEN = process.env.SIGNTEQ_API_KEY || process.env.SIGNTEQ_API_TOKEN || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      subject,
      documentName,
      documentBase64,
      recipientEmail,
      recipientName,
      //   sessionId 
      signDSessionData,
    } = body;

    if (!SIGNTEQ_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'SignTeq API token not configured' },
        { status: 500 }
      );
    }

    // Validate required fields
    if (!documentBase64) {
      return NextResponse.json(
        { success: false, error: 'Document base64 data is required' },
        { status: 400 }
      );
    }

    if (!recipientEmail || !recipientName) {
      return NextResponse.json(
        { success: false, error: 'Recipient email and name are required' },
        { status: 400 }
      );
    }

    // Ensure base64 data doesn't have data URL prefix
    let cleanBase64 = documentBase64;
    if (documentBase64.startsWith('data:')) {
      cleanBase64 = documentBase64.split(',')[1];
    }

    const payload = {
      type: "signature",
      subject: subject || "Document Signature Required",
      message: "Please sign this document. If you have any questions, feel free to contact us.",
      settings: {
        auto_reminders: false,
        copy_document_completed: true,
        copy_recipients_document_completed: false,
        delete_after_download: false,
        close_on_success: true,
        redirect_success_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/customer/success`,
        redirect_error_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/customer/error`
      },
      ...((signDSessionData.session_token && signDSessionData.id) && {
        meta: {
          session_token: signDSessionData.session_token,
          session_id: signDSessionData.id,
        },
      }),
      documents: [{
        name: documentName || "document.pdf",
        base64: cleanBase64,
        fields: [{
          page: 3,
          type: "signature",
          width: 200,
          height: 50,
          x: 300,
          y: 500,
          required: true,
          read_only: false,
          recipient_id: "1"
        }]
      }],
      recipients: [{
        id: "1",
        type: "signatory",
        email: recipientEmail,
        name: recipientName,
        do_not_notify: true,
        language: "en",
        qes: false
      }]
    };
    // Log the exact payload structure for debugging
    console.log("🚀 ~ POST ~ payload structure:", {
      payloadKeys: Object.keys(payload),
      documentsStructure: payload.documents.map(doc => ({
        keys: Object.keys(doc),
        hasName: !!doc.name,
        hasBase64: !!doc.base64,
        base64Length: doc.base64?.length || 0,
        fieldsCount: doc.fields?.length || 0
      })),
      recipientsStructure: payload.recipients.map(rec => ({
        keys: Object.keys(rec),
        hasEmail: !!rec.email,
        hasName: !!rec.name,
        id: rec.id
      }))
    });

    console.log("🚀 ~ POST ~ full payload:", JSON.stringify(payload, null, 2))

    console.log('📝 Creating SignTeq signature request:', {
      subject: payload.subject,
      recipient: payload.recipients[0].email,
      documentName: payload.documents[0].name,
      base64Length: cleanBase64.length,
      hasValidBase64: cleanBase64.length > 0
    });

    const response = await axios.post('https://api.signteq.io/v1/requests', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${SIGNTEQ_API_TOKEN}`,
        'User-Agent': 'NextJS-App'
      },
      timeout: 30000, // 30 second timeout
    });

    const data = response.data;
    console.log("🚀 ~ POST ~ data:", data)

    console.log('✅ SignTeq request created successfully:', {
      id: data.id,
      type: data.type,
      subject: data.subject,
      created_at: data.created_at
    });

    // The response structure might be different, let's check what we get
    // and construct the signing URL accordingly
    let signingUrl = null;
    if (data.recipients && data.recipients[0] && data.recipients[0].signing_url) {
      signingUrl = data.recipients[0].signing_url;
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      type: data.type,
      subject: data.subject,
      signing_url: signingUrl,
      data: data
    });

  } catch (error) {
    console.error('❌ SignTeq integration error:', error);

    // Handle axios errors specifically
    if (axios.isAxiosError(error)) {
      const axiosError = error;
      console.error('❌ SignTeq API error:', axiosError.response?.data);
      return NextResponse.json(
        {
          success: false,
          error: axiosError.response?.data?.message || axiosError.message || 'SignTeq API error'
        },
        { status: axiosError.response?.status || 500 }
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