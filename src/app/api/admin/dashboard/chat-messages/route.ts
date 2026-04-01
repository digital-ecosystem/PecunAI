import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const cookie = (await cookies()).get('admin_session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId || session?.role !== 'admin') {
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

    // Find the thread for this QASession
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
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { success: false, message: 'Fehler beim Abrufen der Nachrichten' },
      { status: 500 }
    );
  }
}

