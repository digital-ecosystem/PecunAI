import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { SessionStatus } from "@/types";
import { handleApiError } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ message: "Nicht authentifiziert" }, { status: 401 });
    }

    const { sessionId } = await request.json();

    await prisma.qASession.update({
      where: { id: sessionId }, // Replace with actual session ID
      data: {
        status: SessionStatus.PENDING, // Replace with actual status update
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}