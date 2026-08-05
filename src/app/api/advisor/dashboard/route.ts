import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/** Both Agent and Partner store the name as separate `firstName` / `lastName` columns. */
type NamedPerson = { firstName: string; lastName: string };

/** `${firstName} ${lastName}` — the same full-name construction /api/admin/dashboard uses,
 *  and the one this app already uses for agents and Berater elsewhere. */
const fullName = (person: NamedPerson) => `${person.firstName} ${person.lastName}`.trim();

export async function GET() {
  try {
    const cookie = (await cookies()).get('advisor_session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId || session?.role !== 'partner') {
      return NextResponse.json(
        { success: false, message: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Get partner info (also determines elevated visibility below)
    const partner = await prisma.partner.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        referralCode: true,
        isSuperAdvisor: true,
      },
    });

    // Super advisors see ALL sessions across every partner/team; every other
    // advisor (isSuperAdvisor = false, the default) sees only their own.
    const rows = await prisma.qASession.findMany({
      where: partner?.isSuperAdvisor ? {} : { partnerId: session.userId },
      include: {
        user: true,
        personalInfo: true,
        answers: true,
        workflowState: true,
        // Names only, and deliberately not spread into the response below: Partner also
        // carries a password hash and Agent carries roster fields the dashboard has no
        // use for. Only the two constructed names leave this endpoint.
        agent: { select: { firstName: true, lastName: true } },
        partner: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Same two fields, same construction and same null convention as /api/admin/dashboard.
    // agentId is nullable on QASession, so a session may have no agent; partnerId is
    // required, so `sessionPartner` is always a real row and partnerName a real name.
    // For a super advisor the rows span several partners, so partnerName varies per row;
    // for a normal advisor it is their own name on every row.
    const sessions = rows.map(({ agent, partner: sessionPartner, ...row }) => ({
      ...row,
      agentName: agent ? fullName(agent) : null,
      partnerName: fullName(sessionPartner),
    }));

    // Keep the response shape identical to before (do not expose the internal flag)
    const partnerResponse = partner
      ? {
          id: partner.id,
          firstName: partner.firstName,
          lastName: partner.lastName,
          email: partner.email,
          referralCode: partner.referralCode,
        }
      : null;

    return NextResponse.json({
      success: true,
      sessions,
      partner: partnerResponse,
    });
  } catch (error) {
    console.error('Partner dashboard error:', error);
    return NextResponse.json(
      { success: false, message: 'Sitzungen konnten nicht abgerufen werden' },
      { status: 500 }
    );
  }
}

