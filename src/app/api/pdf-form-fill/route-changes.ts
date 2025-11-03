import { createFormDataFromUser, FormFieldData, PDFFormFiller } from '@/utils/pdfFormFiller';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from "fs";
import { PDFDocument } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userInfo,
      additionalData = {},
      pdfPath,
      options = { flattenForm: true, debugMode: false }
    } = body;

    if (!userInfo) {
      return NextResponse.json(
        { success: false, error: 'User information is required' },
        { status: 400 }
      );
    }

    // Use provided path or default to the static PDF
    const finalPdfPath = pdfPath || path.join(process.cwd(), 'public/static-pdf/4money_protokoll_PecunAI_v1.pdf');
    const existingPdfBytes = fs.readFileSync(finalPdfPath);

    console.log('📄 Filling PDF form:', finalPdfPath);

    // Load and fill the PDF
    const pdfDoc = await PDFDocument.load(existingPdfBytes, options);

    // 3️⃣ Get the form inside
    const form = pdfDoc.getForm();

    const formData = createFormDataFromUser(userInfo, additionalData as FormFieldData);

    // 4️⃣ Fill the form fields
    // 🔹 4. Iterate through all fields and fill dynamically
    for (const [name, value] of Object.entries(formData)) {
      console.log("🚀 ~ POST ~ name, value:", name, value)
      try {
        if (typeof value === 'boolean') {
          const checkBox = form.getCheckBox(name);
          if (value) {
            checkBox.check();
          } else {
            checkBox.uncheck();
          }
        } else {
          const textField = form.getTextField(name);
          textField.setText(String(value));
        }
      } catch (err) {
        console.log("🚀 ~ POST ~ err:", err)
        console.warn(`Field not found: ${name}`);
      }
    }
    
    // List all checkbox field names
const checkBoxNames = [
  "Kontrollkästchen 478", "Kontrollkästchen 25", "Kontrollkästchen 26",
  "Kontrollkästchen 27", "Kontrollkästchen 28", "Kontrollkästchen 31",
  "Kontrollkästchen 32", "Kontrollkästchen 33", "Kontrollkästchen 34",
  "Kontrollkästchen 35", "Kontrollkästchen 36", "Kontrollkästchen 37",
  "Kontrollkästchen 38", "Kontrollkästchen 39", "Kontrollkästchen 40",
  "Kontrollkästchen 41", "Kontrollkästchen 42", "Kontrollkästchen 43",
  "Kontrollkästchen 45", "Kontrollkästchen 46", "Kontrollkästchen 47",
  "Kontrollkästchen 48", "Kontrollkästchen 49", "Kontrollkästchen 50",
  "Kontrollkästchen 51", "Kontrollkästchen 437", "Kontrollkästchen 52",
  "Kontrollkästchen 53", "Kontrollkästchen 54", "Kontrollkästchen 55",
  "Kontrollkästchen 56", "Kontrollkästchen 57", "Kontrollkästchen 58",
  "Kontrollkästchen 59", "Kontrollkästchen 60", "Kontrollkästchen 61",
  "Kontrollkästchen 62", "Kontrollkästchen 63", "Kontrollkästchen 64",
  "Kontrollkästchen 65", "Kontrollkästchen 66", "Kontrollkästchen 67",
  "Kontrollkästchen 68", "Kontrollkästchen 69", "Kontrollkästchen 70",
  "Kontrollkästchen 71", "Kontrollkästchen 72", "Kontrollkästchen 73",
  "Kontrollkästchen 74", "Kontrollkästchen 75", "Kontrollkästchen 76",
  "Kontrollkästchen 77", "Kontrollkästchen 78", "Kontrollkästchen 79",
  "Kontrollkästchen 438", "Kontrollkästchen 439", "Kontrollkästchen 440",
  "Kontrollkästchen 441", "Kontrollkästchen 442", "Kontrollkästchen 443",
  "Kontrollkästchen 86", "Kontrollkästchen 87", "Kontrollkästchen 88",
  "Kontrollkästchen 100", "Kontrollkästchen 101", "Kontrollkästchen 102",
  "Kontrollkästchen 103", "Kontrollkästchen 104", "Kontrollkästchen 516",
  "Kontrollkästchen 517", "Kontrollkästchen 518", "Kontrollkästchen 519",
  "Kontrollkästchen 520", "Kontrollkästchen 521", "Kontrollkästchen 522",
  "Kontrollkästchen 523", "Kontrollkästchen 524", "Kontrollkästchen 525",
  "Kontrollkästchen 526", "Kontrollkästchen 527", "Kontrollkästchen 528",
  "Kontrollkästchen 529", "Kontrollkästchen 530", "Kontrollkästchen 531",
  "Kontrollkästchen 532", "Kontrollkästchen 533", "Kontrollkästchen 534",
  "Kontrollkästchen 535", "Kontrollkästchen 536", "Kontrollkästchen 537",
  "Kontrollkästchen 538", "Kontrollkästchen 539", "Kontrollkästchen 540",
  "Kontrollkästchen 541", "Kontrollkästchen 542", "Kontrollkästchen 543",
  "Kontrollkästchen 544", "Kontrollkästchen 545", "Kontrollkästchen 107",
  "Kontrollkästchen 108", "Kontrollkästchen 370", "Kontrollkästchen 371",
  "Kontrollkästchen 372", "Kontrollkästchen 373", "Kontrollkästchen 374",
  "Kontrollkästchen 375", "Kontrollkästchen 376", "Kontrollkästchen 377",
  "Kontrollkästchen 378", "Kontrollkästchen 462", "Kontrollkästchen 463",
  "Kontrollkästchen 445", "Kontrollkästchen 446", "Kontrollkästchen 447",
  "Kontrollkästchen 448", "Kontrollkästchen 449", "Kontrollkästchen 450",
  "Kontrollkästchen 451", "Kontrollkästchen 452", "Kontrollkästchen 453",
  "Kontrollkästchen 454", "Kontrollkästchen 455", "Kontrollkästchen 456",
  "Kontrollkästchen 457", "Kontrollkästchen 458", "Kontrollkästchen 459",
  "Kontrollkästchen 460", "Kontrollkästchen 461", "Kontrollkästchen 512",
  "Kontrollkästchen 513", "Kontrollkästchen 466", "Kontrollkästchen 467",
  "Kontrollkästchen 397", "Kontrollkästchen 398", "Kontrollkästchen 399",
  "Kontrollkästchen 400", "Kontrollkästchen 401", "Kontrollkästchen 402",
  "Kontrollkästchen 403", "Kontrollkästchen 404", "Kontrollkästchen 405",
  "Kontrollkästchen 406", "Kontrollkästchen 407", "Kontrollkästchen 408",
  "Kontrollkästchen 409", "Kontrollkästchen 410", "Kontrollkästchen 411",
  "Kontrollkästchen 412", "Kontrollkästchen 413", "Kontrollkästchen 414",
  "Kontrollkästchen 415", "Kontrollkästchen 416", "Kontrollkästchen 417",
  "Kontrollkästchen 418", "Kontrollkästchen 419", "Kontrollkästchen 420",
  "Kontrollkästchen 421", "Kontrollkästchen 436"
];

// Check all checkboxes (ignore missing ones gracefully)
checkBoxNames.forEach(name => {
  try {
    form.getCheckBox(name).check();
  } catch {
    console.warn(`Checkbox not found: ${name}`);
  }
});


    form.flatten();

    // 9️⃣ Save filled PDF
    const pdfBytes = await pdfDoc.save();
    const debugPath = path.join(process.cwd(), 'public/example-pdf/filled_debug_2025.pdf');

    fs.writeFileSync(debugPath, pdfBytes);

    return NextResponse.json({
      success: true,
      pdfBase64: pdfBytes,
      message: 'PDF form filled successfully'
    });

  } catch (error) {
    console.error('❌ Error filling PDF form:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fill PDF form'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'fields') {
      // Get form field information
      const pdfPath = searchParams.get('pdfPath') ||
        path.join(process.cwd(), 'public/static-pdf/4money_protokoll_PecunAI_v1.pdf');

      const filler = await PDFFormFiller.loadFromFile(pdfPath, { debugMode: true });
      const fieldNames = filler.getFieldNames();
      const fieldInfo = filler.getFieldInfo();

      return NextResponse.json({
        success: true,
        fieldNames,
        fieldInfo
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ Error processing request:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process request'
      },
      { status: 500 }
    );
  }
}