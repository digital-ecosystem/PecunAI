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

    const body = await request.json();
    // Destructure all fields from PersonalInfo schema and document fields
    const {
      actsOnOwnAccount,
      city,
      currentProfession,
      customerClassification,
      education,
      email,
      firstName,
      houseNumber,
      industry,
      isPep,
      lastName,
      maritalStatus,
      nationality,
      countryCode,
      phone,
      placeOfBirth,
      postalCode,
      residenceAbroad,
      street,
      dateOfBirth,
      documentType,
      issuingAuthority,
      documentNumber,
      issuedOn,
      validUntil,
      filename,
      occupation,
    } = body;

    // Ensure dateOfBirth is ISO string
    const dateOfBirthISO = dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined;

    const updatedOrCreatedUser = await prisma.personalInfo.upsert({
      where: { qaSessionId: id },
      update: {
        actsOnOwnAccount,
        city,
        currentProfession,
        customerClassification,
        education,
        email,
        firstName,
        houseNumber,
        industry,
        isPep,
        lastName,
        maritalStatus,
        nationality,
        ...(countryCode ? { countryCode } : {}),
        phone,
        placeOfBirth,
        postalCode,
        residenceAbroad,
        street,
        ...(dateOfBirthISO ? { dateOfBirth: dateOfBirthISO } : {})
      },
      create: {
        qaSessionId: id,
        actsOnOwnAccount,
        city,
        currentProfession,
        customerClassification,
        education,
        email,
        firstName,
        houseNumber,
        industry,
        isPep,
        lastName,
        maritalStatus,
        nationality,
        ...(countryCode ? { countryCode } : {}),
        phone,
        placeOfBirth,
        postalCode,
        residenceAbroad,
        street,
        dateOfBirth: dateOfBirthISO ? dateOfBirthISO : new Date().toISOString() // Default to now if not provided
      }
    });

    // Save document details (create or update)
    if (documentType && issuingAuthority && documentNumber && issuedOn && validUntil) {
      // Find personalInfoId
      const personalInfoId = updatedOrCreatedUser.id;
      // Upsert document (if you want to avoid duplicates, use unique fields)
      // Find the document by unique fields first
      const existingDocument = await prisma.document.findFirst({
        where: {
          documentNumber: documentNumber,
          personalInfoId: personalInfoId
        }
      });

      await prisma.document.upsert({
        where: {
          id: existingDocument ? existingDocument.id : 0 // Use 0 if not found, will trigger create
        },
        update: {
          documentType,
          issuingAuthority,
          issuedOn: new Date(issuedOn),
          validUntil: new Date(validUntil),
          filename: filename || ''
        },
        create: {
          documentType,
          issuingAuthority,
          documentNumber,
          issuedOn: new Date(issuedOn),
          validUntil: new Date(validUntil),
          filename: filename || '',
          personalInfoId
        }
      });
    }

    // Save the Occupation details if provided
    if (occupation) {
      // Find personalInfoId
      const personalInfoId = updatedOrCreatedUser.id;
      // Upsert document (if you want to avoid duplicates, use unique fields)
      // Find the document by unique fields first
      const existingJob = await prisma.previousJob.findFirst({
        where: {
          personalInfoId: personalInfoId
        }
      });
      await prisma.previousJob.upsert({
        where: {
          id: existingJob ? existingJob.id : 0 // Use 0 if not found, will trigger create
        },
        update: {
          jobTitle: occupation,
        },
        create: {
          jobTitle: occupation,
          personalInfoId: personalInfoId,
          // Add required fields with sensible defaults to satisfy the Prisma type
          startDate: new Date(),
          endDate: new Date(),
          companyName: ""
        }
      });
    }

    return NextResponse.json({ success: true, user: updatedOrCreatedUser });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ success: false, message: "Failed to update user" }, { status: 500 });
  }
}