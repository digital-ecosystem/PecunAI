import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AuthService } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";

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

    // The database row is gone, but the session's generated PDFs are not — contract documents and
    // signed copies live on disk under private-documents/<sessionId>/. Leaving them behind means a
    // "deleted" session still has the customer's signed contract and legitimation on the server,
    // which is the opposite of what deleting is for.
    //
    // Best-effort on purpose: the row is already deleted and re-running would 404, so a filesystem
    // problem must not turn a successful delete into a 500. It is logged instead.
    //
    // sessionId reached here only after findUnique matched it, so it is a real uuid from the
    // database and cannot contain traversal segments — but the shape is asserted anyway, because
    // this value is being concatenated into an rm -r.
    if (/^[0-9a-fA-F-]{36}$/.test(sessionId)) {
      try {
        const dir = path.join(process.cwd(), "private-documents", sessionId);
        await fs.rm(dir, { recursive: true, force: true });
      } catch (fsErr) {
        console.error(`[DELETE /api/qa-session/${sessionId}] row deleted, file cleanup failed`, fsErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/qa-session/[sessionId]]", err);
    return NextResponse.json({ message: "Fehler beim Löschen" }, { status: 500 });
  }
}
