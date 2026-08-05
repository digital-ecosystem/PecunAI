import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AuthService } from "@/lib/auth";

// Full-name construction shared with /api/admin/dashboard and /api/advisor/dashboard.
type NamedPerson = { firstName: string; lastName: string };
const fullName = (person: NamedPerson) => `${person.firstName} ${person.lastName}`.trim();

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    

    const user = await AuthService.getUserFromToken(token);
    // console.log("🚀 ~ GET ~ user:", user)
    if (!user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const searchTerm = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'all';

    // Build where clause
    const where: Record<string, string | object | number> = { userId: user.id };
    
    // Add status filter
    if (statusFilter !== 'all') {
      where.status = statusFilter;
    }

    // Add search filter
    if (searchTerm) {
      where.OR = [
        {
          user: {
            name: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        },
        {
          user: {
            email: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        }
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.qASession.count({ where });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch paginated sessions
    const rawSessions = await prisma.qASession.findMany({
      where,
      include: {
        user: true,
        personalInfo: true,
        agent: { select: { id: true, firstName: true, lastName: true, agentCode: true } },
        // Narrow select on purpose: Partner rows carry a password hash, email and phone.
        // Only the two name columns are read, and the relation is stripped below — the
        // response carries the constructed `partnerName` string and nothing else.
        partner: { select: { firstName: true, lastName: true } },
        // Only needed to derive isBlocked below — stripped before responding.
        workflowState: { select: { stepData: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    });

    // Flatten stepData.sessionBlocked to a plain boolean and drop the blob. Shipping raw stepData
    // would send the voice resume state and Phase 6 chat transcripts to the browser for up to 1000
    // sessions per request — far more than the client needs to decide whether to open the
    // "session blocked" modal. See private-documents/after-demo/SESSION_BLOCKED_STEPDATA_PLAN.md.
    const sessions = rawSessions.map(({ workflowState, partner, ...session }) => ({
      ...session,
      isBlocked: !!(workflowState?.stepData as Record<string, unknown> | null)?.sessionBlocked,
      // Same construction as /api/admin/dashboard and /api/advisor/dashboard.
      // `partnerId` is non-nullable on QASession, so `partner` is always present here.
      partnerName: fullName(partner),
    }));

    // console.log("🚀 ~ GET ~ sessions:", sessions)

    return NextResponse.json({ 
      success: true, 
      sessions,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    console.error("Fetch sessions error:", error);
    return NextResponse.json({ message: "Failed to fetch sessions", success: false }, { status: 500 });
  }
}