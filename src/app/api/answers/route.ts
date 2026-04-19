import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '@/lib/auth';
import { cookies } from 'next/headers';

// Cached at module level — question orders never change, avoids a lookup on every request
let _volumeQuestionMap: Record<string, 'oneTimeVolume' | 'recurringVolume'> | null = null;

async function getVolumeQuestionMap(): Promise<Record<string, 'oneTimeVolume' | 'recurringVolume'>> {
  if (_volumeQuestionMap) return _volumeQuestionMap;
  const questions = await prisma.question.findMany({
    where: { questionOrder: { in: [18, 19] } },
    select: { id: true, questionOrder: true },
  });
  _volumeQuestionMap = Object.fromEntries(
    questions.map((q) => [q.id, q.questionOrder === 18 ? 'oneTimeVolume' : 'recurringVolume'] as const)
  );
  return _volumeQuestionMap;
}

export async function POST(request: Request) {
  try {

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Fehlende ID' }, { status: 400 });
    }

    const { questionId, answer, question, options, questionType } = await request.json();
    if (!questionId || answer === undefined || answer === null) {
      return NextResponse.json({ message: 'Frage-ID oder Antwort fehlt' }, { status: 400 });
    }
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ message: "Nicht authentifiziert" }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ message: "Ungültiges Token" }, { status: 401 });
    }

    const session = await prisma.qASession.findFirst({
      where: { userId: user.id, id: id },
      orderBy: { id: "asc" }
    });

    if (!session) {
      return NextResponse.json({ message: "Keine aktive Sitzung gefunden" }, { status: 404 });
    }

    const sessionId = session.id;
    const volumeQuestionMap = await getVolumeQuestionMap();

    // If client clears an input, delete the stored answer (idempotent)
    if (typeof answer === 'string' && answer.trim() === '') {
      await prisma.answer.deleteMany({ where: { qaSessionId: sessionId, questionId } });

      // Also clear the corresponding volume field if this was a volume question
      if (questionId in volumeQuestionMap) {
        await prisma.qASession.update({
          where: { id: sessionId },
          data: { [volumeQuestionMap[questionId]]: null },
        });
      }

      return NextResponse.json({ success: true, deleted: true });
    }

    const newAnswer = await prisma.answer.upsert({
      where: {
        qaSessionId_questionId: {
          qaSessionId: sessionId,
          questionId: questionId,
        }
      },
      update: {
        value: answer,
        questionText: question,
        questionType,
        questionOptions: options,
        // updatedAt will be set automatically if using @updatedAt
      },
      create: {
        // Generate a new UUID for the answer ID
        id: uuidv4(),
        qaSessionId: sessionId,
        questionId,
        value: answer,
        questionText: question,
        questionType,
        questionOptions: options,
        // createdAt will be set automatically if using @default(now())
      }
    });

    // await prisma.qASession.update({
    //   where: { id: sessionId },
    //   data: {
    //     updatedAt: new Date()
    //   }
    // });

    // // Log the creation of a new answer
    // await prisma.answerHistory.create({
    //   data: {
    //     id: uuidv4(),
    //     qaSessionId: sessionId,
    //     questionId,
    //     value: answer,
    //     questionText: question,
    //     questionOptions: options,
    //     // createdAt will be set automatically if using @default(now())
    //   }
    // });

    // Sync investment volume fields directly onto QASession
    if (questionId in volumeQuestionMap) {
      const field = volumeQuestionMap[questionId];
      const parsed = Number(answer);
      await prisma.qASession.update({
        where: { id: sessionId },
        data: { [field]: isNaN(parsed) ? null : parsed },
      });
    }

    return NextResponse.json({ success: true, answer: newAnswer });
  } catch (error) {
    console.error('Error saving answer:', error);
    return NextResponse.json({ success: false, message: 'Interner Serverfehler' }, { status: 500 });
  }
}