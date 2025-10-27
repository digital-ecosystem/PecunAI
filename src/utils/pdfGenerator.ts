// import jsPDF from 'jspdf';
// import html2canvas from 'html2canvas';
// import { PDFDocument } from 'pdf-lib';
// import { PersonalInfoFormData, Question, UserUpdate } from '@/types';

// // normalize an input (base64 string, ArrayBuffer, Uint8Array) to Uint8Array
// export function normalizeToUint8(input: ArrayBuffer | Uint8Array | string): Uint8Array {
//   if (typeof input === 'string') {
//     const b64 = input.replace(/^data:.*;base64,/, '');
//     const binary = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
//     const len = binary.length;
//     const bytes = new Uint8Array(len);
//     for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
//     return bytes;
//   }
//   return input instanceof Uint8Array ? input : new Uint8Array(input);
// }

// // convert a jsPDF instance to Uint8Array
// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// export function jsPdfToUint8(pdf: any): Uint8Array {
//   const ab = pdf.output('arraybuffer');
//   return new Uint8Array(ab);
// }

// export const generatePDFFromHTML = async (questionsData: Question[], personalInfo: UserUpdate, productDescription: string) => {
//   // Create HTML content
//   const htmlContent = `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <style>
//           body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
//           .page { min-height: 100vh; page-break-after: always; }
//           .page:last-child { page-break-after: avoid; }
//           h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
//           h2 { color: #555; margin-top: 30px; }
//           .question { margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; }
//           .question-text { font-weight: bold; margin-bottom: 8px; }
//           .answer { color: #007bff; font-weight: 500; }
//           .personal-info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
//           .info-item { padding: 10px; background: #f8f9fa; border-radius: 5px; }
//           .info-label { font-weight: bold; color: #333; }
//           .info-value { color: #666; margin-top: 5px; }
//           .signature-section { margin-top: 50px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
//           .signature-line { border-bottom: 1px solid #333; margin: 20px 0; height: 40px; }
//           .description { line-height: 1.6; text-align: justify; }
//         </style>
//       </head>
//       <body>
//         <!-- Page 1: Questions & Answers -->
//         <div class="page">
//           <h1>Product Discovery Survey</h1>
//           <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          
//           ${questionsData.map((question, index) => `
//             <div class="question">
//               <div class="question-text">${index + 1}. ${question.text}</div>
//               <div class="answer">Answer: ${'Not answered'}</div>
//             </div>
//           `).join('')}
//         </div>
        
//         <!-- Page 2: Personal Information -->
//         <div class="page">
//           <h1>Personal Information</h1>
          
//           <div class="personal-info">
//             <div class="info-item">
//               <div class="info-label">First Name</div>
//               <div class="info-value">${personalInfo.first_name || 'Not provided'}</div>
//             </div>
//             <div class="info-item">
//               <div class="info-label">Last Name</div>
//               <div class="info-value">${personalInfo.last_name || 'Not provided'}</div>
//             </div>
//             <div class="info-item">
//               <div class="info-label">Age</div>
//               <div class="info-value">${'Not provided'}</div>
//             </div>
//           </div>
          
//           <div class="signature-section">
//             <h2>Digital Signature</h2>
//             <div class="signature-line"></div>
//             <div style="display: flex; justify-content: space-between;">
//               <span>Signature</span>
//               <span>Date: ${new Date().toLocaleDateString()}</span>
//             </div>
//           </div>
//         </div>
        
//         <!-- Page 3: Product Description -->
//         <div class="page">
//           <h1>Recommended Product</h1>
//           <div class="description">
//             ${productDescription}
//           </div>
//         </div>
//       </body>
//       </html>
//     `;

//   // Convert HTML to PDF using html2canvas and jsPDF
//   const tempDiv = document.createElement('div');
//   tempDiv.innerHTML = htmlContent;
//   tempDiv.style.width = '210mm'; // A4 width
//   tempDiv.style.position = 'absolute';
//   tempDiv.style.left = '-9999px';
//   document.body.appendChild(tempDiv);

//   try {
//     const canvas = await html2canvas(tempDiv, {
//       scale: 2,
//       useCORS: true,
//       allowTaint: true,
//       backgroundColor: '#ffffff'
//     });

//     const pdf = new jsPDF('p', 'mm', 'a4');
//     const imgData = canvas.toDataURL('image/png');
//     const imgWidth = 210;
//     const imgHeight = (canvas.height * imgWidth) / canvas.width;

//     pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

//     document.body.removeChild(tempDiv);
//     return pdf;
//   } catch (error) {
//     document.body.removeChild(tempDiv);
//     throw error;
//   }
// };

// export const generatePDF = async (questionsData: Question[], answers: Record<string, string>, personalInfo: UserUpdate, productDescription: string) => {
//   const pdf = new jsPDF('p', 'mm', 'a4');
//   const pageWidth = pdf.internal.pageSize.getWidth();
//   const pageHeight = pdf.internal.pageSize.getHeight();
//   const margin = 20;

//   // Page 1: Questions & Answers
//   pdf.setFontSize(20);
//   pdf.setFont('helvetica', 'bold');
//   pdf.text('Product Discovery Survey', margin, 30);

//   pdf.setFontSize(12);
//   pdf.setFont('helvetica', 'normal');
//   pdf.text(`Date: ${new Date().toLocaleDateString()}`, margin, 45);

//   let yPosition = 60;

//   questionsData.forEach((question, index) => {
//     // Check if we need a new page
//     if (yPosition > pageHeight - 40) {
//       pdf.addPage();
//       yPosition = 30;
//     }

//     // Question
//     pdf.setFont('helvetica', 'bold');
//     pdf.setFontSize(12);
//     const questionText = `${index + 1}. ${question.text}`;
//     const questionLines = pdf.splitTextToSize(questionText, pageWidth - 2 * margin);
//     pdf.text(questionLines, margin, yPosition);
//     yPosition += questionLines.length * 6;

//     // Answer
//     pdf.setFont('helvetica', 'normal');
//     pdf.setFontSize(11);
//     // Get the selected answer value
//     const selectedValue = answers[question.id];
//     // Find the option label
//     const selectedOption = question.options.find(opt => opt.value === selectedValue);
//     const answerValue = selectedOption ? selectedOption.label : 'Not answered';

//     // const answerValue = answers[question.id] || 'Not answered';
//     const answerText = `Answer: ${answerValue}`;
//     // const answerText = `Answer: ${'Not answered'}`;
//     const answerLines = pdf.splitTextToSize(answerText, pageWidth - 2 * margin);
//     pdf.text(answerLines, margin + 5, yPosition);
//     yPosition += answerLines.length * 6 + 8;
//   });

//   // Page 2: Personal Information
//   pdf.addPage();
//   yPosition = 30;

//   pdf.setFontSize(20);
//   pdf.setFont('helvetica', 'bold');
//   pdf.text('Personal Information', margin, yPosition);
//   yPosition += 20;

//   pdf.setFontSize(12);
//   pdf.setFont('helvetica', 'normal');

//   const personalFields = [
//     { label: 'First Name', value: personalInfo.first_name },
//     { label: 'Last Name', value: personalInfo.last_name },
//     { label: 'Age', value: 0 },
//   ];

//   personalFields.forEach(field => {
//     if (field.value) {
//       pdf.setFont('helvetica', 'bold');
//       pdf.text(`${field.label}:`, margin, yPosition);
//       pdf.setFont('helvetica', 'normal');
//       pdf.text(String(field.value), margin + 40, yPosition);
//       yPosition += 12;
//     }
//   });

//   // Add signature section
//   yPosition += 20;
//   pdf.setFont('helvetica', 'bold');
//   pdf.text('Digital Signature:', margin, yPosition);
//   yPosition += 15;

//   // Signature line
//   pdf.line(margin, yPosition, pageWidth - margin, yPosition);
//   yPosition += 8;
//   pdf.setFont('helvetica', 'normal');
//   pdf.setFontSize(10);
//   pdf.text('Signature', margin, yPosition);
//   pdf.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin - 40, yPosition);

//   // Page 3: Product Description
//   pdf.addPage();
//   yPosition = 30;

//   pdf.setFontSize(20);
//   pdf.setFont('helvetica', 'bold');
//   pdf.text('Recommended Product', margin, yPosition);
//   yPosition += 20;

//   pdf.setFontSize(12);
//   pdf.setFont('helvetica', 'normal');

//   // Split the description into multiple lines
//   const descriptionLines = pdf.splitTextToSize(productDescription, pageWidth - 2 * margin);
//   pdf.text(descriptionLines, margin, yPosition);

//   return pdf;
// };

// export const generateFinalPDF = async (termsConditionsText: string, confirmationText: string, questionsData: Question[], answers: Record<string, string>, personalInfo: PersonalInfoFormData, productDescription: string, existingPdf?: ArrayBuffer | Uint8Array | string) => {
//   // header info for PDF (string URL or text). Set to '' to omit.
//   const headerPath = '';
//   const headerTitle = 'Product Discovery';

//   // helper to escape html
//   function escapeHtml(str: string) {
//     if (!str) return '';
//     return String(str)
//       .replace(/&/g, '&amp;')
//       .replace(/</g, '&lt;')
//       .replace(/>/g, '&gt;')
//       .replace(/"/g, '&quot;')
//       .replace(/'/g, '&#039;');
//   }

//   // helper to render HTML into PDF bytes (Uint8Array) using html2canvas + jsPDF with pagination
//   async function renderHtmlToPdfBytes(htmlContent: string) {
//     const tempDiv = document.createElement('div');
//     tempDiv.innerHTML = htmlContent;
//     // Use printable width (A4 width minus left/right margins)
//     const pageWidthMM = 210;
//     const pageHeightMM = 297;
//     const marginMM = 15; // change this value to increase/reduce margins
//     const printableWidthMM = pageWidthMM - 2 * marginMM;
//     tempDiv.style.width = `${printableWidthMM}mm`;
//     tempDiv.style.position = 'absolute';
//     tempDiv.style.left = '-9999px';
//     document.body.appendChild(tempDiv);

//     try {
//       const canvas = await html2canvas(tempDiv, {
//         scale: 2,
//         useCORS: true,
//         allowTaint: true,
//         backgroundColor: '#ffffff'
//       });

//       const pdf = new jsPDF('p', 'mm', 'a4');
//       const imgData = canvas.toDataURL('image/png');

//       // Use margins and printable area
//       const imgWidthMM = printableWidthMM; // canvas was rendered at printable width
//       const imgHeightMM = (canvas.height * imgWidthMM) / canvas.width;
//       const availablePageHeightMM = pageHeightMM - 2 * marginMM;

//       // If the image height fits on a single printable page, just add it with margins
//       if (imgHeightMM <= availablePageHeightMM) {
//         pdf.addImage(imgData, 'PNG', marginMM, marginMM, imgWidthMM, imgHeightMM);
//         // draw header (title/path) on the page
//         (function () { if (typeof drawHeader === 'function') drawHeader(pdf, headerTitle, headerPath, pageWidthMM, marginMM); })();
//       } else {
//         // number of vertical pages needed
//         const pageCount = Math.ceil(imgHeightMM / availablePageHeightMM);

//         // height of one page in canvas pixels (corresponding to availablePageHeightMM)
//         const canvasPageHeight = Math.floor((canvas.height / imgHeightMM) * availablePageHeightMM);

//         for (let i = 0; i < pageCount; i++) {
//           const y = i * canvasPageHeight;
//           // create a temporary canvas to hold the slice
//           const pageCanvas = document.createElement('canvas');
//           pageCanvas.width = canvas.width;
//           // last slice: may be shorter
//           pageCanvas.height = Math.min(canvasPageHeight, canvas.height - y);

//           const ctx = pageCanvas.getContext('2d');
//           if (!ctx) throw new Error('Could not get canvas context');

//           // draw the slice
//           ctx.drawImage(canvas, 0, y, canvas.width, pageCanvas.height, 0, 0, pageCanvas.width, pageCanvas.height);

//           const pageImgData = pageCanvas.toDataURL('image/png');
//           const pageImgHeightMM = (pageCanvas.height * imgWidthMM) / pageCanvas.width;

//           if (i > 0) pdf.addPage();
//           pdf.addImage(pageImgData, 'PNG', marginMM, marginMM, imgWidthMM, pageImgHeightMM);
//           // draw header on this page as well
//           (function () { if (typeof drawHeader === 'function') drawHeader(pdf, headerTitle, headerPath, pageWidthMM, marginMM); })();
//         }
//       }

//       document.body.removeChild(tempDiv);
//       const arr = pdf.output('arraybuffer');
//       return new Uint8Array(arr);
//     } catch (error) {
//       document.body.removeChild(tempDiv);
//       throw error;
//     }
//   }

//   // drawHeader remains as before (defined inside)
//   // helper to draw a header on each PDF page (uses mm units)
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   function drawHeader(pdf: any, title: string, path: string, pageWidthMM: number, marginMM: number) {
//     const y = Math.max(8, marginMM - 6); // vertical position for header text
//     pdf.setFontSize(12);
//     try { pdf.setFont('helvetica', 'bold'); } catch { /* ignore font errors */ }
//     pdf.text(String(title || ''), marginMM, y);

//     if (path) {
//       pdf.setFontSize(9);
//       try { pdf.setFont('helvetica', 'normal'); } catch { /* ignore */ }
//       const txtWidth = (pdf.getTextWidth && typeof pdf.getTextWidth === 'function') ? pdf.getTextWidth(String(path)) : 0;
//       const x = Math.max(marginMM, pageWidthMM - marginMM - txtWidth);
//       pdf.text(String(path), x, y);
//     }

//     // thin rule under header
//     pdf.setDrawColor(200);
//     pdf.setLineWidth(0.2);
//     pdf.line(marginMM, y + 2, pageWidthMM - marginMM, y + 2);
//   }

//   // Build the before HTML (phases 1..4)
//   const renderQuestion = (q: Question, idx: number) => {
//     const selectedValue = answers[q.id];
//     const selectedOption = q.options?.find(opt => opt.value === selectedValue);
//     const answerText = selectedOption ? selectedOption.label : (answers[q.id] || 'Not answered');
//     return `
//             <div class="questions">
//               <p><strong>Question ${idx}:</strong> ${escapeHtml(q.text)}</p>
//               <p><strong>Answer:</strong> ${escapeHtml(answerText)}</p>
//             </div>
//         `;
//   };

//   const qPhase2 = questionsData.slice(0, 3);
//   const qPhase4 = questionsData.slice(3, 5);

//   const htmlBefore = `
//     <!DOCTYPE html>
//     <html><head><meta charset="utf-8"/><style>body{font-family:Arial, sans-serif;margin:0;padding:10mm;} .section{margin-bottom:16px;} .questions{margin-left:8px;} .terms{white-space:pre-wrap;}</style></head><body>
//       <div class="section"><h1>1. Terms and Conditions</h1><div class="terms">${escapeHtml(termsConditionsText || 'No terms available')}</div></div>
//       <div class="section"><h2>2. Three Questions and Answers</h2>${qPhase2.map((q,i)=>renderQuestion(q,i+1)).join('')}</div>
//       <div class="section"><h2>3. Confirmation</h2><p>${escapeHtml(confirmationText || 'No confirmation available')}</p></div>
//       <div class="section"><h2>4. Two Questions and Answers</h2>${qPhase4.map((q,i)=>renderQuestion(q,i+1)).join('')}</div>
//     </body></html>`;

//   // Build the after HTML (phases 6..7: personal info + signature)
//   const htmlAfter = `
//     <!DOCTYPE html>
//     <html><head><meta charset="utf-8"/><style>body{font-family:Arial, sans-serif;margin:0;padding:10mm;} .section{margin-bottom:16px;}</style></head><body>
//       <div class="section"><h2>6. Personal Information</h2>
//         <p><strong>First Name:</strong> ${escapeHtml(personalInfo.firstName || '')}</p>
//         <p><strong>Last Name:</strong> ${escapeHtml(personalInfo.lastName || '')}</p>
//         <p><strong>Email:</strong> ${escapeHtml(personalInfo.email || '')}</p>
//         <p><strong>Phone:</strong> ${escapeHtml(personalInfo.phone || '')}</p>
//       </div>
//       <div class="section signature-section"><h2>7. Signature</h2><p>Please sign below to confirm your agreement:</p><p>Signature: ___________________________</p><p>Date: ______________________________</p></div>
//     </body></html>`;

//   // render before and after to PDF bytes
//   const beforeBytes = await renderHtmlToPdfBytes(htmlBefore);
//   const afterBytes = await renderHtmlToPdfBytes(htmlAfter);

//   // merge: before + existing + after
//   if (existingPdf) {
//     const merged = await mergeThreePdfs(beforeBytes, existingPdf, afterBytes);
//     return merged; // Uint8Array
//   }

//   // if no existing PDF, merge just before + after
//   const merged = await mergeThreePdfs(beforeBytes, undefined, afterBytes);
//   return merged;
// }

// // Merge existing PDF (ArrayBuffer/Uint8Array/base64 string) with the generated PDF bytes
// export async function mergePdfWithExisting(existingPdf: ArrayBuffer | Uint8Array | string, newPdfBytes: ArrayBuffer | Uint8Array) {
//   // normalize inputs to Uint8Array
//   const toUint8 = (input: ArrayBuffer | Uint8Array | string) => {
//     if (typeof input === 'string') {
//       // assume base64
//       const b64 = input.replace(/^data:application\/(pdf\+xml|pdf);base64,/, '').replace(/^data:.*;base64,/, '');
//       const binary = atob(b64);
//       const len = binary.length;
//       const bytes = new Uint8Array(len);
//       for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
//       return bytes;
//     }
//     return input instanceof Uint8Array ? input : new Uint8Array(input);
//   };

//   const existingBytes = toUint8(existingPdf);
//   const newBytes = toUint8(newPdfBytes);

//   const existingDoc = await PDFDocument.load(existingBytes);
//   const newDoc = await PDFDocument.load(newBytes);

//   const mergedDoc = await PDFDocument.create();

//   // copy pages from existing then from new
//   const existingPages = await mergedDoc.copyPages(existingDoc, existingDoc.getPageIndices());
//   existingPages.forEach(p => mergedDoc.addPage(p));

//   const newPages = await mergedDoc.copyPages(newDoc, newDoc.getPageIndices());
//   newPages.forEach(p => mergedDoc.addPage(p));

//   const mergedBytes = await mergedDoc.save();
//   return mergedBytes; // Uint8Array
// }

// // Merge three PDFs: beforePdf + existingPdf + afterPdf (each may be ArrayBuffer/Uint8Array/base64)
// export async function mergeThreePdfs(beforePdf: ArrayBuffer | Uint8Array | string | null, existingPdf: ArrayBuffer | Uint8Array | string | null | undefined, afterPdf: ArrayBuffer | Uint8Array | string | null) {
//   const mergedDoc = await PDFDocument.create();

//   if (beforePdf) {
//     const beforeBytes = normalizeToUint8(beforePdf);
//     const beforeDoc = await PDFDocument.load(beforeBytes);
//     const pages = await mergedDoc.copyPages(beforeDoc, beforeDoc.getPageIndices());
//     pages.forEach(p => mergedDoc.addPage(p));
//   }

//   if (existingPdf) {
//     const existingBytes = normalizeToUint8(existingPdf);
//     const existingDoc = await PDFDocument.load(existingBytes);
//     const pages = await mergedDoc.copyPages(existingDoc, existingDoc.getPageIndices());
//     pages.forEach(p => mergedDoc.addPage(p));
//   }

//   if (afterPdf) {
//     const afterBytes = normalizeToUint8(afterPdf);
//     const afterDoc = await PDFDocument.load(afterBytes);
//     const pages = await mergedDoc.copyPages(afterDoc, afterDoc.getPageIndices());
//     pages.forEach(p => mergedDoc.addPage(p));
//   }

//   const out = await mergedDoc.save();
//   return out; // Uint8Array
// }


import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PageSizes, PDFDocument } from 'pdf-lib';
import { PersonalInfoFormData, Question } from '@/types';

// Normalize input to Uint8Array
export function normalizeToUint8(input: ArrayBuffer | Uint8Array | string): Uint8Array {
  if (typeof input === 'string') {
    const b64 = input.replace(/^data:.*;base64,/, '');
    const binary = typeof atob === 'function' 
      ? atob(b64) 
      : Buffer.from(b64, 'base64').toString('binary');
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

// Convert jsPDF to Uint8Array
export function jsPdfToUint8(pdf: jsPDF): Uint8Array {
  const ab = pdf.output('arraybuffer');
  return new Uint8Array(ab);
}

// Helper to escape HTML
function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper to draw header on PDF pages
function drawHeader(
  pdf: jsPDF, 
  title: string, 
  path: string, 
  pageWidthMM: number, 
  marginMM: number
): void {
  const y = Math.max(8, marginMM - 6);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title || '', marginMM, y);

  if (path) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const txtWidth = pdf.getTextWidth(path);
    const x = Math.max(marginMM, pageWidthMM - marginMM - txtWidth);
    pdf.text(path, x, y);
  }

  // Thin rule under header
  pdf.setDrawColor(200);
  pdf.setLineWidth(0.2);
  pdf.line(marginMM, y + 2, pageWidthMM - marginMM, y + 2);
}

// Render HTML to PDF with proper pagination
async function renderHtmlToPdfBytes(
  htmlContent: string,
  headerTitle: string = '',
  headerPath: string = ''
): Promise<Uint8Array> {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  const pageWidthMM = 210;
  const pageHeightMM = 297;
  const marginMM = 15;
  const printableWidthMM = pageWidthMM - 2 * marginMM;
  
  // Set exact pixel width for A4 (210mm at 96 DPI)
  const a4WidthPx = Math.floor((printableWidthMM / 25.4) * 96);
  tempDiv.style.width = `${a4WidthPx}px`;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '0';
  tempDiv.style.boxSizing = 'border-box';
  document.body.appendChild(tempDiv);

  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: a4WidthPx,
      windowWidth: a4WidthPx
    });

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    const imgData = canvas.toDataURL('image/png');
    const imgWidthMM = printableWidthMM;
    const imgHeightMM = (canvas.height * imgWidthMM) / canvas.width;
    const availablePageHeightMM = pageHeightMM - 2 * marginMM;

    // Single page case
    if (imgHeightMM <= availablePageHeightMM) {
      pdf.addImage(imgData, 'PNG', marginMM, marginMM, imgWidthMM, imgHeightMM);
      if (headerTitle || headerPath) {
        drawHeader(pdf, headerTitle, headerPath, pageWidthMM, marginMM);
      }
    } else {
      // Multi-page case
      const pageCount = Math.ceil(imgHeightMM / availablePageHeightMM);
      const canvasPageHeight = Math.floor((canvas.height / imgHeightMM) * availablePageHeightMM);

      for (let i = 0; i < pageCount; i++) {
        const y = i * canvasPageHeight;
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(canvasPageHeight, canvas.height - y);

        const ctx = pageCanvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        ctx.drawImage(
          canvas, 
          0, y, canvas.width, pageCanvas.height,
          0, 0, pageCanvas.width, pageCanvas.height
        );

        const pageImgData = pageCanvas.toDataURL('image/png');
        const pageImgHeightMM = (pageCanvas.height * imgWidthMM) / pageCanvas.width;

        if (i > 0) pdf.addPage();
        pdf.addImage(pageImgData, 'PNG', marginMM, marginMM, imgWidthMM, pageImgHeightMM);
        
        if (headerTitle || headerPath) {
          drawHeader(pdf, headerTitle, headerPath, pageWidthMM, marginMM);
        }
      }
    }

    document.body.removeChild(tempDiv);
    return new Uint8Array(pdf.output('arraybuffer'));
  } catch (error) {
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv);
    }
    throw error;
  }
}

// Main PDF generation function
export const generateFinalPDF = async (
  termsConditionsText: string,
  confirmationText: string,
  questionsData: Question[],
  answers: Record<string, string>,
  personalInfo: PersonalInfoFormData,
  productDescription: string,
  existingPdf?: ArrayBuffer | Uint8Array | string
): Promise<Uint8Array> => {
  const headerPath = '';
  const headerTitle = 'Product Discovery';

  // Helper to render questions
  const renderQuestion = (q: Question, idx: number): string => {
    const selectedValue = answers[q.id];
    const selectedOption = q.options?.find(opt => opt.value === selectedValue);
    const answerText = selectedOption?.label || answers[q.id] || 'Not answered';
    
    return `
      <div class="question">
        <p><strong>Question ${idx}:</strong> ${escapeHtml(q.text)}</p>
        <p><strong>Answer:</strong> ${escapeHtml(answerText)}</p>
      </div>
    `;
  };

  // Split questions into phases
  const qPhase2 = questionsData.slice(0, 3);
  const qPhase4 = questionsData.slice(3, 5);

  // Build "before" HTML (phases 1-4)
  const htmlBefore = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 10mm;
          line-height: 1.6;
        }
        .section {
          margin-bottom: 24px;
          page-break-inside: avoid;
        }
        h1 {
          color: #1a1a1a;
          font-size: 20px;
          margin-bottom: 12px;
          border-bottom: 2px solid #007bff;
          padding-bottom: 8px;
        }
        h2 {
          color: #333;
          font-size: 16px;
          margin-bottom: 10px;
        }
        .question {
          margin-left: 12px;
          margin-bottom: 16px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 4px;
        }
        .question p {
          margin: 6px 0;
        }
        .terms {
          white-space: pre-wrap;
          background: #f8f9fa;
          padding: 12px;
          border-radius: 4px;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="section">
        <h1>1. Terms and Conditions</h1>
        <div class="terms">${escapeHtml(termsConditionsText || 'No terms available')}</div>
      </div>
      
      <div class="section">
        <h2>2. Initial Questions and Answers</h2>
        ${qPhase2.map((q, i) => renderQuestion(q, i + 1)).join('')}
      </div>
      
      <div class="section">
        <h2>3. Confirmation</h2>
        <p>${escapeHtml(confirmationText || 'No confirmation available')}</p>
      </div>
      
      <div class="section">
        <h2>4. Additional Questions and Answers</h2>
        ${qPhase4.map((q, i) => renderQuestion(q, i + 1)).join('')}
      </div>
    </body>
    </html>
  `;

  // Build "after" HTML (phases 6-7)
  const htmlAfter = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 10mm;
          line-height: 1.6;
        }
        .section {
          margin-bottom: 24px;
        }
        h2 {
          color: #333;
          font-size: 16px;
          margin-bottom: 10px;
          border-bottom: 2px solid #007bff;
          padding-bottom: 8px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 16px;
        }
        .info-item {
          padding: 12px;
          background: #f8f9fa;
          border-radius: 4px;
        }
        .info-item strong {
          color: #555;
          display: block;
          margin-bottom: 4px;
        }
        .signature-section {
          margin-top: 40px;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .signature-line {
          border-bottom: 1px solid #333;
          margin: 30px 0 10px 0;
          height: 1px;
        }
        .signature-footer {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="section">
        <h2>6. Personal Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <strong>First Name:</strong>
            ${escapeHtml(personalInfo.firstName || 'Not provided')}
          </div>
          <div class="info-item">
            <strong>Last Name:</strong>
            ${escapeHtml(personalInfo.lastName || 'Not provided')}
          </div>
          <div class="info-item">
            <strong>Email:</strong>
            ${escapeHtml(personalInfo.email || 'Not provided')}
          </div>
          <div class="info-item">
            <strong>Phone:</strong>
            ${escapeHtml(personalInfo.phone || 'Not provided')}
          </div>
        </div>
      </div>
      
      <div class="section signature-section">
        <h2>7. Digital Signature</h2>
        <p>Please sign below to confirm your agreement:</p>
        <div class="signature-line"></div>
        <div class="signature-footer">
          <span>Signature</span>
          <span>Date: ${new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </body>
    </html>
  `;

  // Render both HTML sections to PDF bytes
  const beforeBytes = await renderHtmlToPdfBytes(htmlBefore, headerTitle, headerPath);
  const afterBytes = await renderHtmlToPdfBytes(htmlAfter, headerTitle, headerPath);

  // Merge all PDFs
  return await mergeThreePdfs(beforeBytes, existingPdf, afterBytes);
};

// Merge three PDFs into one with consistent sizing
// export async function mergeThreePdfs(
//   beforePdf: ArrayBuffer | Uint8Array | string | null | undefined,
//   existingPdf: ArrayBuffer | Uint8Array | string | null | undefined,
//   afterPdf: ArrayBuffer | Uint8Array | string | null | undefined
// ): Promise<Uint8Array> {
//   const mergedDoc = await PDFDocument.create();
  
//   // Set default page size (A4)
//   // const pageWidth = 595.28; // A4 width in points
//   // const pageHeight = 841.89; // A4 height in points

//   // Helper to add pages from a PDF
//   const addPagesFromPdf = async (pdfData: ArrayBuffer | Uint8Array | string) => {
//     const bytes = normalizeToUint8(pdfData);
//     const doc = await PDFDocument.load(bytes);
//     const pages = await mergedDoc.copyPages(doc, doc.getPageIndices());
//     // Append copied pages to the merged document
//     pages.forEach(p => mergedDoc.addPage(p));
//   };

//   // Add before PDF
//   if (beforePdf) {
//     await addPagesFromPdf(beforePdf);
//   }

//   // Add existing PDF (preserves original layout and size)
//   if (existingPdf) {
//     await addPagesFromPdf(existingPdf);
//   }

//   // Add after PDF
//   if (afterPdf) {
//     await addPagesFromPdf(afterPdf);
//   }

//   return await mergedDoc.save();
// }

// import { PDFDocument, PageSizes } from "pdf-lib";

// function normalizeToUint8(data: ArrayBuffer | Uint8Array | string): Uint8Array {
//   if (data instanceof Uint8Array) return data;
//   if (typeof data === "string") return new TextEncoder().encode(data);
//   return new Uint8Array(data);
// }

export async function mergeThreePdfs(
  beforePdf: ArrayBuffer | Uint8Array | string | null | undefined,
  existingPdf: ArrayBuffer | Uint8Array | string | null | undefined,
  afterPdf: ArrayBuffer | Uint8Array | string | null | undefined
): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();

  // Default page size (A4)
  const defaultSize = PageSizes.A4;

  // Helper: safely add all pages from a given PDF
  const addPagesFromPdf = async (pdfData: ArrayBuffer | Uint8Array | string) => {
    const bytes = normalizeToUint8(pdfData);
    const srcDoc = await PDFDocument.load(bytes);
    const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());

    for (const page of copiedPages) {
      const { width, height } = page.getSize();
      const [targetWidth, targetHeight] = defaultSize;

      // Option 1: Keep original page size (recommended)
      // mergedDoc.addPage(page);

      // Option 2: Normalize to A4 while preserving content
      const newPage = mergedDoc.addPage([targetWidth, targetHeight]);
      const scaleX = targetWidth / width;
      const scaleY = targetHeight / height;
      const scale = Math.min(scaleX, scaleY);
      const x = (targetWidth - width * scale) / 2;
      const y = (targetHeight - height * scale) / 2;

      // ✅ Embed the page correctly to avoid blank output
      const embeddedPage = await mergedDoc.embedPage(page);

      newPage.drawPage(embeddedPage, {
        x,
        y,
        xScale: scale,
        yScale: scale,
      });
    }
  };

  // Add before PDF
  if (beforePdf) {
    await addPagesFromPdf(beforePdf);
  }

  // Add existing PDF
  if (existingPdf) {
    await addPagesFromPdf(existingPdf);
  }

  // Add after PDF
  if (afterPdf) {
    await addPagesFromPdf(afterPdf);
  }

  return await mergedDoc.save();
}


// Alternative: Merge existing PDF with generated PDF
export async function mergePdfWithExisting(
  existingPdf: ArrayBuffer | Uint8Array | string,
  newPdfBytes: ArrayBuffer | Uint8Array
): Promise<Uint8Array> {
  const existingBytes = normalizeToUint8(existingPdf);
  const newBytes = normalizeToUint8(newPdfBytes);

  const existingDoc = await PDFDocument.load(existingBytes);
  const newDoc = await PDFDocument.load(newBytes);
  const mergedDoc = await PDFDocument.create();

  // Copy pages from existing
  const existingPages = await mergedDoc.copyPages(existingDoc, existingDoc.getPageIndices());
  existingPages.forEach(p => mergedDoc.addPage(p));

  // Copy pages from new
  const newPages = await mergedDoc.copyPages(newDoc, newDoc.getPageIndices());
  newPages.forEach(p => mergedDoc.addPage(p));

  return await mergedDoc.save();
}