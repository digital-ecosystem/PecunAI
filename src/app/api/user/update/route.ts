import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { AuthService } from "@/lib/auth";

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    const { first_name, last_name, age, dob } = await request.json();

    const updatedOrCreatedUser = await prisma.personalInfo.upsert({
      where: { qaSessionId: id },
      update: {
        firstName: first_name,
        lastName: last_name,
        age: age,
        dob: dob
      },
      create: {
        qaSessionId: id,
        firstName: first_name,
        lastName: last_name,
        age: age,
      }
    });


    return NextResponse.json({ success: true, user: updatedOrCreatedUser });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ success: false, message: "Failed to update user" }, { status: 500 });
  }
}