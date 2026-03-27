import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { CONFIG } from '@/config/constants';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { createAdviosrSignTeqRequest } from '@/utils/adviosrRequest';

const SIGNTEQ_API_TOKEN =
  process.env.NEXT_PUBLIC_ENV === 'production'
    ? process.env.SIGNTEQ_API_KEY_PRO || ''
    : process.env.SIGNTEQ_API_KEY_DEV || '';
const SIGNTEQ_ORG_ID =
  process.env.NEXT_PUBLIC_ENV === 'production'
    ? process.env.SIGNTEQ_ORG_ID_PRO || ''
    : process.env.SIGNTEQ_ORG_ID_DEV || '';

async function downloadDocumentBase64(documentId: string): Promise<string> {
  const response = await axios.get(
    `${CONFIG.SIGNTEQ.API_URL}/documents/${documentId}/download?organization_id=${SIGNTEQ_ORG_ID}`,
    {
      params: { type: 'completed' },
      headers: {
        Authorization: `Bearer ${SIGNTEQ_API_TOKEN}`,
        Accept: 'application/json',
      },
      responseType: 'arraybuffer',
      timeout: 30000,
    }
  );
  return Buffer.from(response.data).toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId ist erforderlich' }, { status: 400 });
    }

    // Get the workflow state to find the document ID from the first signature
    const workflowState = await prisma.sessionWorkflowState.findUnique({
      where: { qaSessionId: sessionId },
      select: { stepData: true },
    });

    if (!workflowState) {
      return NextResponse.json({ success: false, error: 'Workflow-Status nicht gefunden' }, { status: 404 });
    }

    const stepData = workflowState.stepData as Record<string, unknown>;
    const signteq = (stepData?.signteq ?? {}) as Record<string, unknown>;
    const status = signteq.status as string | undefined;
    const documentId = signteq.documentId as string | undefined;

    if (status === 'DOCUMENT_COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Das Dokument wurde bereits vollständig unterschrieben' },
        { status: 400 }
      );
    }

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'Keine Dokument-ID gefunden. Der Kunde muss zuerst unterschreiben.' },
        { status: 400 }
      );
    }

    const session = await prisma.qASession.findUnique({
      where: { id: sessionId },
      include: { partner: true },
    });

    if (!session || !session.partner) {
      return NextResponse.json({ success: false, error: 'Session oder Partner nicht gefunden' }, { status: 404 });
    }

    logger.info('Resending advisor SignTeq link', { sessionId, documentId });

    // Re-download the customer-signed document
    const base64Document = await downloadDocumentBase64(documentId);

    // Re-create the advisor signature request
    await createAdviosrSignTeqRequest(sessionId, session.partner.id, base64Document);

    logger.info('Advisor SignTeq link resent successfully', { sessionId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error resending advisor SignTeq session:', error);

    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const responseData = error.response?.data;
      let errorMessage = 'SignTeq API-Fehler';
      if (responseData?.message) errorMessage = responseData.message;
      else if (responseData?.error) errorMessage = responseData.error;
      return NextResponse.json({ success: false, error: errorMessage }, { status: statusCode });
    }

    return handleApiError(error);
  }
}
