// // app/api/user/info/[qaSessionId]/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
// // import { PrismaClient } from '@prisma/client';

// // const prisma = new PrismaClient();

// export async function GET(
//   req: Request,
//   { params }: { params: { qaSessionId: string } }
// ) {
//   const { qaSessionId } = params;

//   try {
//     const info = await prisma.personalInfo.findUnique({
//       where: { qaSessionId },
//       include: {
//         qaSession: true
//       }
//     });

//     // if (!info) {
//     //   return NextResponse.json(
//     //     { error: 'PersonalInfo not found' },
//     //     { status: 404 }
//     //   );
//     // }

//     return NextResponse.json({success: true, user: info});
//   } catch (error) {
//     console.error('Error fetching personalInfo:', error);
//     return NextResponse.json(
//       { error: 'Server error while fetching personalInfo' },
//       { status: 500 }
//     );
//   }
// }


export async function GET(
  req: Request,
  { params }: { params: Promise<{ qaSessionId: string }> }
) {
  const { qaSessionId } = await params;

  try {
    const info = await prisma.personalInfo.findUnique({
      where: { qaSessionId },
      include: {
        qaSession: true,
        documents: true,
        previousJobsRel: true,
      }
    });

    return NextResponse.json({ success: true, user: info });
  } catch (error) {
    console.error('Error fetching personalInfo:', error);
    return NextResponse.json(
      { error: 'Serverfehler beim Abrufen der persönlichen Informationen' },
      { status: 500 }
    );
  }
}