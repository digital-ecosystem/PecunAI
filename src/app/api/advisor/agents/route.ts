import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

export async function GET() {
  try {
    const cookie = (await cookies()).get('advisor_session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId || session?.role !== 'partner') {
      return NextResponse.json({ success: false, message: 'Nicht authentifiziert' }, { status: 401 });
    }

    const agents = await prisma.agent.findMany({
      where: { partnerId: session.userId, isActive: true },
      select: { id: true, firstName: true, lastName: true, agentCode: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    return NextResponse.json({ success: true, agents });
  } catch (error) {
    console.error('[GET /api/advisor/agents]', error);
    return NextResponse.json({ success: false, message: 'Interner Serverfehler' }, { status: 500 });
  }
}
