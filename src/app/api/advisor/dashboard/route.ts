import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

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
    const sessions = await prisma.qASession.findMany({
      where: partner?.isSuperAdvisor ? {} : { partnerId: session.userId },
      include: {
        user: true,
        personalInfo: true,
        answers: true,
        workflowState: true,
      },
      orderBy: { createdAt: 'desc' },
    });

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

