// app/api/qa-session/create/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Benutzer-ID ist erforderlich' }, { status: 400 });
    }

    const newSession = await prisma.qASession.create({
      data: {
        userId: userId,
        status: 'DRAFT', // or 'PENDING' if needed
        phase: 'TERMS1', // initial phase
      },
    });

    return NextResponse.json({ success: true, session: newSession }, { status: 201 });
  } catch (error) {
    console.error('Failed to create QASession:', error);
    return NextResponse.json({ success: false, error: 'Interner Serverfehler' }, { status: 500 });
  }
}
