import { NextResponse } from 'next/server';
import { saveChatMessage } from '@/lib/chat';
import { Role } from '@/types';
import { prisma } from '@/lib/prisma';

// POST: Save a single chat message to the DB (used by V2 voice session)
export async function POST(req: Request) {
  try {
    const { sessionId, threadId, role, content } = await req.json();

    if (!content || !role || (!sessionId && !threadId)) {
      return NextResponse.json({ message: 'content, role, and sessionId or threadId are required' }, { status: 400 });
    }

    const resolvedThreadId = threadId ?? (await prisma.thread.findUnique({
      where:  { qaSessionId: sessionId },
      select: { id: true },
    }))?.id;

    if (!resolvedThreadId) {
      return NextResponse.json({ message: 'Thread not found' }, { status: 404 });
    }

    const existingMessages = await prisma.message.count({ where: { threadId: resolvedThreadId } });
    const messageRole = role === 'user' ? Role.customer : Role.assistant;

    await saveChatMessage(messageRole, content, resolvedThreadId, existingMessages);

    return NextResponse.json({ success: true, threadId: resolvedThreadId });
  } catch (error) {
    console.error('[chat/message] error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
