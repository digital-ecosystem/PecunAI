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

    // Map duration to years
    let minYear = 0, maxYear = 100;
    // switch (duration) {
    //   case duration:
    //     minYear = 0;
    //     maxYear = 2;
    //     break;
    //   case 'medium_term':
    //     minYear = 3;
    //     maxYear = 6;
    //     break;
    //   case 'long_term':
    //     minYear = 7;
    //     maxYear = 10;
    //     break;
    //   case 'very_long_term':
    //     minYear = 11;
    //     maxYear = 100;
    //     break;
    // }

    if (Number(duration) <= 3) {
      minYear = 0;
      maxYear = 3;
    } else if (Number(duration) > 3 && Number(duration) < 5) {
      minYear = 3;
      maxYear = 5;
    } else if (Number(duration) >= 5 && Number(duration) < 7) {
      minYear = 5;
      maxYear = 7;
    } else if (Number(duration) >= 7) {
      minYear = 7;
      maxYear = 100;
    }

    // Map risk to database enum values
    let riskType: string;
    switch (risk) {
      case 'conservative':
        riskType = 'CONSERVATIVE';
        break;
      case 'risk_aware':
        riskType = 'RISK_AWARE';
        break;
      case 'opportunity_oriented':
        riskType = 'OPPORTUNITY_ORIENTED';
        break;
      default:
        riskType = 'CONSERVATIVE';
    }

    console.log('🔍 Mapped parameters:', { minYear, maxYear, riskType });

    // Find products that match the criteria
    const products = await prisma.product.findMany({
      where: {
        riskType: riskType as 'CONSERVATIVE' | 'RISK_AWARE' | 'OPPORTUNITY_ORIENTED',
        AND: [
          {
            OR: [
              { minimumYear: null },
              { minimumYear: { lte: maxYear } }
            ]
          },
          {
            OR: [
              { maximumYear: null },
              { maximumYear: { gte: minYear } }
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
        { minimumYear: 'asc' },
        { maximumYear: 'asc' }
      ]
    });

    console.log('🔍 Found products:', products.length);

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'Keine Produkte gefunden, die den Kriterien entsprechen'
      });
    }

    // Score products based on how well they match the criteria
    const scoredProducts = products.map(product => {
      let score = 0;
      
      // Perfect risk match gets high score
      if (product.riskType === riskType) {
        score += 100;
      }

      // Calculate distance from ideal duration range
      const productMinYear = product.minimumYear || 0;
      const productMaxYear = product.maximumYear || 100;
      
      // Check overlap with requested range
      const overlapMin = Math.max(minYear, productMinYear);
      const overlapMax = Math.min(maxYear, productMaxYear);
      
      if (overlapMin <= overlapMax) {
        // There's an overlap, score based on how much overlap
        const overlapSize = overlapMax - overlapMin + 1;
        const requestedRangeSize = maxYear - minYear + 1;
        const overlapRatio = overlapSize / requestedRangeSize;
        score += overlapRatio * 50; // Up to 50 points for overlap
      }

      // Prefer products that start earlier (more conservative approach)
      score += (10 - productMinYear) * 2; // Bonus for earlier start

      return {
        ...product,
        score
      };
    });

    // Sort by score and pick the best match
    scoredProducts.sort((a, b) => b.score - a.score);
    const bestProduct = scoredProducts[0];

    console.log('🎯 Best product match:', {
      name: bestProduct.name,
      shortName: bestProduct.shortName,
      score: bestProduct.score,
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
      risk: riskType === 'CONSERVATIVE' ? 'Konservativ' : 
            riskType === 'RISK_AWARE' ? 'Ausgewogen' : 'Gewinnorientiert',
      riskType: bestProduct.riskType,
      aiSettings: bestProduct.aiSettings[0] || null,
      score: bestProduct.score
    };

    return NextResponse.json({
      success: true,
      data: suggestion,
      alternatives: scoredProducts.slice(1, 4).map(p => ({
        id: p.id,
        name: p.shortName || p.name,
        fullName: p.name,
        description: p.description,
        fileName: p.fileName,
        from: p.minimumYear || 0,
        to: p.maximumYear || 100,
        risk: riskType === 'CONSERVATIVE' ? 'Konservativ' : 
              riskType === 'RISK_AWARE' ? 'Ausgewogen' : 'Gewinnorientiert',
        riskType: p.riskType,
        aiSettings: p.aiSettings[0] || null,
        score: p.score
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
