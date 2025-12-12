import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Fehlende ID' }, { status: 400 });
    }

    const { questionId, answer, question, options, questionType } = await request.json();
    if (!questionId || !answer) {
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

    return NextResponse.json({ success: true, answer: newAnswer });
  } catch (error) {
    console.error('Error saving answer:', error);
    return NextResponse.json({ success: false, message: 'Interner Serverfehler' }, { status: 500 });
  }
}