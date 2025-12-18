import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const cookie = (await cookies()).get('admin_session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId || session?.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, message: 'Session ID ist erforderlich' }, { status: 400 });
    }

    // Get the thread for this session
    const thread = await prisma.thread.findUnique({
      where: { qaSessionId: sessionId },
    });

    if (!thread) {
      return NextResponse.json({ 
        success: true, 
        messages: [],
        message: 'Keine Unterhaltung gefunden' 
      });
    }

    // Get all messages for this thread
    const messages = await prisma.message.findMany({
      where: { threadId: thread.id },
      orderBy: { messageIndex: 'asc' },
      include: {
        audioFile: true,
      },
    });

    return NextResponse.json({
      success: true,
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt,
        index: msg.messageIndex,
        audioFileId: msg.audioFileId,
        audioFile: msg.audioFile
          ? {
              id: msg.audioFile.id,
              fileName: msg.audioFile.fileName,
              transcript: msg.audioFile.transcript,
            }
          : undefined,
      })),
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { success: false, message: 'Fehler beim Abrufen der Nachrichten' },
      { status: 500 }
    );
  }
}

