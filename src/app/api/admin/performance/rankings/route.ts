import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, buildDateWhere, isCompleted, sumVolumes, SessionStatus } from '../_lib';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const dateWhere = buildDateWhere(searchParams.get('from'), searchParams.get('to'));

    const [rawTeams, rawAdvisors, rawAgents] = await Promise.all([
      prisma.team.findMany({
        include: {
          teamLead: { select: { firstName: true, lastName: true } },
          members: {
            select: {
              qaSessions: {
                where: dateWhere,
                select: { status: true, oneTimeVolume: true, recurringVolume: true },
              },
            },
          },
        },
      }),
      prisma.partner.findMany({
        where: { isActive: true },
        include: {
          team: { select: { name: true } },
          qaSessions: {
            where: dateWhere,
            select: { status: true, oneTimeVolume: true, recurringVolume: true },
          },
        },
      }),
      prisma.agent.findMany({
        where: { isActive: true },
        include: {
          qaSessions: {
            where: dateWhere,
            select: { status: true, oneTimeVolume: true, recurringVolume: true },
          },
        },
      }),
    ]);

    const teams = rawTeams
      .map((team) => {
        const allSessions = team.members.flatMap((m) => m.qaSessions);
        const approvedSessions = allSessions.filter((s) => s.status === SessionStatus.APPROVED);
        const { oneTime: volumeOneTime, recurring: volumeRecurring } = sumVolumes(approvedSessions);
        return {
          id: team.id,
          name: team.name,
          memberCount: team.members.length,
          lead: team.teamLead ? `${team.teamLead.firstName} ${team.teamLead.lastName}` : '—',
          started: allSessions.length,
          completed: allSessions.filter((s) => isCompleted(s.status)).length,
          sold: approvedSessions.length,
          volumeOneTime,
          volumeRecurring,
        };
      })
      .sort((a, b) => b.sold - a.sold)
      .map((t, i) => ({ ...t, rank: i + 1 }));

    const advisors = rawAdvisors
      .map((advisor) => {
        const approvedSessions = advisor.qaSessions.filter((s) => s.status === SessionStatus.APPROVED);
        const { oneTime: volumeOneTime, recurring: volumeRecurring } = sumVolumes(approvedSessions);
        return {
          id: advisor.id,
          name: `${advisor.firstName} ${advisor.lastName}`,
          email: advisor.email,
          team: advisor.team?.name ?? '—',
          started: advisor.qaSessions.length,
          completed: advisor.qaSessions.filter((s) => isCompleted(s.status)).length,
          sold: approvedSessions.length,
          volumeOneTime,
          volumeRecurring,
        };
      })
      .sort((a, b) => b.sold - a.sold)
      .map((a, i) => ({ ...a, rank: i + 1 }));

    const agents = rawAgents
      .map((agent) => {
        const approvedSessions = agent.qaSessions.filter((s) => s.status === SessionStatus.APPROVED);
        const { oneTime: volumeOneTime, recurring: volumeRecurring } = sumVolumes(approvedSessions);
        return {
          id: agent.id,
          name: `${agent.firstName} ${agent.lastName}`,
          code: agent.agentCode,
          cases: agent.qaSessions.length,
          sold: approvedSessions.length,
          volumeOneTime,
          volumeRecurring,
        };
      })
      .sort((a, b) => b.sold - a.sold)
      .map((a, i) => ({ ...a, rank: i + 1 }));

    return NextResponse.json({ success: true, data: { teams, advisors, agents } });
  } catch (error) {
    console.error('Performance rankings error:', error);
    return NextResponse.json({ success: false, error: 'Interner Serverfehler' }, { status: 500 });
  }
}
