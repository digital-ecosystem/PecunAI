import { NextRequest, NextResponse } from 'next/server';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { CONFIG } from '@/config/constants';

const SIGNTEQ_API_TOKEN = process.env.NEXT_PUBLIC_ENV === 'production' ? process.env.SIGNTEQ_API_KEY_PRO || '' : process.env.SIGNTEQ_API_KEY_DEV || '';
const SIGNTEQ_ORG_ID    = process.env.NEXT_PUBLIC_ENV === 'production' ? process.env.SIGNTEQ_ORG_ID_PRO || '' : process.env.SIGNTEQ_ORG_ID_DEV || '';

/** Last-resort recovery for the finally-signed contract: re-fetch it from SignTeq and cache it.
 *
 *  The signed PDF only ever reached disk during the `document_completed` webhook. If that write
 *  failed the file was gone for good, even though SignTeq still holds the document — which is how
 *  "the advisor signed but we cannot access the signed pdfs" became unrecoverable. Keyed on the
 *  advisor's own document id, recorded by persistAdvisorRequestIds when the request is created.
 *
 *  Returns null when there is nothing to recover from, so the caller falls through to its 404. */
async function recoverSignedPdf(sessionId: string): Promise<Buffer | null> {
  if (!SIGNTEQ_API_TOKEN || !SIGNTEQ_ORG_ID) return null;

  const workflowState = await prisma.sessionWorkflowState.findUnique({
    where:  { qaSessionId: sessionId },
    select: { stepData: true },
  });
  const stepData = (workflowState?.stepData ?? {}) as Record<string, unknown>;
  const signteq  = (stepData.signteq ?? {}) as Record<string, unknown>;
  // The advisor's document is the fully-signed one. Sessions created before the id was recorded
  // have no advisorDocumentId — nothing to fall back to, and the customer's documentId would only
  // return the half-signed version, which must never be served as the signed contract.
  const advisorDocumentId = signteq.advisorDocumentId as string | undefined;
  if (!advisorDocumentId || signteq.status !== 'DOCUMENT_COMPLETED') return null;

  console.log('↻ Signed PDF missing on disk — re-fetching from SignTeq', { sessionId, advisorDocumentId });
  const response = await axios.get(
    `${CONFIG.SIGNTEQ.API_URL}/documents/${advisorDocumentId}/download?organization_id=${SIGNTEQ_ORG_ID}`,
    {
      params:       { type: 'completed' },
      headers:      { Authorization: `Bearer ${SIGNTEQ_API_TOKEN}`, Accept: 'application/json' },
      responseType: 'arraybuffer',
      timeout:      30000,
    }
  );
  const buffer = Buffer.from(response.data);

  // Cache it so the next request is a plain file read again. Best-effort: a read-only or full
  // disk must not turn a recoverable download into a 404.
  try {
    const dir = path.join(process.cwd(), 'private-documents', sessionId, 'signed');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'signature.pdf'), buffer);
  } catch (err) {
    console.error('⚠️ Could not cache the recovered signed PDF (serving it anyway)', { sessionId, err });
  }
  return buffer;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    // Await params before using
    const { slug } = await params;

    // Reconstruct the file path from slug
    // slug will be: ['contract-document', '123456', 'Depoteröffnungsantrag.pdf']
    const filePath = path.join(
      process.cwd(),
      'private-documents',
      ...slug
    );

    // Security: Prevent directory traversal attacks
    const realPath = path.resolve(filePath);
    const baseDir = path.resolve(process.cwd(), 'private-documents');
    
    if (!realPath.startsWith(baseDir)) {
      return NextResponse.json(
        { error: 'Unbefugter Zugriff' },
        { status: 403 }
      );
    }

    // Read the file. For the one path that can legitimately be missing while the document itself
    // still exists — the finally-signed contract — try SignTeq before giving up.
    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(realPath);
    } catch (readErr) {
      const isSignedContract = slug.length === 3 && slug[1] === 'signed' && slug[2] === 'signature.pdf';
      const recovered = isSignedContract ? await recoverSignedPdf(slug[0]) : null;
      if (!recovered) throw readErr;
      fileBuffer = recovered;
    }

    // Convert Buffer to Uint8Array so it's compatible with BodyInit
    const body = new Uint8Array(fileBuffer);

    // Set appropriate headers
    // Use a simple ASCII-safe filename to avoid proxy/tunnel issues
    const fileName = String(slug[slug.length - 1]);
    // Create ASCII-safe fallback by removing non-ASCII characters
    const asciiFileName = fileName.replace(/[^\x00-\x7F]/g, '_');

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${asciiFileName}"`,
      },
    });
  } catch (error) {
    console.error('Error serving document:', error);
    return NextResponse.json(
      { error: 'Dokument nicht gefunden' },
      { status: 404 }
    );
  }
}