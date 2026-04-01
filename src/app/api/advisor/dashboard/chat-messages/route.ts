import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const cookie = (await cookies()).get('advisor_session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId || session?.role !== 'partner') {
      return NextResponse.json(
        { success: false, message: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID ist erforderlich' },
        { status: 400 }
      );
    }

    const ownedSession = await prisma.qASession.findUnique({
      where: { id: sessionId },
      select: { id: true, partnerId: true },
    });

    if (!ownedSession || ownedSession.partnerId !== session.userId) {
      return NextResponse.json({ success: false, message: 'Nicht berechtigt' }, { status: 403 });
    }

    const thread = await prisma.thread.findUnique({
      where: { qaSessionId: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({
        success: true,
        messages: [],
      });
    }

    return NextResponse.json({
      success: true,
      messages: thread.messages,
    });
  } catch (error) {
    console.error('Error fetching partner chat messages:', error);
    return NextResponse.json(
      { success: false, message: 'Fehler beim Abrufen der Nachrichten' },
      { status: 500 }
    );
  }
}
