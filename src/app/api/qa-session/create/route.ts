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

    const referralCodeFromCookie = (cookieStore.get('referral_code')?.value ?? '').trim();
    const partnerCode = partnerCodeFromBody || referralCodeFromCookie;

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

    const newSession = await prisma.qASession.create({
      data: {
        status: 'DRAFT',
        phase: 'TERMS1',
        referralCode: partner.referralCode,
        user: { connect: { id: user.id } },
        partner: { connect: { id: partner.id } },
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        session: newSession,
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

    // Clear autostart marker after successful creation
    response.cookies.set('autostart_session', '', { path: '/', maxAge: 0 });

    return response;
  } catch (error) {
    console.error('Failed to create QASession:', error);
    return NextResponse.json({ success: false, error: 'Interner Serverfehler' }, { status: 500 });
  }
}
