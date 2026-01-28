import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { CONFIG } from '@/config/constants';
import crypto from 'crypto';

const SIGNTEQ_API_TOKEN = process.env.NEXT_PUBLIC_ENV === "production" ? process.env.SIGNTEQ_API_KEY_PRO || '' : process.env.SIGNTEQ_API_KEY_DEV || '';
const SIGNTEQ_ORG_ID = process.env.NEXT_PUBLIC_ENV === "production" ? process.env.SIGNTEQ_ORG_ID_PRO || '' : process.env.SIGNTEQ_ORG_ID_DEV || '';
const SIGNTEQ_WEBHOOK_SECRET = process.env.NEXT_PUBLIC_ENV === "production" ? process.env.SIGNTEQ_WEBHOOK_SECRET_PRO || '' : process.env.SIGNTEQ_WEBHOOK_SECRET_DEV || '';

type SignTeqWebhookPayload = {
	event?: string;
	meta?: unknown;
	request_id?: string;
	document_id?: string;
	timestamp?: string;
};

// Health check / webhook verification endpoint
export async function GET() {
	return NextResponse.json({ success: true });
}

function verifyWebhookSignature(payload: string, signature: string | null): boolean {
	if (!signature) {
		console.warn('⚠️ Webhook: No signature header provided');
		return false;
	}

	if (!SIGNTEQ_WEBHOOK_SECRET) {
		console.warn('⚠️ Webhook: No webhook secret configured');
		return false;
	}

	try {
		const expectedSignature = crypto
			.createHmac('sha256', SIGNTEQ_WEBHOOK_SECRET)
			.update(payload)
			.digest('hex');

		return signature === expectedSignature;
	} catch (error) {
		console.error('❌ Webhook: Signature verification error:', error);
		return false;
	}
}

function extractQaSessionId(meta: unknown): string | null {
	if (!meta || typeof meta !== 'object') return null;
	const m = meta as Record<string, unknown>;
	const candidates = [
		m.qaSessionId,
		m.sessionId,
		m.qa_session_id,
	];
	for (const c of candidates) {
		if (typeof c === 'string' && c.trim().length > 0) return c;
	}
	return null;
}

async function resolveQaSessionIdFromWorkflowState(input: {
	requestId?: string;
	documentId?: string;
}): Promise<string | null> {
	const { requestId, documentId } = input;
	if (!requestId && !documentId) return null;

	try {
		const workflow = await prisma.sessionWorkflowState.findFirst({
			where: {
				OR: [
					...(documentId
						? [
								{
									stepData: {
										path: ['signteq', 'documentId'],
										equals: documentId,
									},
								},
							]
						: []),
					...(requestId
						? [
								{
									stepData: {
										path: ['signteq', 'requestId'],
										equals: requestId,
									},
								},
							]
						: []),
				],
			},
			select: { qaSessionId: true },
		});
		return workflow?.qaSessionId ?? null;
	} catch (err) {
		console.error('❌ Webhook: failed to resolve session from workflowState JSON:', err);
		return null;
	}
}

async function downloadCompletedDocumentBase64(documentId: string): Promise<string> {
	if (!SIGNTEQ_API_TOKEN) {
		throw new Error('SignTeq API token not configured');
	}

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

async function saveSignedPdfToSession(params: {
	qaSessionId: string;
	base64Data: string;
}) {
	const { qaSessionId, base64Data } = params;
	const documentsDir = join(process.cwd(), 'private-documents', qaSessionId, 'signed');
	await mkdir(documentsDir, { recursive: true });
	const filePath = join(documentsDir, 'signature.pdf');
	const buffer = Buffer.from(base64Data, 'base64');
	await writeFile(filePath, buffer);
	return {
		filePath,
		size: buffer.length,
		publicUrl: `/api/documents/${qaSessionId}/signed/signature.pdf`,
	};
}

export async function POST(request: NextRequest) {
	let payload: SignTeqWebhookPayload;
	let rawBody: string;

	console.log("this is the event")

	try {
		rawBody = await request.text();
		payload = JSON.parse(rawBody) as SignTeqWebhookPayload;
	} catch {
		return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
	}
	console.log('📬 SignTeq webhook received:', JSON.stringify(payload, null, 2));

	// Verify webhook signature for security
	const signature = request.headers.get('Signature');
	if (!verifyWebhookSignature(rawBody, signature)) {
		console.error('❌ Webhook: Invalid signature');
		return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
	}


	const event = payload.event;
	const requestId = payload.request_id;
	const documentId = payload.document_id;

	// Always respond 200 for unknown/ignored events to avoid endless retries
	if (event !== 'document_completed' && event !== 'document_signed') {
		return NextResponse.json({ success: true, ignored: true, event });
	}

	if (!documentId) {
		return NextResponse.json({ success: false, error: 'document_id missing' }, { status: 400 });
	}

	try {
		const qaSessionIdFromMeta = extractQaSessionId(payload.meta);
		const qaSessionId = qaSessionIdFromMeta ??(await resolveQaSessionIdFromWorkflowState({ requestId, documentId }));

		if (!qaSessionId) {
			console.warn('⚠️ Webhook: document_completed but could not resolve qaSessionId', {
				requestId,
				documentId,
				meta: payload.meta,
			});
			return NextResponse.json({ success: true, processed: false, reason: 'unknown_session' });
		}

		// Best-effort status update
		try {
			const existing = await prisma.sessionWorkflowState.findUnique({
				where: { qaSessionId },
				select: { stepData: true },
			});
			const existingStepData = (existing?.stepData ?? {}) as Record<string, unknown>;
			const signteq = (existingStepData.signteq ?? {}) as Record<string, unknown>;
			
			// If status is already DOCUMENT_COMPLETED, don't overwrite it
			if (signteq.status === 'DOCUMENT_COMPLETED') {
				console.log('ℹ️ Webhook: Document already completed, ignoring event', {
					qaSessionId,
					documentId,
					event,
				});
				return NextResponse.json({ success: true, processed: false, reason: 'already_completed' });
			}
			
			let mergedStepData = null;

			if (event === 'document_signed') {
				mergedStepData = {
					...existingStepData,
					signteq: {
						...signteq,
						requestId: (signteq.requestId as string | undefined) ?? requestId,
						documentId: (signteq.documentId as string | undefined) ?? documentId,
						status: 'FIRST_SIGNED',
						completedAt: payload.timestamp ?? new Date().toISOString(),
						savedUrl: null,
						savedSize: null,
					},
				};
			} else if (event === 'document_completed') {
				const base64 = await downloadCompletedDocumentBase64(documentId);
				const saved = await saveSignedPdfToSession({ qaSessionId, base64Data: base64 });
				mergedStepData = {
					...existingStepData,
					signteq: {
						...signteq,
						requestId: (signteq.requestId as string | undefined) ?? requestId,
						documentId: (signteq.documentId as string | undefined) ?? documentId,
						status: 'DOCUMENT_COMPLETED',
						completedAt: payload.timestamp ?? new Date().toISOString(),
						savedUrl: saved.publicUrl,
						savedSize: saved.size,
					},
				};
			}

			if (!mergedStepData) {
				console.error('⚠️ Webhook: no stepData to update for event:', event);
				return NextResponse.json({ success: true, processed: false, reason: 'no meta data' });
			}

			await prisma.sessionWorkflowState.upsert({
				where: { qaSessionId },
				create: { qaSessionId, stepData: mergedStepData },
				update: { stepData: mergedStepData },
			});
		} catch (err) {
			console.warn('⚠️ Webhook: failed to update workflow state (continuing):', err);
		}

		console.log('✅ Webhook: processed SignTeq document event', {
			qaSessionId,
			documentId,
		});

		return NextResponse.json({ success: true, processed: true });
	} catch (error) {
		console.error('❌ Webhook processing error:', error);
		// Return 200 to avoid aggressive retries; you can change to 500 if you prefer retries.
		return NextResponse.json({ success: true, processed: false, error: 'processing_failed' });
	}
}