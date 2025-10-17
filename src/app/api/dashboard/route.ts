import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AuthService } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(token);
    console.log("🚀 ~ GET ~ user:", user)
    if (!user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const sessions = await prisma.qASession.findMany({
      where: { userId: user.id },
      include: { user: true, personalInfo: true },
      orderBy: { createdAt: "desc" }
    });
    console.log("🚀 ~ GET ~ sessions:", sessions)

    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error("Fetch sessions error:", error);
    return NextResponse.json({ message: "Failed to fetch sessions", success: false }, { status: 500 });
  }
}