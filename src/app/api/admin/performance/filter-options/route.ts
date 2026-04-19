import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '../_lib';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const [teams, advisors, agents] = await Promise.all([
      prisma.team.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.partner.findMany({
        where: { isActive: true },
        select: { id: true, firstName: true, lastName: true, email: true },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
      prisma.agent.findMany({
        where: { isActive: true },
        select: { id: true, agentCode: true, firstName: true, lastName: true },
        orderBy: { agentCode: 'asc' },
      }),
    ]);

    return NextResponse.json({ success: true, data: { teams, advisors, agents } });
  } catch (error) {
    console.error('Performance filter-options error:', error);
    return NextResponse.json({ success: false, error: 'Interner Serverfehler' }, { status: 500 });
  }
}
