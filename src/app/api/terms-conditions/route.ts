// src/app/api/terms-conditions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// export async function GET(request: NextRequest) {
//   console.log("🚀 ~ GET ~ request:", request)
//   try {
//     // const searchParams = request.nextUrl.searchParams
//     // const excludeId = searchParams.get('id')

//     let termsCondition;

//     // if (excludeId) {
//     //   // Fetch a record that does NOT match the given ID
//     //   const allTerms = await prisma.termsAndConditions.findMany({
//     //     where: {
//     //       // id: {
//     //       //   not: excludeId
//     //       // },
//     //       isActive: true // Only fetch active terms
//     //     }
//     //   })

//     //   if (allTerms.length === 0) {
//     //     return NextResponse.json(
//     //       { 
//     //         error: 'No other Terms and Conditions found',
//     //         message: 'All available terms have been excluded' 
//     //       },
//     //       { status: 404 }
//     //     )
//     //   }

//     //   // Return a random record from the filtered results
//     //   const randomIndex = Math.floor(Math.random() * allTerms.length)
//     //   termsCondition = allTerms[randomIndex]
//     // } else {
//     // No ID provided - return a random active Terms and Conditions
//     const allTerms = await prisma.termsAndConditions.findMany({
//       where: {
//         isActive: true
//       }
//     })

//     if (allTerms.length === 0) {
//       return NextResponse.json(
//         {
//           error: 'No Terms and Conditions found',
//           message: 'No active terms and conditions in the database'
//         },
//         { status: 404 }
//       )
//     }

//     // Return a random record
//     // const randomIndex = Math.floor(Math.random() * allTerms.length)
//     // const termsCondition = allTerms[randomIndex]
//     if (allTerms.length >= 2) {
//       const firstIndex = Math.floor(Math.random() * allTerms.length);

//       // Remove the first picked element to avoid duplicates
//       const remainingTerms = allTerms.filter((_, idx) => idx !== firstIndex);

//       const secondIndex = Math.floor(Math.random() * remainingTerms.length);

//       termsCondition = [allTerms[firstIndex], remainingTerms[secondIndex]];
//     } else {
//       // Handle case where less than 2 records exist
//       termsCondition = [...allTerms]; // or handle differently
//     }

//     // }

//     return NextResponse.json({
//       success: true,
//       data: termsCondition
//     })

//   } catch (error) {
//     console.error('Terms and Conditions API Error:', error)
//     return NextResponse.json(
//       {
//         error: 'Failed to fetch Terms and Conditions',
//         message: error instanceof Error ? error.message : 'Unknown error'
//       },
//       { status: 500 }
//     )
//   }
// }

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    let termsCondition = [];

    if (sessionId) {
      // Get all acceptance records for this session
      const acceptanceRecords = await prisma.sessionTermsAcceptance.findMany({
        where: { qaSessionId: sessionId },
        include: { terms: true }
      });

      const allTerms = await prisma.termsAndConditions.findMany({
        where: { isActive: true }
      });

      if (allTerms.length === 0) {
        return NextResponse.json(
          {
            error: 'No Terms and Conditions found',
            message: 'No active terms and conditions in the database'
          },
          { status: 404 }
        );
      }

      if (acceptanceRecords.length === 1) {
        // Find a main table record that is not the accepted one
        const acceptedTermsId = acceptanceRecords[0].termsId;
        acceptanceRecords[0].id = acceptanceRecords[0].termsId; // Overwrite ID to match main table record ID
        const otherTerms = allTerms.filter(term => term.id !== acceptedTermsId);

        // Pick one other record (e.g., the first one)
        const secondRecord = otherTerms.length > 0 ? otherTerms[0] : null;

        // Return the acceptance record and the other main table record
        termsCondition = secondRecord
          ? [acceptanceRecords[0], secondRecord]
          : [acceptanceRecords[0]];
      } else if (acceptanceRecords.length > 1) {
        // Overwrite ID to match main table record ID
        acceptanceRecords.forEach(record => { record.id = record.termsId; });
        // If more than one acceptance, return all acceptance records
        termsCondition = acceptanceRecords;
      } else {
        // If no acceptance, return all active terms
        termsCondition = allTerms;
      }
    } else {
      // No session_id, return all active terms
      const allTerms = await prisma.termsAndConditions.findMany({
        where: { isActive: true }
      });

      if (allTerms.length === 0) {
        return NextResponse.json(
          {
            error: 'No Terms and Conditions found',
            message: 'No active terms and conditions in the database'
          },
          { status: 404 }
        );
      }

      termsCondition = allTerms;
    }

    return NextResponse.json({
      success: true,
      data: termsCondition
    });
  } catch (error) {
    console.error('Terms and Conditions API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch Terms and Conditions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Optional: Add additional endpoints for specific operations

// Get Terms by Type
// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json()
//     const { termsType, excludeId } = body

//     const whereClause: any = {
//       isActive: true
//     }

//     if (termsType) {
//       whereClause.termsType = termsType
//     }

//     if (excludeId) {
//       whereClause.id = { not: excludeId }
//     }

//     const allTerms = await prisma.termsAndConditions.findMany({
//       where: whereClause
//     })

//     if (allTerms.length === 0) {
//       return NextResponse.json(
//         { 
//           error: 'No Terms and Conditions found',
//           message: 'No matching terms found with the given criteria' 
//         },
//         { status: 404 }
//       )
//     }

//     // Return a random record from the filtered results
//     const randomIndex = Math.floor(Math.random() * allTerms.length)
//     const termsCondition = allTerms[randomIndex]

//     return NextResponse.json({
//       success: true,
//       data: termsCondition
//     })

//   } catch (error) {
//     console.error('Terms and Conditions API Error:', error)
//     return NextResponse.json(
//       { 
//         error: 'Failed to fetch Terms and Conditions',
//         message: error instanceof Error ? error.message : 'Unknown error'
//       },
//       { status: 500 }
//     )
//   }
// }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      qaSessionId,
      termsId,
      termsType,
      title,
      content,
      version,
      ipAddress,
      userAgent
    } = body;

    // Basic validation (add more as needed)
    if (!qaSessionId || !termsId || !termsType || !title || !content || !version) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check for existing acceptance record
    const existing = await prisma.sessionTermsAcceptance.findFirst({
      where: {
        qaSessionId,
        termsId
      }
    });

    if (existing) {
      // Return existing record, do not insert duplicate
      return NextResponse.json({
        success: true,
        data: existing,
        message: 'Acceptance already exists'
      });
    }

    const termsExists = await prisma.termsAndConditions.findUnique({
      where: { id: termsId }
    });
    if (!termsExists) {
      return NextResponse.json(
        { error: 'Invalid termsId: Terms and Conditions not found' },
        { status: 400 }
      );
    }

    // Save to SessionTermsAcceptance
    const acceptance = await prisma.sessionTermsAcceptance.create({
      data: {
        qaSessionId,
        termsId,
        termsType,
        title,
        content,
        version,
        ipAddress,
        userAgent
      }
    });

    return NextResponse.json({
      success: true,
      data: acceptance
    });
  } catch (error) {
    console.error('SessionTermsAcceptance POST Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save Terms and Conditions acceptance',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}