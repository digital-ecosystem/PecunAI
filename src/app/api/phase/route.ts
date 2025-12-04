import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AuthService } from "@/lib/auth";

// export async function GET(req: NextRequest) {
//   try {
//     const cookieStore = await cookies();
//     const token = cookieStore.get('auth-token')?.value;

//     if (!token) {
//       return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
//     }

//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get('id');

//     if (!id) {
//       return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
//     }

//     const user = await AuthService.getUserFromToken(token);
//     if (!user) {
//       return NextResponse.json({ message: "Invalid token" }, { status: 401 });
//     }

//     // Find the DRAFT session
//     const session = await prisma.qASession.findFirst({
//       where: { userId: user.id, id: id },
//       orderBy: { id: "asc" }
//     });

//     let answers: Record<string, string> = {};
//     if (session) {
//       const answerRows = await prisma.answer.findMany({
//         where: { qaSessionId: session.id }
//       });
//       // eslint-disable-next-line @typescript-eslint/no-unused-vars
//       answers = answerRows.reduce((acc, ans) => {
//         acc[ans.questionId] = ans.value;
//         return acc;
//       }, {} as Record<string, string>);
//     }

//     const questions = await prisma.question.findMany({
//       include: { options: true },
//       orderBy: { questionOrder: "asc" }
//     });

//     return NextResponse.json({ success: true, questions, answers });
//   } catch (error) {
//     console.error("Fetch sessions error:", error);
//     return NextResponse.json({ message: "Failed to fetch sessions", success: false }, { status: 500 });
//   }
// }

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ message: "Nicht authentifiziert" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const user = await AuthService.getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ message: "Ungültiges Token" }, { status: 401 });
    }

    let questions = [];
    let answers: Record<string, string> = {};

    if (id) {
      // Find the session
      const session = await prisma.qASession.findFirst({
        where: { userId: user.id, id: id },
        orderBy: { id: "asc" }
      });

      // Fetch all questions from main table
      const allQuestions = await prisma.question.findMany({
        include: { options: true },
        orderBy: { questionOrder: "asc" }
      });

      if (session) {
        // Fetch answers for this session
        const answerRows = await prisma.answer.findMany({
          where: { qaSessionId: session.id }
        });

        // Map answered questions
        const answeredQuestions = allQuestions.filter(q =>
          answerRows.some(a => a.questionId === q.id)
        );

        // Map answers
        answers = answerRows.reduce((acc, ans) => {
          acc[ans.questionId] = ans.value;
          return acc;
        }, {} as Record<string, string>);

        // Get unanswered questions (exclude those already answered)
        const unansweredQuestions = allQuestions.filter(q =>
          !answerRows.some(a => a.questionId === q.id)
        );

        // Combine: answered first, then unanswered, up to 15 total
        questions = [
          ...answeredQuestions,
          ...unansweredQuestions.slice(0, 15 - answeredQuestions.length)
        ].slice(0, 15); // Ensure max 15

      } else {
        // No session found, just return first 15 questions from main table
        questions = allQuestions.slice(0, 15);
      }

      return NextResponse.json({ success: true, questions, answers, currentPhase: session?.phase || 'TERMS1', sessionStatus: session?.status });
    } else {
      // No session id, just return first 15 questions from main table
      const allQuestions = await prisma.question.findMany({
        include: { options: true },
        orderBy: { questionOrder: "asc" }
      });
      questions = allQuestions.slice(0, 15);

      return NextResponse.json({ success: true, questions });
    }
  } catch (error) {
    console.error("Fetch sessions error:", error);
    return NextResponse.json({ message: "Sitzungen konnten nicht abgerufen werden", success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ message: "Nicht authentifiziert" }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ message: "Ungültiges Token" }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, phase } = body;

    if (!sessionId || !phase) {
      return NextResponse.json({ error: 'Sitzungs-ID oder Phase fehlt' }, { status: 400 });
    }

    // Update the session phase
    const updatedSession = await prisma.qASession.update({
      where: { 
        id: sessionId,
        userId: user.id // Ensure user owns this session
      },
      data: { phase }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Phase erfolgreich aktualisiert",
      currentPhase: updatedSession.phase 
    });

  } catch (error) {
    console.error("Update phase error:", error);
    return NextResponse.json({ message: "Phase konnte nicht aktualisiert werden", success: false }, { status: 500 });
  }
}