import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/app/api/admin/performance/_lib';

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const session = await prisma.qASession.findUnique({ where: { id }, select: { excludedFromReport: true } });
    if (!session) {
      return NextResponse.json({ success: false, message: 'Session not found' }, { status: 404 });
    }

    const updated = await prisma.qASession.update({
      where: { id },
      data: { excludedFromReport: !session.excludedFromReport },
      select: { excludedFromReport: true },
    });

    return NextResponse.json({ success: true, excludedFromReport: updated.excludedFromReport });
  } catch (error) {
    console.error('Toggle exclude error:', error);
    return NextResponse.json({ success: false, message: 'Interner Serverfehler' }, { status: 500 });
  }
}
