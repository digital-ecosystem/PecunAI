import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';
import { SessionStatus } from '@/lib/prisma';

export { SessionStatus };

export const COMPLETED_STATUSES = [
  SessionStatus.PENDING,
  SessionStatus.APPROVED,
  SessionStatus.REJECTED,
];

export function isCompleted(status: string | null | undefined): boolean {
  return (
    status === SessionStatus.PENDING ||
    status === SessionStatus.APPROVED ||
    status === SessionStatus.REJECTED
  );
}

export async function requireAdmin(): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const cookie = (await cookies()).get('admin_session')?.value;
  const session = await decrypt(cookie);
  if (!session?.userId || session?.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: 'Nicht authentifiziert' }, { status: 401 }),
    };
  }
  return { ok: true };
}

export function buildDateWhere(from: string | null, to: string | null) {
  if (!from && !to) return {};
  return {
    createdAt: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
    },
  };
}

export function buildSessionWhere(params: {
  from: string | null;
  to: string | null;
  teamId?: string | null;
  partnerId?: string | null;
  agentId?: string | null;
}) {
  const { from, to, teamId, partnerId, agentId } = params;
  return {
    ...buildDateWhere(from, to),
    ...(teamId ? { partner: { teamId } } : {}),
    ...(partnerId ? { partnerId } : {}),
    ...(agentId ? { agentId } : {}),
  };
}

export function sumVolumes(sessions: { oneTimeVolume: unknown; recurringVolume: unknown }[]) {
  return sessions.reduce(
    (acc, s) => ({
      oneTime: acc.oneTime + Number(s.oneTimeVolume ?? 0),
      recurring: acc.recurring + Number(s.recurringVolume ?? 0),
    }),
    { oneTime: 0, recurring: 0 }
  );
}

export function toNum(val: unknown): number {
  return Number(val ?? 0);
}
