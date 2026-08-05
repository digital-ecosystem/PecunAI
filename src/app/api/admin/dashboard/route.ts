import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";

/** Both Agent and Partner store the name as separate `firstName` / `lastName` columns. */
type NamedPerson = { firstName: string; lastName: string };

/** `${firstName} ${lastName}` — the full-name construction this app already uses for
 *  agents and Berater elsewhere (customer dashboard, performance rankings). */
const fullName = (person: NamedPerson) => `${person.firstName} ${person.lastName}`.trim();

export async function GET() {
  try {
    const cookie = (await cookies()).get('admin_session')?.value;
    const session = await decrypt(cookie);
    console.log("🚀 ~ GET ~ session:", session)

    if (!session?.userId || session?.role !== 'admin') {
      return NextResponse.json({ message: 'Nicht authentifiziert', success: false }, { status: 401 });
    }

    const rows = await prisma.qASession.findMany({
      include: {
        user: true,
        answers: true,
        personalInfo: true,
        workflowState: true,
        // Names only, and deliberately not spread into the response below: Partner also
        // carries a password hash and Agent carries roster fields the dashboard has no
        // use for. Only the two constructed names leave this endpoint.
        agent: { select: { firstName: true, lastName: true } },
        partner: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" }
    });

    const sessions = rows.map(({ agent, partner, ...session }) => ({
      ...session,
      // agentId is nullable on QASession, so a session may have no agent; partnerId is
      // required, so `partner` is always a real row and partnerName always a real name.
      agentName: agent ? fullName(agent) : null,
      partnerName: fullName(partner),
    }));

    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error("Fetch sessions error:", error);
    return NextResponse.json({ message: 'Sitzungen konnten nicht abgerufen werden', success: false }, { status: 500 });
  }
}