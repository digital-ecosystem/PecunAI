import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AuthService } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) return NextResponse.json({ message: "Nicht authentifiziert" }, { status: 401 });

    const user = await AuthService.getUserFromToken(token);
    if (!user) return NextResponse.json({ message: "Ungültiger Token" }, { status: 401 });

    const { sessionId } = await params;

    // Verify the session belongs to this user
    const session = await prisma.qASession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session) return NextResponse.json({ message: "Sitzung nicht gefunden" }, { status: 404 });
    if (session.userId !== user.id) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 403 });

    // All related records have onDelete: Cascade — one delete cleans everything
    await prisma.qASession.delete({ where: { id: sessionId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/qa-session/[sessionId]]", err);
    return NextResponse.json({ message: "Fehler beim Löschen" }, { status: 500 });
  }
}
