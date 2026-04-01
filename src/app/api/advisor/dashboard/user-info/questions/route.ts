import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    const cookie = (await cookies()).get('advisor_session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId || session?.role !== 'partner') {
      return NextResponse.json({ message: 'Nicht authentifiziert', success: false }, { status: 401 });
    }

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Fehlende Sitzungs-ID' }, { status: 400 });
    }

    const ownedSession = await prisma.qASession.findUnique({
      where: { id: sessionId },
      select: { id: true, partnerId: true },
    });

    if (!ownedSession || ownedSession.partnerId !== session.userId) {
      return NextResponse.json({ success: false, message: 'Nicht berechtigt' }, { status: 403 });
    }

    const questions = await prisma.question.findMany({
      orderBy: { questionOrder: 'asc' },
      include: {
        options: {
          orderBy: { id: 'asc' },
        },
        answers: {
          where: { qaSessionId: sessionId },
          select: { value: true },
        },
      },
    });

    const formatted = questions.map((q) => ({
      id: Number(q.id),
      text: q.text,
      options: q.options.map((opt) => ({
        label: opt.label,
        value: opt.value,
      })),
      selectedValue: q.answers[0]?.value ?? null,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error('[GET /api/advisor/dashboard/user-info/questions]', error);
    return NextResponse.json({ success: false, error: 'Serverfehler' }, { status: 500 });
  }
}
