import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for main product prompt creation/update
const mainProductPromptSchema = z.object({
  vectorId: z.string().optional(),
  aiModel: z.string().min(1, 'AI model is required').default('gpt-5'),
  mcpUrl: z.string().url().optional().or(z.literal('')),
  mainPrompt: z.string().min(1, 'Main prompt is required'),
});

// GET - List all main product prompts with pagination and search
export async function GET(request: NextRequest) {
  try {
    const cookie = (await cookies()).get('session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId) {
      return NextResponse.json({ message: 'Not authenticated', success: false }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: Record<string, unknown> = {};
    
    if (search) {
      whereClause.OR = [
        { aiModel: { contains: search, mode: 'insensitive' } },
        { mainPrompt: { contains: search, mode: 'insensitive' } },
        { vectorId: { contains: search, mode: 'insensitive' } },
        { mcpUrl: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [mainProductPrompts, totalCount] = await Promise.all([
      prisma.mainProductPrompt.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.mainProductPrompt.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        mainProductPrompts,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching main product prompts:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST - Create a new main product prompt
export async function POST(request: NextRequest) {
  try {
    const cookie = (await cookies()).get('session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId) {
      return NextResponse.json({ message: 'Not authenticated', success: false }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = mainProductPromptSchema.parse(body);

    // Handle empty string for mcpUrl
    const processedData = {
      ...validatedData,
      mcpUrl: validatedData.mcpUrl === '' ? null : validatedData.mcpUrl,
    };

    // Create main product prompt
    const mainProductPrompt = await prisma.mainProductPrompt.create({
      data: processedData,
    });

    return NextResponse.json({
      success: true,
      data: mainProductPrompt,
      message: 'Main product prompt created successfully',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating main product prompt:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}