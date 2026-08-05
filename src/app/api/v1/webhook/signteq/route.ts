import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { CONFIG } from '@/config/constants';
import { downloadLegtitationPDF } from '@/utils/downloadVerfiyPersonPDF';
import { createAdviosrSignTeqRequest, persistAdvisorRequestIds } from '@/utils/adviosrRequest';

const SIGNTEQ_API_TOKEN = process.env.NEXT_PUBLIC_ENV === "production" ? process.env.SIGNTEQ_API_KEY_PRO || '' : process.env.SIGNTEQ_API_KEY_DEV || '';
const SIGNTEQ_ORG_ID = process.env.NEXT_PUBLIC_ENV === "production" ? process.env.SIGNTEQ_ORG_ID_PRO || '' : process.env.SIGNTEQ_ORG_ID_DEV || '';

type SignTeqWebhookPayload = {
	event?: string;
	meta?: {
		qaSessionId?: string;
		partnerId?: string;
		request: string;
		[key: string]: unknown;
	};
	request_id?: string;
	document_id?: string;
	timestamp?: string;
};

// Health check / webhook verification endpoint
export async function GET() {
	return NextResponse.json({ success: true });
}

// function verifyWebhookSignature(payload: string, signature: string | null): boolean {
// 	if (!signature) {
// 		console.warn('⚠️ Webhook: No signature header provided');
// 		return false;
// 	}

// 	if (!SIGNTEQ_WEBHOOK_SECRET) {
// 		console.warn('⚠️ Webhook: No webhook secret configured');
// 		return false;
// 	}

// 	try {
// 		const expectedSignature = crypto
// 			.createHmac('sha256', SIGNTEQ_WEBHOOK_SECRET)
// 			.update(payload)
// 			.digest('hex');

// 		return signature === expectedSignature;
// 	} catch (error) {
// 		console.error('❌ Webhook: Signature verification error:', error);
// 		return false;
// 	}
// }

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
	// const signature = request.headers.get('Signature');
	// if (!verifyWebhookSignature(rawBody, signature)) {
	// 	console.error('❌ Webhook: Invalid signature');
	// 	return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
	// }


	const event = payload.event;
	const requestId = payload.request_id;
	const documentId = payload.document_id;
	let base64 = null;

	// Always respond 200 for unknown/ignored events to avoid endless retries
	if (event !== 'document_completed' && event !== 'document_signed') {
		return NextResponse.json({ success: true, ignored: true, event });
	}

	if (!documentId) {
		return NextResponse.json({ success: false, error: 'document_id missing' }, { status: 400 });
	}

	console.log(`🔔 Processing SignTeq: ${payload} `);
	try {
		const qaSessionIdFromMeta = payload?.meta?.qaSessionId ? payload.meta.qaSessionId : null;
		const partnerIdFromMeta = payload?.meta?.partnerId ? payload.meta.partnerId : null;
		const requestFromMeta = payload?.meta?.request ? payload.meta.request : null;
		if (!qaSessionIdFromMeta || !partnerIdFromMeta || !requestFromMeta) {
			console.warn('⚠️ Webhook: qaSessionId or partnerId or request not found in meta, will attempt to resolve from workflow state', {
				requestId,
				documentId,
				meta: payload.meta,
			});
			return NextResponse.json({ success: true, processed: false, reason: 'missing_session_id' });
		}
		const qaSessionId = qaSessionIdFromMeta ?? (await resolveQaSessionIdFromWorkflowState({ requestId, documentId }));

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

			if (event === 'document_completed') {
				base64 = await downloadCompletedDocumentBase64(documentId);
				if (!base64) return NextResponse.json({ success: false, error: 'Failed to download completed document' }, { status: 500 });
				if (requestFromMeta === "final_signature_request") {
					// The PDF write is best-effort and deliberately NOT allowed to gate the status write.
					// It used to run first, inside the same try whose catch merely warns — so a failed
					// mkdir/writeFile skipped the upsert below, left the session reading "not yet fully
					// signed" in the advisor dashboard, and still answered SignTeq 200 so no retry came.
					// advisorDocumentId is recorded either way, so the download route can fetch the
					// finished PDF from SignTeq on demand when the local file is missing.
					let saved: { publicUrl: string; size: number } | null = null;
					try {
						saved = await saveSignedPdfToSession({ qaSessionId, base64Data: base64 });
					} catch (err) {
						console.error('❌ Webhook: could not write the signed PDF to disk — setting the status anyway; the PDF will be fetched from SignTeq on demand', { qaSessionId, documentId, err });
					}
					mergedStepData = {
						...existingStepData,
						signteq: {
							...signteq,
							requestId: (signteq.requestId as string | undefined) ?? requestId,
							documentId: (signteq.documentId as string | undefined) ?? documentId,
							// The advisor's own request and document — a NEW document in SignTeq, distinct from
							// the customer documentId above, and the only handle for re-downloading the final PDF.
							advisorRequestId: requestId ?? (signteq.advisorRequestId as string | undefined),
							advisorDocumentId: documentId,
							status:'DOCUMENT_COMPLETED',
							completedAt: payload.timestamp ?? new Date().toISOString(),
							...(saved ? { savedUrl: saved.publicUrl, savedSize: saved.size } : {}),
						},
					};
				} else if (requestFromMeta === "first_signature_request") {
					mergedStepData = {
						...existingStepData,
						signteq: {
							...signteq,
							requestId: (signteq.requestId as string | undefined) ?? requestId,
							documentId: (signteq.documentId as string | undefined) ?? documentId,
							status: 'FIRST_DOCUMENT_COMPLETED',
							completedAt: payload.timestamp ?? new Date().toISOString(),
						},
					};
				}
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
			// NOT "continuing" — anything thrown here means the session status was never written,
			// so the advisor dashboard keeps showing the document as not fully signed. Report it as
			// an error and say so in the response body, rather than answering a clean 200 that hides
			// the failure from both SignTeq and whoever reads the logs.
			console.error('❌ Webhook: FAILED to update workflow state — signature status not recorded', { qaSessionId, documentId, event, err });
			return NextResponse.json({ success: true, processed: false, reason: 'state_update_failed' });
		}

		if (requestFromMeta === "first_signature_request") {
			try {
				await downloadLegtitationPDF(qaSessionId);
			} catch (err) {
				console.warn('⚠️ Webhook: failed to download legitiation PDF (continuing):', err);
			}
			if (base64) {
				const advisorIds = await createAdviosrSignTeqRequest(qaSessionId, partnerIdFromMeta, base64);
				// Record the advisor request BEFORE its completion webhook can arrive. Without this the
				// advisor's document id existed only in a log line, so a session whose completion event
				// was missed could not be reconciled or its final PDF re-downloaded — the only recovery
				// was to send a fresh request and have the advisor sign a second time.
				if (advisorIds.requestId || advisorIds.documentId) {
					try {
						await persistAdvisorRequestIds(qaSessionId, advisorIds);
					} catch (err) {
						console.error('❌ Webhook: advisor request created but its ids could not be stored', { qaSessionId, advisorIds, err });
					}
				}
			}
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