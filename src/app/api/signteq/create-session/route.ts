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
    console.log("🚀 ~ POST ~ signDSessionData:", signDSessionData)

    if (!SIGNTEQ_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'SignTeq API-Token nicht konfiguriert' },
        { status: 500 }
      );
    }

    // Validate required fields
    if (!documentBase64) {
      return NextResponse.json(
        { success: false, error: 'Dokument-Base64-Daten sind erforderlich' },
        { status: 400 }
      );
    }

    if (!recipientEmail || !recipientName) {
      return NextResponse.json(
        { success: false, error: 'Empfänger-E-Mail und Name sind erforderlich' },
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
      // Meta information can be added here if needed - Right Check
      // ...((signDSessionData.session_token && signDSessionData.id) && {
      //   meta: {
      //     session_token: signDSessionData.session_token,
      //     session_id: signDSessionData.id,
      //   },
      // }),
      documents: [
        {
          name: documentName || "document.pdf",
          base64: cleanBase64,
          fields: [
            {
              page: 1,
              type: "signature", // custom-stamp
              width: 250,
              height: 100,
              x: 500,
              y: 1100,
              required: true,
              read_only: false,
              recipient_id: "1"
            },
            // {
            //   page: 24,
            //   type: "signature", // custom-stamp
            //   width: 250,
            //   height: 100,
            //   x: 75,
            //   y: 725,
            //   required: true,
            //   read_only: false,
            //   recipient_id: "1"
            // },
            // {
            //   page: 25,
            //   type: "signature", // custom-stamp
            //   width: 250,
            //   height: 100,
            //   x: 75,
            //   y: 1275,
            //   required: true,
            //   read_only: false,
            //   recipient_id: "1"
            // }
          ]
        }
      ],
      recipients: [{
        id: "1",
        type: "signatory",
        email: recipientEmail,
        name: recipientName,
        do_not_notify: true,
        language: "en",
        // QES - Right Check
        // qes: true
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
      const responseData = axiosError.response?.data;
      const statusCode = axiosError.response?.status || 500;
      
      console.error('❌ SignTeq API error details:', {
        status: statusCode,
        statusText: axiosError.response?.statusText,
        data: responseData,
        message: axiosError.message
      });

      // Extract meaningful error message
      let errorMessage = 'SignTeq API-Fehler';
      let errorDetails = '';

      if (responseData) {
        if (typeof responseData === 'string') {
          errorMessage = responseData;
        } else if (responseData.message) {
          errorMessage = responseData.message;
          errorDetails = responseData.details || responseData.error || '';
        } else if (responseData.error) {
          errorMessage = responseData.error;
        } else if (responseData.errors) {
          // Handle validation errors
          errorMessage = 'Validierungsfehler';
          errorDetails = JSON.stringify(responseData.errors);
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: errorDetails,
          statusCode: statusCode
        },
        { status: statusCode }
      );
    }

    // Handle other types of errors
    const errorMessage = error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten';
    console.error('❌ Unexpected error:', errorMessage);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: 'Ein unerwarteter Fehler ist beim Erstellen der SignTeq-Sitzung aufgetreten'
      },
      { status: 500 }
    );
  }
}