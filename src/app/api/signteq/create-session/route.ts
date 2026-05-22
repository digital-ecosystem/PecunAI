import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/api-error";
import { CONFIG } from "@/config/constants";
import { prisma } from '@/lib/prisma';
import { signteqHandshake, saveHandshakeInfo } from '@/utils/signteqHandshake';

// You should store your SignTeq API token in environment variables
const SIGNTEQ_API_TOKEN = process.env.NEXT_PUBLIC_ENV === "production" ? process.env.SIGNTEQ_API_KEY_PRO || '' : process.env.SIGNTEQ_API_KEY_DEV || '';
const SIGNTEQ_ORG_ID = process.env.NEXT_PUBLIC_ENV === "production" ? process.env.SIGNTEQ_ORG_ID_PRO || '' : process.env.SIGNTEQ_ORG_ID_DEV || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      subject,
      documentBase64,
      recipientEmail,
      recipientName,
      sessionId,
    } = body;

    if (!SIGNTEQ_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'SignTeq API-Token nicht konfiguriert' },
        { status: 500 }
      );
    }

    if (!SIGNTEQ_ORG_ID) {
      return NextResponse.json(
        { success: false, error: 'SignTeq Organization ID nicht konfiguriert' },
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

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId ist erforderlich' },
        { status: 400 }
      );
    }

    const handshake: {sessionToken: string, signatureId: string} = await signteqHandshake();

    console.log("🚀 ~ handshake:", handshake);

    const session = await prisma.qASession.findUnique({
      where: {
        id: sessionId
      },
      include: {
        partner: true,
        personalInfo: true
      }
    });

    if (!session || !session.partner) {
      return NextResponse.json(
        { success: false, error: 'Session oder Partner nicht gefunden' },
        { status: 404 }
      );
    }

    // Ensure base64 data doesn't have data URL prefix
    let cleanBase64 = documentBase64;
    if (documentBase64.startsWith('data:')) {
      cleanBase64 = documentBase64.split(',')[1];
    }

    const payload = {
      type: "signature",
      subject: subject || "Dokument zur Unterschrift",
      message: `Hallo ${session.partner.firstName} ${session.partner.lastName},
        Dein 4money Anlegerprozess wurde aktiviert und dein Vertragspaket steht jetzt für dich zur Unterschrift bereit. 
        Folge dem untenstehenden Link, um das Vertragspaket als Berater zu unterschreiben

        Anlegerprofil als Berater unterschreiben


        Falls du Fragen zu dem Prozess haben solltest, kannst du dich jederzeit direkt an deinen 4money Ansprechpartner wenden.

        Dein 4money Team
        4money Financial Services GmbH 
        Einspinnergasse 1/3.Stock, 8010 Graz 
        https://4money.at | office@4money.at | +43 676 92 00 670`,
      settings: {
        auto_reminders: false,
        copy_document_completed: true,
        copy_recipients_document_completed: false,
        delete_after_download: false,
        close_on_success: true,
        redirect_success_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/customer/success`,
        redirect_error_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/customer/error`
      },
      // This meta is echoed back by SignTeq in webhooks so we can map events to our session.
      meta: {
        qaSessionId: sessionId,
        partnerId: session.partner.id,
        request: "first_signature_request"
      },
      documents: [
        {
          name: `Vertragsunterlage-${session.personalInfo?.lastName}-${session.personalInfo?.firstName}-(kunde).pdf`,
          base64: cleanBase64,
          meta: {
            qaSessionId: sessionId,
            partnerId: session.partner.id,
          },
          fields: [
            {
              page: 1,
              type: process.env.NEXT_PUBLIC_ENV === "production" ? "custom-stamp" : "custom-stamp",
              width: 250,
              height: 100,
              x: 400,
              y: 1050,
              required: true,
              read_only: false,
              recipient_id: "1"
            }
          ]
        }
      ],
      recipients: [
        {
        id: "1",
        type: "signatory",
        email: recipientEmail,
        name: recipientName,
        do_not_notify: true,
        language: "de",
        qes_session: {
          signature_id: handshake.signatureId,
          session_token: handshake.sessionToken
        },
        qes: process.env.NEXT_PUBLIC_ENV === "production" ? true : true,
        meta: {
          qaSessionId: sessionId,
          partnerId: session.partner.id,
        }
      },
    ]
    };

    const response = await axios.post(`${CONFIG.SIGNTEQ.API_URL}/requests?organization_id=${SIGNTEQ_ORG_ID}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${SIGNTEQ_API_TOKEN}`,
        'User-Agent': CONFIG.SIGNTEQ.USER_AGENT
      },
      timeout: 30000,
    });


    const data = response.data;
    logger.debug("SignTeq response data:", data);

    await saveHandshakeInfo(handshake.sessionToken, handshake.signatureId, sessionId, session.userId);

    // Persist mapping (best-effort). This enables webhook processing and troubleshooting.
    try {
      const documentId = data?.documents?.[0]?.id as string | undefined;
      const requestId = data?.id as string | undefined;

      if (requestId || documentId) {
        const existing = await prisma.sessionWorkflowState.findUnique({
          where: { qaSessionId: sessionId },
          select: { stepData: true },
        });

        const existingStepData = (existing?.stepData ?? {}) as Record<string, unknown>;
        const mergedStepData = {
          ...existingStepData,
          signteq: {
            requestId,
            documentId,
            status: 'REQUEST_CREATED',
            recipients: data.recipients,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };

        await prisma.sessionWorkflowState.upsert({
          where: { qaSessionId: sessionId },
          create: { qaSessionId: sessionId, stepData: mergedStepData },
          update: { stepData: mergedStepData },
        });
      }
    } catch (err) {
      logger.warn('Could not persist SignTeq mapping (continuing):', err);
    }

    logger.info('SignTeq request created successfully:', {
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
    logger.error('SignTeq integration error:', error);

    // Handle axios errors specifically
    if (axios.isAxiosError(error)) {
      const axiosError = error;
      const responseData = axiosError.response?.data;
      const statusCode = axiosError.response?.status || 500;
      
      logger.error('SignTeq API error details:', {
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

    return handleApiError(error);
  }
}