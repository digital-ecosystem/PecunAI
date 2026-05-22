import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, buildSessionWhere, COMPLETED_STATUSES, SessionStatus, toNum } from '../_lib';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const sessionWhere = buildSessionWhere({
      from: searchParams.get('from'),
      to: searchParams.get('to'),
      teamId: searchParams.get('teamId'),
      partnerId: searchParams.get('partnerId'),
      agentId: searchParams.get('agentId'),
    });

    const [started, completed, sold, volumeResult, teamCount, advisorCount, agentCount] = await Promise.all([
      prisma.qASession.count({ where: sessionWhere }),
      prisma.qASession.count({ where: { ...sessionWhere, status: { in: COMPLETED_STATUSES } } }),
      prisma.qASession.count({ where: { ...sessionWhere, status: SessionStatus.APPROVED } }),
      prisma.qASession.aggregate({
        where: { ...sessionWhere, status: SessionStatus.APPROVED },
        _sum: { oneTimeVolume: true, recurringVolume: true },
      }),
      prisma.team.count(),
      prisma.partner.count({ where: { isActive: true } }),
      prisma.agent.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        started,
        completed,
        sold,
        volumeOneTime: toNum(volumeResult._sum.oneTimeVolume),
        volumeRecurring: toNum(volumeResult._sum.recurringVolume),
        teamCount,
        advisorCount,
        agentCount,
      },
    });
  } catch (error) {
    console.error('Performance KPIs error:', error);
    return NextResponse.json({ success: false, error: 'Interner Serverfehler' }, { status: 500 });
  }
}
