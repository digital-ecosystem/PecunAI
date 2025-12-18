import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

export async function GET() {
  try {
    const cookie = (await cookies()).get('partner_session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId || session?.role !== 'partner') {
      return NextResponse.json(
        { success: false, message: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Get only sessions that belong to this partner
    const sessions = await prisma.qASession.findMany({
      where: {
        partnerId: session.userId,
      },
      include: {
        user: true,
        personalInfo: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get partner info
    const partner = await prisma.partner.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        referralCode: true,
      },
    });

    return NextResponse.json({
      success: true,
      sessions,
      partner,
    });
  } catch (error) {
    console.error('Partner dashboard error:', error);
    return NextResponse.json(
      { success: false, message: 'Sitzungen konnten nicht abgerufen werden' },
      { status: 500 }
    );
  }
}

