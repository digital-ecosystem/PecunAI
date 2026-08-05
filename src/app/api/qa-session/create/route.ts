// app/api/qa-session/create/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/auth';

export async function POST(req: Request) {
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

    const body = await req.json().catch(() => ({}));
    const partnerCodeFromBody = typeof body?.partnerCode === 'string' ? body.partnerCode.trim() : '';
    const agentCodeFromBody = typeof body?.agentCode === 'string' ? body.agentCode.trim() : '';

    const referralCodeFromCookie = (cookieStore.get('referral_code')?.value ?? '').trim();
    const agentCodeFromCookie = (cookieStore.get('agent_code')?.value ?? '').trim();

    const partnerCode = partnerCodeFromBody || referralCodeFromCookie;
    // An agent code held in a cookie belongs to the referral link that also set `referral_code`.
    // If the caller passed its own partner code (manual entry), only an explicitly passed agent
    // code applies — a leftover cookie must not be grafted onto a hand-entered partner.
    const agentCode = partnerCodeFromBody ? agentCodeFromBody : agentCodeFromBody || agentCodeFromCookie;

    if (!partnerCode) {
      const response = NextResponse.json(
        { success: false, message: 'Partner-Code ist erforderlich', error: 'PARTNER_REQUIRED' },
        { status: 400 }
      );
      response.cookies.set('autostart_session', '', { path: '/', maxAge: 0 });
      return response;
    }

    const partner = await prisma.partner.findUnique({
      where: { referralCode: partnerCode },
      select: {
        id: true,
        isActive: true,
        referralCode: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!partner || !partner.isActive) {
      const response = NextResponse.json(
        { success: false, message: 'Ungültiger oder inaktiver Partner-Code', error: 'PARTNER_INVALID' },
        { status: 400 }
      );
      response.cookies.set('autostart_session', '', { path: '/', maxAge: 0 });
      return response;
    }

    // Only one draft session per user
    const existingOpen = await prisma.qASession.findFirst({
      where: {
        userId: user.id,
        status: { in: ['DRAFT'] },
      },
      select: { id: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    if (existingOpen) {
      const response = NextResponse.json(
        {
          success: false,
          message: 'Es gibt bereits eine offene Beratung. Bitte zuerst abschließen.',
          error: 'OPEN_SESSION_EXISTS',
          sessionId: existingOpen.id,
          status: existingOpen.status,
        },
        { status: 409 }
      );

      // Prevent autostart loops
      response.cookies.set('autostart_session', '', { path: '/', maxAge: 0 });
      return response;
    }

    // Agent membership is optional (`QASession.agentId` is nullable), so an unusable agent code
    // degrades to "no agent" instead of costing the customer their session — but never silently:
    // every rejection is logged and reported back on the response.
    let agent: { id: string } | null = null;
    let agentWarning: 'AGENT_INVALID' | 'AGENT_PARTNER_MISMATCH' | null = null;

    if (agentCode) {
      const candidate = await prisma.agent.findUnique({
        where: { agentCode: agentCode.toUpperCase() },
        select: { id: true, isActive: true, partnerId: true },
      });

      if (!candidate || !candidate.isActive) {
        agentWarning = 'AGENT_INVALID';
      } else if (candidate.partnerId !== partner.id) {
        // Agent.partnerId is a required FK: an agent may only be credited on sessions belonging
        // to their own partner, otherwise partner- and agent-rollups disagree.
        agentWarning = 'AGENT_PARTNER_MISMATCH';
      } else {
        agent = { id: candidate.id };
      }

      if (agentWarning) {
        console.warn(
          `[POST /api/qa-session/create] ${agentWarning} — userId=${user.id} partnerCode=${partner.referralCode} agentCode=${agentCode.toUpperCase()}`
        );
      }
    }

    const newSession = await prisma.qASession.create({
      data: {
        status: 'DRAFT',
        phase: 'TERMS1',
        referralCode: partner.referralCode,
        user: { connect: { id: user.id } },
        partner: { connect: { id: partner.id } },
        agent: agent ? { connect: { id: agent.id } } : undefined,
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        session: newSession,
        agentLinked: agent !== null,
        ...(agentWarning ? { agentWarning } : {}),
        partner: {
          id: partner.id,
          firstName: partner.firstName,
          lastName: partner.lastName,
          email: partner.email,
          referralCode: partner.referralCode,
        },
      },
      { status: 201 }
    );

    // Clear referral cookie only if we used it (i.e., no explicit partnerCode in body)
    if (!partnerCodeFromBody && referralCodeFromCookie) {
      response.cookies.set('referral_code', '', { path: '/', maxAge: 0 });
    }

    // Same timing for the agent cookie: never cleared before the session actually exists, so a
    // cancelled or failed attempt stays recoverable. The link's agent applies to the session it
    // produced, so it is consumed here whether it arrived via body or cookie.
    if (agentCodeFromCookie) {
      response.cookies.set('agent_code', '', { path: '/', maxAge: 0 });
    }

    // Clear autostart marker after successful creation
    response.cookies.set('autostart_session', '', { path: '/', maxAge: 0 });

    return response;
  } catch (error) {
    console.error('Failed to create QASession:', error);
    return NextResponse.json({ success: false, error: 'Interner Serverfehler' }, { status: 500 });
  }
}
