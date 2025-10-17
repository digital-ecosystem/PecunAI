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
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check for existing suggestion
    const existing = await prisma.sessionProductSuggestion.findFirst({
      where: {
        qaSessionId,
        productId
      }
    });

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
        error: "Failed to save product suggestion",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}