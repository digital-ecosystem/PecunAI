import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for product update
const productUpdateSchema = z.object({
  name: z.string().min(1, 'Produktname ist erforderlich').optional(),
  description: z.string().optional(),
  shortName: z.string().optional(),
  fileName: z.string().optional(),
  minimumYear: z.number().int().min(0).max(1000).optional(),
  maximumYear: z.number().int().min(0).max(1000).optional(),
  riskType: z.enum(['KONSERVATIV', 'AUSGEWOGEN', 'GEWINNORIENTIERT']).optional(),
  aiModel: z.string().min(1, 'KI-Modell ist erforderlich').optional(),
  aiPrompt: z.string().min(1, 'KI-Prompt ist erforderlich').optional(),
  firstMessage: z.string().min(1, 'Erste Nachricht ist erforderlich'),
  vectorId: z.string().optional(),
}).refine((data) => {
  // Ensure minimumYear <= maximumYear if both are provided
  if (data.minimumYear !== undefined && data.maximumYear !== undefined) {
    return data.minimumYear <= data.maximumYear;
  }
  return true;
}, {
  message: "Mindestjahr muss kleiner oder gleich dem Maximaljahr sein",
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
            firstMessage: true,
            vectorId: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Produkt nicht gefunden' },
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
      { success: false, error: 'Interner Serverfehler' },
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
        { success: false, error: 'Produkt nicht gefunden' },
        { status: 404 }
      );
    }

    // Separate product data from AI settings data
    const { aiModel, aiPrompt, vectorId, firstMessage, ...productData } = validatedData;

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
              ...(firstMessage !== undefined && { firstMessage: firstMessage }),
              ...(vectorId !== undefined && { vectorId: vectorId || null }),
            },
          });
        } else if (aiModel && aiPrompt) {
          // Create new AI setting if model and prompt are provided
          await tx.aISettings.create({
            data: {
              model: aiModel,
              prompt: aiPrompt,
              firstMessage: firstMessage,
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
              firstMessage: true,
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
      message: 'Produkt erfolgreich aktualisiert',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues);
      return NextResponse.json(
        { success: false, error: 'Validierungsfehler', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: 'Interner Serverfehler' },
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
        { success: false, error: 'Produkt nicht gefunden' },
        { status: 404 }
      );
    }

    // Check if product has dependencies
    if (existingProduct._count.productSuggestions > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Produkt kann nicht gelöscht werden, da Vorschläge existieren. Bitte entfernen Sie zuerst alle Vorschläge.'
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
      message: 'Produkt erfolgreich gelöscht',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}