import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AuthService } from "@/lib/auth";

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
    const sessions = await prisma.qASession.findMany({
      where,
      include: { user: true, personalInfo: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    });

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