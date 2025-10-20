import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for product update
const productUpdateSchema = z.object({
  name: z.string().min(1, 'Product name is required').optional(),
  description: z.string().optional(),
  shortName: z.string().optional(),
  fileName: z.string().optional(),
  minimumYear: z.number().int().min(0).max(50).optional(),
  maximumYear: z.number().int().min(0).max(50).optional(),
  riskType: z.enum(['CONSERVATIVE', 'RISK_AWARE', 'OPPORTUNITY_ORIENTED']).optional(),
  aiModel: z.string().min(1, 'AI model is required').optional(),
  aiPrompt: z.string().min(1, 'AI prompt is required').optional(),
  vectorId: z.string().optional(),
}).refine((data) => {
  // Ensure minimumYear <= maximumYear if both are provided
  if (data.minimumYear !== undefined && data.maximumYear !== undefined) {
    return data.minimumYear <= data.maximumYear;
  }
  return true;
}, {
  message: "Minimum year must be less than or equal to maximum year",
  path: ["minimumYear"],
});

// GET - Get a single product by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            productSuggestions: true,
            aiSettings: true,
          },
        },
        aiSettings: {
          select: {
            id: true,
            prompt: true,
            model: true,
            vectorId: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT - Update a product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validatedData = productUpdateSchema.parse(body);

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Separate product data from AI settings data
    const { aiModel, aiPrompt, vectorId, ...productData } = validatedData;

    // Update product and AI settings in a transaction
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Update the product
      await tx.product.update({
        where: { id },
        data: productData,
      });

      // Update or create AI settings if provided
      if (aiModel !== undefined || aiPrompt !== undefined || vectorId !== undefined) {
        // First, find existing active AI setting
        const existingAiSetting = await tx.aISettings.findFirst({
          where: { productId: id, isActive: true },
        });

        if (existingAiSetting) {
          // Update existing AI setting
          await tx.aISettings.update({
            where: { id: existingAiSetting.id },
            data: {
              ...(aiModel !== undefined && { model: aiModel }),
              ...(aiPrompt !== undefined && { prompt: aiPrompt }),
              ...(vectorId !== undefined && { vectorId: vectorId || null }),
            },
          });
        } else if (aiModel && aiPrompt) {
          // Create new AI setting if model and prompt are provided
          await tx.aISettings.create({
            data: {
              model: aiModel,
              prompt: aiPrompt,
              vectorId: vectorId || null,
              productId: id,
              isActive: true,
            },
          });
        }
      }

      // Return updated product with AI settings
      return await tx.product.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              productSuggestions: true,
              aiSettings: true,
            },
          },
          aiSettings: {
            select: {
              id: true,
              model: true,
              prompt: true,
              vectorId: true,
              isActive: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            productSuggestions: true,
            aiSettings: true,
          },
        },
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if product has dependencies
    if (existingProduct._count.productSuggestions > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete product with existing suggestions. Please remove all suggestions first.' 
        },
        { status: 400 }
      );
    }

    // Delete related AI settings first
    if (existingProduct._count.aiSettings > 0) {
      await prisma.aISettings.deleteMany({
        where: { productId: id },
      });
    }

    // Delete the product
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}