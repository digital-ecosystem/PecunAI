import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/app/api/admin/performance/_lib';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { sessionId } = await params;

  try {
    const body   = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 500) : '';

    const workflowState = await prisma.sessionWorkflowState.findUnique({
      where:  { qaSessionId: sessionId },
      select: { stepData: true },
    });

    if (!workflowState) {
      return NextResponse.json(
        { success: false, message: 'Sitzung nicht gefunden' },
        { status: 404 }
      );
    }

    const stepData = (workflowState.stepData ?? {}) as Record<string, unknown>;
    const blocked  = stepData.sessionBlocked;

    if (!blocked) {
      return NextResponse.json(
        { success: false, message: 'Diese Sitzung ist nicht gesperrt' },
        { status: 409 }
      );
    }

    const history = Array.isArray(stepData.sessionUnblocks) ? stepData.sessionUnblocks : [];
    const { sessionBlocked: _removed, ...rest } = stepData;
    void _removed;

    await prisma.sessionWorkflowState.update({
      where: { qaSessionId: sessionId },
      data: {
        stepData: {
          ...rest,
          sessionUnblocks: [
            ...history,
            {
              at:            new Date().toISOString(),
              adminId:       auth.adminId,
              reason,
              previousBlock: blocked,   // what was lifted, so the trail is complete
            },
          ],
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unblock session error:', error);
    return NextResponse.json(
      { success: false, message: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
