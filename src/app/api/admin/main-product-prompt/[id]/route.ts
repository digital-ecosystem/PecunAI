import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for main product prompt update
const mainProductPromptUpdateSchema = z.object({
  vectorId: z.string().optional(),
  aiModel: z.string().min(1, 'AI model is required').optional(),
  mcpUrl: z.string().url().optional().or(z.literal('')),
  mainPrompt: z.string().min(1, 'Main prompt is required').optional(),
});

// GET - Get a single main product prompt by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookie = (await cookies()).get('session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId) {
      return NextResponse.json({ message: 'Not authenticated', success: false }, { status: 401 });
    }

    const { id } = await params;

    const mainProductPrompt = await prisma.mainProductPrompt.findUnique({
      where: { id },
    });

    if (!mainProductPrompt) {
      return NextResponse.json(
        { success: false, error: 'Main product prompt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mainProductPrompt,
    });
  } catch (error) {
    console.error('Error fetching main product prompt:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT - Update a main product prompt
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookie = (await cookies()).get('session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId) {
      return NextResponse.json({ message: 'Not authenticated', success: false }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validatedData = mainProductPromptUpdateSchema.parse(body);

    // Check if main product prompt exists
    const existingPrompt = await prisma.mainProductPrompt.findUnique({
      where: { id },
    });

    if (!existingPrompt) {
      return NextResponse.json(
        { success: false, error: 'Main product prompt not found' },
        { status: 404 }
      );
    }

    // Handle empty string for mcpUrl
    const processedData = {
      ...validatedData,
      mcpUrl: validatedData.mcpUrl === '' ? null : validatedData.mcpUrl,
    };

    // Update main product prompt
    const updatedMainProductPrompt = await prisma.mainProductPrompt.update({
      where: { id },
      data: processedData,
    });

    return NextResponse.json({
      success: true,
      data: updatedMainProductPrompt,
      message: 'Main product prompt updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating main product prompt:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a main product prompt
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookie = (await cookies()).get('session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId) {
      return NextResponse.json({ message: 'Not authenticated', success: false }, { status: 401 });
    }

    const { id } = await params;

    // Check if main product prompt exists
    const existingPrompt = await prisma.mainProductPrompt.findUnique({
      where: { id },
    });

    if (!existingPrompt) {
      return NextResponse.json(
        { success: false, error: 'Main product prompt not found' },
        { status: 404 }
      );
    }

    // Delete main product prompt
    await prisma.mainProductPrompt.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Main product prompt deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting main product prompt:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}