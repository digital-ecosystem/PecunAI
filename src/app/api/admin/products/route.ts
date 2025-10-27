import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for product creation/update
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  shortName: z.string().optional(),
  fileName: z.string().optional(),
  minimumYear: z.number().int().min(0).max(50).optional(),
  maximumYear: z.number().int().min(0).max(50).optional(),
  riskType: z.enum(['CONSERVATIVE', 'RISK_AWARE', 'OPPORTUNITY_ORIENTED']).optional(),
  aiModel: z.string().min(1, 'AI model is required').default('gpt-4'),
  aiPrompt: z.string().min(1, 'AI prompt is required'),
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

// GET - List all products with pagination and search
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
    const riskType = searchParams.get('riskType') || '';

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: Record<string, unknown> = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (riskType && riskType !== 'all' && ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'].includes(riskType)) {
      whereClause.riskType = riskType;
    }

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        products,
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
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = productSchema.parse(body);

    // Separate product data from AI settings data
    const { aiModel, aiPrompt, vectorId, ...productData } = validatedData;

    // Create product with AI settings in a transaction
    const product = await prisma.$transaction(async (tx) => {
      // Create the product
      const newProduct = await tx.product.create({
        data: productData,
      });

      // Create AI settings for the product
      await tx.aISettings.create({
        data: {
          model: aiModel,
          prompt: aiPrompt,
          vectorId: vectorId || null,
          productId: newProduct.id,
          isActive: true,
        },
      });

      // Return product with AI settings included
      return await tx.product.findUnique({
        where: { id: newProduct.id },
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
      data: product,
      message: 'Product created successfully',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}