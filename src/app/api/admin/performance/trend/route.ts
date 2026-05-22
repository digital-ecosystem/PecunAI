import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, buildSessionWhere, isCompleted, SessionStatus } from '../_lib';

const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

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

    const sessions = await prisma.qASession.findMany({
      where: sessionWhere,
      select: { createdAt: true, status: true, oneTimeVolume: true, recurringVolume: true },
      orderBy: { createdAt: 'asc' },
    });

    const monthlyMap: Record<string, {
      month: string;
      started: number;
      completed: number;
      volumeOneTime: number;
      volumeRecurring: number;
    }> = {};

    for (const s of sessions) {
      const d = new Date(s.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap[key]) {
        monthlyMap[key] = { month: MONTH_LABELS[d.getMonth()], started: 0, completed: 0, volumeOneTime: 0, volumeRecurring: 0 };
      }

      monthlyMap[key].started++;

      if (isCompleted(s.status)) {
        monthlyMap[key].completed++;
      }

      if (s.status === SessionStatus.APPROVED) {
        monthlyMap[key].volumeOneTime += Number(s.oneTimeVolume ?? 0);
        monthlyMap[key].volumeRecurring += Number(s.recurringVolume ?? 0);
      }
    }

    const data = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Performance trend error:', error);
    return NextResponse.json({ success: false, error: 'Interner Serverfehler' }, { status: 500 });
  }
}
