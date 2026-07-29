import { NextResponse } from 'next/server';
import { saveChatMessage } from '@/lib/chat';
import { Role } from '@/types';
import { prisma } from '@/lib/prisma';

// POST: Save a single chat message to the DB (used by the voice session)
export async function POST(req: Request) {
  try {
    const { sessionId, threadId, role, content } = await req.json();

    if (!content || !role || (!sessionId && !threadId)) {
      return NextResponse.json({ message: 'content, role, and sessionId or threadId are required' }, { status: 400 });
    }

    // Resolve-or-CREATE. The voice session starts recording its transcript in Phase 1, long before
    // /api/phase/chat/init runs at the Phase 1→2 advance — so requiring a pre-existing thread meant
    // the whole of Phase 1 was silently dropped. Upserting here removes that ordering dependency:
    // whichever message comes first creates the thread.
    // See private-documents/after-demo/TRANSCRIPT_PERSISTENCE_PLAN.md.
    const resolvedThreadId = threadId ?? (await prisma.thread.upsert({
      where:  { qaSessionId: sessionId },
      update: {},
      create: { qaSessionId: sessionId },
      select: { id: true },
    })).id;

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
