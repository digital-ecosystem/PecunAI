import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments?.length) {
      return NextResponse.json({ error: "missing path" }, { status: 400 });
    }

    const baseDir = path.resolve(process.cwd(), "public", "products");
    const filePath = path.join(baseDir, ...pathSegments);
    const realPath = path.resolve(filePath);
    if (!realPath.startsWith(baseDir)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const buffer = await readFile(realPath);

    // Lazy-import pdfjs legacy build (Node.js compatible, no canvas needed for text extraction)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported:  false,
      disableFontFace:  true,
    }).promise;

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text    = (content.items as { str: string; hasEOL?: boolean }[])
        .map(item => item.str + (item.hasEOL ? "\n" : ""))
        .join(" ")
        .replace(/ {2,}/g, " ")
        .trim();
      pages.push(text);
    }

    return NextResponse.json({ pages });
  } catch (err) {
    console.error("[pdf-text]", err);
    return NextResponse.json({ error: "extraction failed" }, { status: 500 });
  }
}
