import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '../../performance/_lib';

const agentSelect = {
  id: true,
  firstName: true,
  lastName: true,
  agentCode: true,
  isActive: true,
  createdAt: true,
  partner: { select: { id: true, firstName: true, lastName: true, referralCode: true } },
} as const;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { firstName, lastName, partnerId, isActive } = body;

    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ success: false, message: 'Agent nicht gefunden' }, { status: 404 });
    }

    if (partnerId !== undefined) {
      const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
      if (!partner) {
        return NextResponse.json({ success: false, message: 'Berater nicht gefunden' }, { status: 404 });
      }
    }

    const updated = await prisma.agent.update({
      where: { id },
      data: {
        ...(firstName?.trim() ? { firstName: firstName.trim() } : {}),
        ...(lastName?.trim() ? { lastName: lastName.trim() } : {}),
        ...(partnerId !== undefined ? { partnerId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      select: agentSelect,
    });

    return NextResponse.json({ success: true, agent: updated });
  } catch (error) {
    console.error('[PATCH /api/admin/agents/[id]]', error);
    return NextResponse.json({ success: false, message: 'Interner Serverfehler' }, { status: 500 });
  }
}
