import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, buildDateWhere, SessionStatus } from '../_lib';

type ProductAccum = {
  productId: string;
  name: string;
  shortName: string;
  cases: number;
  approvedCases: number;
  oneTime: number;
  recurring: number;
};

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const sessionWhere = {
      ...buildDateWhere(searchParams.get('from'), searchParams.get('to')),
      productSuggestions: { isNot: null },
    };

    const sessions = await prisma.qASession.findMany({
      where: sessionWhere,
      select: {
        status: true,
        oneTimeVolume: true,
        recurringVolume: true,
        productSuggestions: {
          select: { productId: true, name: true, shortName: true },
        },
      },
    });

    const productMap: Record<string, ProductAccum> = {};

    for (const s of sessions) {
      if (!s.productSuggestions) continue;
      const { productId, name, shortName } = s.productSuggestions;

      if (!productMap[productId]) {
        productMap[productId] = { productId, name, shortName: shortName ?? '', cases: 0, approvedCases: 0, oneTime: 0, recurring: 0 };
      }

      productMap[productId].cases++;

      if (s.status === SessionStatus.APPROVED) {
        productMap[productId].approvedCases++;
        productMap[productId].oneTime += Number(s.oneTimeVolume ?? 0);
        productMap[productId].recurring += Number(s.recurringVolume ?? 0);
      }
    }

    const data = Object.values(productMap)
      .map(({ approvedCases, ...p }) => ({
        ...p,
        approvalRate: p.cases > 0 ? Math.round((approvedCases / p.cases) * 100) : 0,
      }))
      .sort((a, b) => b.cases - a.cases);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Performance products error:', error);
    return NextResponse.json({ success: false, error: 'Interner Serverfehler' }, { status: 500 });
  }
}
