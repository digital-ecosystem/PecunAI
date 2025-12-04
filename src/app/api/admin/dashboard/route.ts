import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";

export async function GET() {
  try {
    const cookie = (await cookies()).get('session')?.value;
    const session = await decrypt(cookie);
    console.log("🚀 ~ GET ~ session:", session)

    if (!session?.userId || session?.role !== 'admin') {
      return NextResponse.json({ message: 'Nicht authentifiziert', success: false }, { status: 401 });
    }

    const sessions = await prisma.qASession.findMany({
      include: { user: true, answers: true, personalInfo: true },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error("Fetch sessions error:", error);
    return NextResponse.json({ message: 'Sitzungen konnten nicht abgerufen werden', success: false }, { status: 500 });
  }
}