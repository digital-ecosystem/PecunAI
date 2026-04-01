import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET - Get product suggestions based on answers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const duration = searchParams.get('duration');
    const risk = searchParams.get('risk');

    // If no parameters provided, return random product (legacy behavior)
    if (!duration || !risk) {
      const count = await prisma.product.count();
      if (count === 0) {
        return NextResponse.json({ error: 'Keine Produkte gefunden', success: false }, { status: 404 });
      }
      const randomIndex = Math.floor(Math.random() * count);
      const product = await prisma.product.findFirst({
        skip: randomIndex,
      });
      return NextResponse.json({ product, success: true });
    }

    // Parse duration to number
    const durationValue = parseInt(duration);
    if (isNaN(durationValue)) {
      return NextResponse.json({ error: 'Ungültige Dauer', success: false }, { status: 400 });
    }

    // Special handling for duration 0 (Liquidity+)
    if (durationValue === 0) {
      console.log('🔍 Duration is 0, fetching VVKN0 Liquidity+');
      const liquidityProduct = await prisma.product.findFirst({
        where: {
          minimumYear: 0,
          maximumYear: 0
        },
        include: {
          aiSettings: {
            where: { isActive: true },
            select: {
              id: true,
              model: true,
              prompt: true,
              vectorId: true,
            }
          }
        }
      });

      if (liquidityProduct) {
        const suggestion = {
          id: liquidityProduct.id,
          name: liquidityProduct.shortName || liquidityProduct.name,
          fullName: liquidityProduct.name,
          description: liquidityProduct.description,
          fileName: liquidityProduct.fileName,
          from: liquidityProduct.minimumYear || 0,
          to: liquidityProduct.maximumYear || 0,
          risk: 'Konservativ', // Always conservative for Liquidity+
          riskType: liquidityProduct.riskType,
          aiSettings: liquidityProduct.aiSettings[0] || null,
          score: 100
        };

        return NextResponse.json({
          success: true,
          data: suggestion,
          alternatives: [] // No alternatives for 0 duration
        });
      }
    }

    // Map risk to database enum values
    let riskType: string;
    switch (risk) {
      case 'KONSERVATIV':
        riskType = 'KONSERVATIV';
        break;
      case 'AUSGEWOGEN':
        riskType = 'AUSGEWOGEN';
        break;
      case 'GEWINNORIENTIERT':
        riskType = 'GEWINNORIENTIERT';
        break;
      default:
        // Handle invalid risk gracefully or return error
        return NextResponse.json({ error: 'Ungültiger Risikotyp', success: false }, { status: 400 });
    }

    // Initialize search parameters
    let searchDuration = durationValue;
    let searchRisk = riskType;

    console.log('🔍 Original parameters:', { durationValue, riskType });

    /**
     * GAP FILLING LOGIC (Parameter Remapping)
     * Maps unsupported Duration/Risk combinations to the nearest valid product criteria.
     */

    // Case 1: 1-2 Years + Growth (GEWINNORIENTIERT) -> Remap to Balanced (AUSGEWOGEN)
    // Target: VVKN2 (Balanced, 1-2y)
    if (durationValue >= 1 && durationValue <= 2 && riskType === 'GEWINNORIENTIERT') {
      searchRisk = 'AUSGEWOGEN';
      console.log('🔄 Remapping: 1-2y Growth -> Balanced');
    }

    // Case 2: 3-4 Years + Conservative OR Growth -> Remap to Balanced (AUSGEWOGEN)
    // Target: VVKN3 (Balanced, 3-4y)
    if (durationValue >= 3 && durationValue <= 4 && (riskType === 'KONSERVATIV' || riskType === 'GEWINNORIENTIERT')) {
      searchRisk = 'AUSGEWOGEN';
      console.log(`🔄 Remapping: 3-4y ${riskType} -> Balanced`);
    }

    // Case 3: 5-7 Years + Conservative -> Remap to Balanced and cap duration at 4
    // Target: VVKN3 (Balanced, 3-4y)
    if (durationValue >= 5 && durationValue <= 7 && riskType === 'KONSERVATIV') {
      searchRisk = 'AUSGEWOGEN';
      searchDuration = 4; // Force into VVKN3 range
      console.log('🔄 Remapping: 5-7y Conservative -> 4y Balanced');
    } else if (riskType === 'KONSERVATIV' && durationValue > 7) {
      searchRisk = 'AUSGEWOGEN';
      searchDuration = 4; // Force into VVKN3 range
      console.log('🔄 Remapping: 8-9y Conservative -> 4y Balanced');
    }

    // Case 4: AUSGEWOGEN + 5+ years -> VVKN4 (Future)
    // VVKN4 and VVKN5 are both stored as GEWINNORIENTIERT, but VVKN5 is the 7+ (Dream Big) product.
    // To ensure AUSGEWOGEN never selects VVKN5, we force the duration into 5–6 when remapping.
    if (riskType === 'AUSGEWOGEN' && durationValue >= 5) {
      searchRisk = 'GEWINNORIENTIERT';
      searchDuration = durationValue >= 7 ? 6 : durationValue;
      console.log(`🔄 Remapping: ${durationValue}y Balanced -> ${searchDuration}y Growth (Future)`);
    }

    // Case 5: 8-9 Years + Growth (GEWINNORIENTIERT) -> Cap duration at 7
    // Target: VVKN4 (Growth, 5-7y)
    if (durationValue >= 8 && durationValue <= 9 && riskType === 'GEWINNORIENTIERT') {
      searchDuration = 7; // Force into VVKN4 range
      console.log('🔄 Remapping: 8-9y Growth -> 7y Growth');
    } else if (riskType === 'GEWINNORIENTIERT' && durationValue > 9) {
      searchDuration = 7; // Force into VVKN4 range
      console.log('🔄 Remapping: 10-12y Growth -> 7y Growth');
    }

    console.log('🔍 Final Search parameters:', { searchDuration, searchRisk });

    // Find products where the duration falls within their min/max year range
    const products = await prisma.product.findMany({
      where: {
        riskType: searchRisk as 'KONSERVATIV' | 'AUSGEWOGEN' | 'GEWINNORIENTIERT',
        AND: [
          {
            OR: [
              { minimumYear: null },
              { minimumYear: { lte: searchDuration } }
            ]
          },
          {
            OR: [
              { maximumYear: null },
              { maximumYear: { gte: searchDuration } }
            ]
          }
        ]
      },
      include: {
        aiSettings: {
          where: { isActive: true },
          select: {
            id: true,
            model: true,
            prompt: true,
            vectorId: true,
          }
        }
      },
      orderBy: [
        { minimumYear: 'desc' }, // Prefer products starting later (often higher tier) if multiple match
      ]
    });

    console.log('🔍 Found products:', products.length);
    // console.log("products : ", products);

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'Keine Produkte gefunden, die den Kriterien entsprechen'
      });
    }

    // The best match is the first one (due to sorting or just being the valid one)
    const bestProduct = products[0];

    console.log('🎯 Best product match:', {
      name: bestProduct.name,
      shortName: bestProduct.shortName,
      minimumYear: bestProduct.minimumYear,
      maximumYear: bestProduct.maximumYear,
      riskType: bestProduct.riskType
    });

    // Format the response to match the Portfolio interface expected by frontend
    const suggestion = {
      id: bestProduct.id,
      name: bestProduct.shortName || bestProduct.name,
      fullName: bestProduct.name,
      description: bestProduct.description,
      fileName: bestProduct.fileName,
      from: bestProduct.minimumYear || 0,
      to: bestProduct.maximumYear || 100,
      risk: riskType === 'KONSERVATIV' ? 'Konservativ' :
        riskType === 'AUSGEWOGEN' ? 'Ausgewogen' : 'Gewinnorientiert',
      riskType: bestProduct.riskType,
      aiSettings: bestProduct.aiSettings[0] || null,
      score: 100, // exact match
      sri: bestProduct.sri,
      duration: bestProduct.duration
    };

    console.log('🚀 ~ GET ~ suggestion:', suggestion);

    return NextResponse.json({
      success: true,
      data: suggestion,
      alternatives: products.slice(1, 4).map(p => ({
        id: p.id,
        name: p.shortName || p.name,
        fullName: p.name,
        description: p.description,
        fileName: p.fileName,
        from: p.minimumYear || 0,
        to: p.maximumYear || 100,
        risk: riskType === 'KONSERVATIV' ? 'Konservativ' :
          riskType === 'AUSGEWOGEN' ? 'Ausgewogen' : 'Gewinnorientiert',
        riskType: p.riskType,
        aiSettings: p.aiSettings[0] || null,
        score: 90 // alternative match
      }))
    });

  } catch (error) {
    console.error('Error fetching product suggestions:', error);
    return NextResponse.json(
      { success: false, error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
