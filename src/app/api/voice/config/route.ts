import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AuthService } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) return NextResponse.json({ message: "Nicht authentifiziert" }, { status: 401 });
  const user = await AuthService.getUserFromToken(token);
  if (!user) return NextResponse.json({ message: "Ungültiges Token" }, { status: 401 });

  const prompt = await prisma.mainProductPrompt.findFirst({
    select: { vectorId: true },
  });
  return NextResponse.json({ termsVectorId: prompt?.vectorId ?? null });
}
