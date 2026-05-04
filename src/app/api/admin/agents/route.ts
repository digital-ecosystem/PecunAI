import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '../performance/_lib';

const agentSelect = {
  id: true,
  firstName: true,
  lastName: true,
  agentCode: true,
  isActive: true,
  createdAt: true,
  partner: { select: { id: true, firstName: true, lastName: true, referralCode: true } },
} as const;

async function generateAgentCode(firstName: string, lastName: string): Promise<string> {
  const initials = ((firstName[0] ?? 'X') + (lastName[0] ?? 'X')).toUpperCase();
  for (let attempt = 0; attempt < 10; attempt++) {
    const digits = Math.floor(100 + Math.random() * 900).toString();
    const code = `${initials}${digits}`;
    const existing = await prisma.agent.findUnique({ where: { agentCode: code } });
    if (!existing) return code;
  }
  // Fallback: use timestamp suffix to guarantee uniqueness
  return `${initials}${Date.now().toString().slice(-3)}`;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const agents = await prisma.agent.findMany({
      select: agentSelect,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, agents });
  } catch (error) {
    console.error('[GET /api/admin/agents]', error);
    return NextResponse.json({ success: false, message: 'Interner Serverfehler' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { firstName, lastName, partnerId } = await request.json();

    if (!firstName?.trim() || !lastName?.trim() || !partnerId?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Vorname, Nachname und Berater sind erforderlich' },
        { status: 400 }
      );
    }

    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) {
      return NextResponse.json({ success: false, message: 'Berater nicht gefunden' }, { status: 404 });
    }

    const agentCode = await generateAgentCode(firstName.trim(), lastName.trim());

    const agent = await prisma.agent.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        agentCode,
        partnerId,
      },
      select: agentSelect,
    });

    return NextResponse.json({ success: true, agent }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/agents]', error);
    return NextResponse.json({ success: false, message: 'Interner Serverfehler' }, { status: 500 });
  }
}
