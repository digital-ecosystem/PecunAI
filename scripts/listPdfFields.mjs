import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const pdfPath = path.join(process.cwd(), 'public', 'static-pdf', 'Depoteröffnungsantrag.pdf');

try {
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields().map(f => ({ name: f.getName(), type: f.constructor.name }));
  console.log('PDF path:', pdfPath);
  console.log('Field count:', fields.length);
  fields.forEach((f, i) => console.log(`${i + 1}. ${f.name} (${f.type})`));
} catch (err) {
  console.error('Error reading PDF:', err);
  process.exit(1);
}
