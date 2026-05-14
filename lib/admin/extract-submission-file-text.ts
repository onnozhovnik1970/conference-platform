import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export async function extractTextFromSubmissionFile(buffer: Buffer, ext: string): Promise<string> {
  const e = ext.toLowerCase();
  if (e === ".pdf") {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return (result.text ?? "").trim();
  }
  if (e === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value ?? "").trim();
  }
  return "";
}
