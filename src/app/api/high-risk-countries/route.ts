import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const countries = await prisma.highRiskCountry.findMany({
      select: {
        name: true,
        code: true,
      },
    });
    return NextResponse.json(countries);
  } catch (error) {
    console.error("Error fetching high-risk countries:", error);
    return NextResponse.json(
      { error: "Hochrisikoländer konnten nicht abgerufen werden" },
      { status: 500 }
    );
  }
}
