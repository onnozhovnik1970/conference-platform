import mammoth from "mammoth";
import { extractText } from "unpdf";

/**
 * PDF text extraction for admin exports (abstract book).
 * Uses `unpdf` (serverless-friendly PDF.js) instead of `pdf-parse` v2, which pulls in pdfjs
 * browser APIs such as `DOMMatrix` and fails on Vercel Node.
 *
 * PDF **generation** (abstract book layout) still uses `pdf-lib` + fontkit like certificates.
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
  return (text as string).trim();
}

export async function extractTextFromSubmissionFile(buffer: Buffer, ext: string): Promise<string> {
  const e = ext.toLowerCase();
  if (e === ".pdf") {
    return extractPdfText(buffer);
  }
  if (e === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value ?? "").trim();
  }
  return "";
}
