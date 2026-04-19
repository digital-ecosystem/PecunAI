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

export async function PATCH(req: Request) {
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

    let sessionId: string | undefined, agentCode: string | undefined;
    try {
      ({ sessionId, agentCode } = await req.json());
    } catch {
      return NextResponse.json({ success: false, message: 'Ungültiger Request-Body' }, { status: 400 });
    }

    if (!sessionId || !agentCode?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Sitzungs-ID und Agenten-Code sind erforderlich' },
        { status: 400 }
      );
    }

    // Verify the session belongs to this user
    const session = await prisma.qASession.findFirst({
      where: { id: sessionId, userId: user.id },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json({ success: false, message: 'Sitzung nicht gefunden' }, { status: 404 });
    }

    // Look up agent by code
    const agent = await prisma.agent.findUnique({
      where: { agentCode: agentCode.trim().toUpperCase() },
      select: { id: true, firstName: true, lastName: true, agentCode: true, isActive: true },
    });

    if (!agent || !agent.isActive) {
      return NextResponse.json(
        { success: false, message: 'Agenten-Code ungültig oder nicht aktiv' },
        { status: 400 }
      );
    }

    await prisma.qASession.update({
      where: { id: sessionId },
      data: { agentId: agent.id },
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        agentCode: agent.agentCode,
      },
    });
  } catch (error) {
    console.error('[PATCH /api/qa-session/agent]', error);
    return NextResponse.json({ success: false, message: 'Interner Serverfehler' }, { status: 500 });
  }
}
