import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePDF } from "@/utils/pdfGenerator";
import { UserUpdate } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ success: false, message: "Missing sessionId" }, { status: 400 });
    }

    // Fetch all required data
    const terms = await prisma.sessionTermsAcceptance.findMany({
      where: { qaSessionId: sessionId },
      include: { terms: true }
    });
    const answers = await prisma.answer.findMany({
      where: { qaSessionId: sessionId },
      include: { question: true }
    });
    const productSuggestion = await prisma.sessionProductSuggestion.findFirst({
      where: { qaSessionId: sessionId }
    });
    const personalInfo = await prisma.personalInfo.findUnique({
      where: { qaSessionId: sessionId },
      include: { documents: true }
    });
    // You may also want to fetch signature info if available
    // const signature = await prisma.signedDocument.findUnique({ where: { qaSessionId: sessionId } });

    // Assemble phases according to requirements:
    // Phase 1: Terms and Conditions (use the first accepted record if any)
    const firstAcceptance = terms && terms.length > 0 ? terms[0] : null;
    const termsText = firstAcceptance ? (firstAcceptance.terms?.content || firstAcceptance.content) : '';
    const confirmationText = firstAcceptance ? `Confirmed at: ${firstAcceptance.acceptedAt?.toISOString?.() || firstAcceptance.acceptedAt}` : 'Not confirmed';

    // Prepare answers/questions ordering: first 3, then next 2 (no duplicates)
    // Sort answers by answeredAt (fallback to createdAt)
    const sortedAnswers = answers.sort((a, b) => {
      const ta = a.answeredAt?.getTime ? a.answeredAt.getTime() : new Date(a.answeredAt).getTime();
      const tb = b.answeredAt?.getTime ? b.answeredAt.getTime() : new Date(b.answeredAt).getTime();
      return ta - tb;
    });

    const qPhase2 = sortedAnswers.slice(0, 3).map(a => a.question);
    const qPhase4 = sortedAnswers.slice(3, 5).map(a => a.question);

    // Remove duplicates in case question objects repeat
    const uniqueQuestions = (arr: any[]) => {
      const seen = new Set();
      return arr.filter(q => {
        if (!q || !q.id) return false;
        if (seen.has(q.id)) return false;
        seen.add(q.id);
        return true;
      });
    };

    const questionsData = uniqueQuestions([...qPhase2, ...qPhase4]);

    // Build answers mapping
    const answersMap: Record<string, string> = {};
    for (const a of answers) {
      answersMap[a.questionId] = a.value;
    }

    // Product suggestion text
    const productDescription = productSuggestion ? `${productSuggestion.name}\n\n${productSuggestion.description || ''}` : '';

    // Personal info mapping to expected keys used by generatePDF
    const personalForPdf: UserUpdate = {
      first_name: personalInfo?.firstName || '',
      last_name: personalInfo?.lastName || '',
      // other fields may be included if needed
    };

    // Combine terms and confirmation into a header that will appear before the product description
    const combinedProductDescription = `Terms and Conditions:\n${termsText}\n\nConfirmation:\n${confirmationText}\n\nSuggested Product:\n${productDescription}`;

    // Call the PDF generator util
    const pdfDoc = await generatePDF(questionsData, answersMap, personalForPdf, combinedProductDescription);

    // Get ArrayBuffer from jsPDF and convert to base64
    // jsPDF supports output('arraybuffer')
    const arrayBuffer = pdfDoc.output && typeof pdfDoc.output === 'function' ? pdfDoc.output('arraybuffer') : null;
    if (!arrayBuffer) {
      return NextResponse.json({ success: false, message: 'PDF generation not supported in this environment' }, { status: 500 });
    }
    const buffer = Buffer.from(arrayBuffer as ArrayBuffer);
    const base64 = buffer.toString('base64');

    return NextResponse.json({ success: true, pdfBase64: base64 });
  } catch (error) {
    console.error("Error generating final PDF:", error);
    return NextResponse.json({ success: false, message: "Failed to generate PDF" }, { status: 500 });
  }
}
