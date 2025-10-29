import fs from "fs";
import { PDFDocument, StandardFonts } from "pdf-lib";

async function fillPecunAIPdf() {
  // 1️⃣ Load the original PDF
  const existingPdfBytes = fs.readFileSync("./4money_protokoll_PecunAI_v1.pdf");

  // 2️⃣ Load it into pdf-lib
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // 3️⃣ Get the form inside
  const form = pdfDoc.getForm();

  const fields = form.getFields().map(f => f.getName())

  console.log("📝 PDF Form Fields:", fields);

  // 4️⃣ Fill text fields (update names if needed after inspecting actual field names)
  form.getTextField("vorname").setText("Bassem");
  form.getTextField("Name, Gebdatum").setText("Bassem Mahdi , 15.05.1985");
  form.getCheckBox("Kontrollkästchen 478").check();

  

  // 8️⃣ Flatten the form (so fields can’t be changed later)
  form.flatten();

  // 9️⃣ Save filled PDF
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync("./4money_filled.pdf", pdfBytes);

  console.log("✅ PDF filled and saved as 4money_filled.pdf");
}

fillPecunAIPdf().catch(console.error);
