import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      qaSessionId,
      productId,
      name,
      shortName,
      description,
      fileName,
      suggestionReason,
      confidenceScore,
      isConfirmed,
      confirmedAt
    } = body;

    if (!qaSessionId || !productId || !name) {
      return NextResponse.json(
        { error: "Erforderliche Felder fehlen" },
        { status: 400 }
      );
    }

    // Check for existing suggestion
    const existing = await prisma.sessionProductSuggestion.findFirst({
      where: {
        qaSessionId,
      }
    });
    console.log("🚀 ~ POST ~ existing:", existing)

    let suggestion;
    if (existing) {
      // Update the existing record
      suggestion = await prisma.sessionProductSuggestion.update({
        where: { id: existing.id },
        data: {
          name,
          shortName,
          description,
          fileName,
          suggestionReason,
          confidenceScore,
          isConfirmed: isConfirmed ?? false,
          confirmedAt
        }
      });
    } else {
      // Create a new record
      suggestion = await prisma.sessionProductSuggestion.create({
        data: {
          qaSessionId,
          productId,
          name,
          shortName,
          description,
          fileName,
          suggestionReason,
          confidenceScore,
          isConfirmed: isConfirmed ?? false,
          confirmedAt
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: suggestion
    });
  } catch (error) {
    console.error("SessionProductSuggestion POST Error:", error);
    return NextResponse.json(
      {
        error: "Produktvorschlag konnte nicht gespeichert werden",
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qaSessionId = searchParams.get("qaSessionId");

    if (!qaSessionId) {
      return NextResponse.json(
        { error: "qaSessionId fehlt" },
        { status: 400 }
      );
    }

    const suggestion = await prisma.sessionProductSuggestion.findUnique({
      where: { qaSessionId },
      include: {
        product: true // Include full product details if needed
      }
    });

    if (!suggestion) {
      return NextResponse.json({
        success: true,
        data: null
      });
    }

    if (!suggestion.product) {
      return NextResponse.json({
        success: false,
        error: "Produkt nicht gefunden"
      }, { status: 404 });
    }

    // Transform to match Portfolio type if needed, or just return as is
    // The frontend expects a Portfolio-like object
    const portfolio = {
      // Map other fields as necessary based on what the frontend expects
      // For now, returning the suggestion data which includes product details
      ...suggestion,
      id: suggestion.product.id,
      name: suggestion.name || suggestion.product.shortName || suggestion.product.name,
      // Ensure we pass the product ID correctly
      productId: suggestion.productId,
      // Include sri and duration from the product
      sri: suggestion.product.sri || null,
      duration: suggestion.product.duration || null,
      // Include other product fields that might be needed
      fullName: suggestion.product.name,
      description: suggestion.product.description,
      fileName: suggestion.product.fileName,
      riskType: suggestion.product.riskType,
      from: suggestion.product.minimumYear || 0,
      to: suggestion.product.maximumYear || 100,
    };

    return NextResponse.json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    console.error("SessionProductSuggestion GET Error:", error);
    return NextResponse.json(
      {
        error: "Produktvorschlag konnte nicht abgerufen werden",
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      },
      { status: 500 }
    );
  }
}