import { readFileSync } from "node:fs";
import { join } from "node:path";

import { jsPDF } from "jspdf";

import type { CertificatePayload } from "@/lib/certificates/fetch-payloads";

const FONTS_DIR = join(process.cwd(), "lib", "certificates", "fonts");

function loadRoboto(doc: jsPDF): void {
  const regular = readFileSync(join(FONTS_DIR, "Roboto-Regular.ttf")).toString("binary");
  const medium = readFileSync(join(FONTS_DIR, "Roboto-Medium.ttf")).toString("binary");
  const italic = readFileSync(join(FONTS_DIR, "Roboto-Italic.ttf")).toString("binary");

  doc.addFileToVFS("Roboto-Regular.ttf", regular);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal", "Identity-H");
  doc.addFileToVFS("Roboto-Medium.ttf", medium);
  doc.addFont("Roboto-Medium.ttf", "Roboto", "bold", "Identity-H");
  doc.addFileToVFS("Roboto-Italic.ttf", italic);
  doc.addFont("Roboto-Italic.ttf", "Roboto", "italic", "Identity-H");
}

function drawBorders(doc: jsPDF, pageW: number, pageH: number): void {
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(2);
  doc.roundedRect(26, 26, pageW - 52, pageH - 52, 3, 3, "S");

  doc.setDrawColor(226, 207, 165);
  doc.setLineWidth(0.5);
  doc.roundedRect(34, 34, pageW - 68, pageH - 68, 2, 2, "S");
}

function drawField(
  doc: jsPDF,
  y: number,
  left: number,
  maxW: number,
  labelUa: string,
  labelEn: string,
  value: string
): number {
  doc.setFont("Roboto", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${labelUa} / ${labelEn}`, left, y);
  let nextY = y + 12;
  doc.setFont("Roboto", "normal");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const lines = doc.splitTextToSize(value.trim() || "—", maxW);
  doc.text(lines, left, nextY);
  nextY += lines.length * 14 + 10;
  return nextY;
}

/** Single-page participation certificate (jsPDF + embedded Roboto, Identity-H for UA/EN). */
export function renderCertificatePdfBuffer(payload: CertificatePayload): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
  loadRoboto(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const left = 48;
  const maxW = pageW - 96;
  const cx = pageW / 2;

  drawBorders(doc, pageW, pageH);

  let y = 62;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(9);
  doc.setTextColor(146, 64, 14);
  doc.text("CERTIFICATE OF PARTICIPATION", cx, y, { align: "center", maxWidth: maxW });
  y += 14;

  doc.setFontSize(10);
  doc.setTextColor(120, 53, 15);
  doc.text("Грамота учасника", cx, y, { align: "center", maxWidth: maxW });
  y += 22;

  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  const titleUaLines = doc.splitTextToSize(payload.titleUa, maxW);
  doc.text(titleUaLines, cx, y, { align: "center", maxWidth: maxW });
  y += titleUaLines.length * 16 + 4;

  doc.setFont("Roboto", "italic");
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  const titleEnLines = doc.splitTextToSize(payload.titleEn, maxW);
  doc.text(titleEnLines, cx, y, { align: "center", maxWidth: maxW });
  y += titleEnLines.length * 14 + 12;

  doc.setFont("Roboto", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(payload.locationDisplay, cx, y, { align: "center", maxWidth: maxW });
  y += 24;

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("This is to certify that / Цим підтверджується, що", cx, y, { align: "center", maxWidth: maxW });
  y += 16;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(payload.participantName, cx, y, { align: "center", maxWidth: maxW });
  y += 28;

  y = drawField(doc, y, left, maxW, "Назва тез", "Abstract title", payload.abstractTitle);
  y = drawField(doc, y, left, maxW, "Секція", "Section", payload.sectionBilingual);
  y = drawField(doc, y, left, maxW, "Науковий керівник", "Supervisor", payload.supervisorBlock);
  y = drawField(doc, y, left, maxW, "Заклад", "Institution", payload.institution);
  y = drawField(doc, y, left, maxW, "Дата конференції (UA)", "Conference date (EN)", `${payload.dateUa}\n${payload.dateEn}`);

  y += 8;
  const sigY = Math.min(y, pageH - 72);
  const lineW = 200;
  const lineX = (pageW - lineW) / 2;
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.75);
  doc.line(lineX, sigY, lineX + lineW, sigY);

  doc.setFont("Roboto", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Підпис організатора / Organizer signature", cx, sigY + 14, { align: "center", maxWidth: maxW });

  const out = doc.output("arraybuffer") as ArrayBuffer;
  return Buffer.from(out);
}
