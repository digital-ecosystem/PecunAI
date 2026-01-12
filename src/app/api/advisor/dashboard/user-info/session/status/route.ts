import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { SessionStatus } from '@/types';
//import { sendSessionStatusEmail } from '@/lib/email';

export async function PATCH(req: Request) {
  try {
    const cookie = (await cookies()).get('advisor_session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId || session?.role !== 'partner') {
      return NextResponse.json(
        { success: false, message: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const body = (await req.json()) as { sessionId?: string; status?: SessionStatus };
    const sessionId = body.sessionId;
    const status = body.status;


    if (!sessionId || !status) {
      return NextResponse.json(
        { success: false, error: 'Sitzungs-ID und Status sind erforderlich' },
        { status: 400 }
      );
    }

    // advisors are only allowed to accept/deny.
    if (![SessionStatus.APPROVED, SessionStatus.REJECTED].includes(status)) {
      return NextResponse.json(
        { success: false, error: `Ungültiger Status: ${status}` },
        { status: 400 }
      );
    }

    const ownedSession = await prisma.qASession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        partnerId: true,
        user: { select: { email: true, name: true } },
        personalInfo: { select: { firstName: true, lastName: true } },
      },
    });

    if (!ownedSession || ownedSession.partnerId !== session.userId) {
      return NextResponse.json({ success: false, message: 'Nicht berechtigt' }, { status: 403 });
    }

    const updated = await prisma.qASession.update({
      where: { id: sessionId },
      data: { status },
    });

    // let emailSent = false;
    // try {
    //   const recipientName = ownedSession.personalInfo
    //     ? `${ownedSession.personalInfo.firstName} ${ownedSession.personalInfo.lastName}`.trim()
    //     : ownedSession.user.name;

    //   await sendSessionStatusEmail({
    //     to: ownedSession.user.email,
    //     status,
    //     qaSessionId: updated.id,
    //     recipientName,
    //   });
    //   emailSent = true;
    // } catch (error) {
    //   console.error('[advisor session status] failed to send email', error);
    // }

    return NextResponse.json({
      success: true,
      message: 'Sitzungsstatus erfolgreich aktualisiert',
      session: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt,
      }
    });
  } catch (error) {
    console.error('[PATCH /api/advisor/dashboard/user-info/session/status]', error);
    return NextResponse.json(
      { success: false, error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
