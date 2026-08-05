import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Nicht authentifiziert' }, { status: 401 });
    }
    const user = await AuthService.getUserFromToken(token);
    if (!user?.id) {
      return NextResponse.json({ success: false, message: 'Ungültiges Token' }, { status: 401 });
    }

    const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ success: false, message: 'Code fehlt' }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({
      where: { agentCode: code },
      select: { id: true, firstName: true, lastName: true, agentCode: true, isActive: true },
    });

    if (!agent || !agent.isActive) {
      return NextResponse.json({ success: false, message: 'Agenten-Code ungültig oder nicht aktiv' }, { status: 404 });
    }

    return NextResponse.json({ success: true, agent: { id: agent.id, firstName: agent.firstName, lastName: agent.lastName, agentCode: agent.agentCode } });
  } catch (error) {
    console.error('[GET /api/qa-session/agent]', error);
    return NextResponse.json({ success: false, message: 'Interner Serverfehler' }, { status: 500 });
  }
}

// Removed: PATCH /api/qa-session/agent (attach an agent to an already-created session).
//
// Agent linkage is now resolved and written by POST /api/qa-session/create in the same write as
// the partner, so there is no window in which a session exists without the agent it was started
// with. Nothing else in the app attaches or changes an agent after creation — the only writes to
// QASession.agentId were this handler and the create route — so a standalone attach endpoint had
// no remaining caller, and keeping it would have preserved a hole this fix closes: it let any
// authenticated user attach any active agent code to their own session, including an agent
// belonging to a different partner. See docs/fix-reports/agent-linkage-fix.md.
