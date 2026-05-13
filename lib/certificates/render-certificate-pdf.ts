import { readFileSync } from "node:fs";
import { join } from "node:path";

import { jsPDF } from "jspdf";

import type { CertificatePayload } from "@/lib/certificates/fetch-payloads";

const FONTS_DIR = join(process.cwd(), "lib", "certificates", "fonts");

/** Navy + gold certificate palette */
const NAVY = { r: 12, g: 38, b: 72 };
const NAVY_LIGHT = { r: 28, g: 58, b: 98 };
const GOLD = { r: 201, g: 162, b: 39 };
const GOLD_DEEP = { r: 176, g: 134, b: 11 };
const PAPER = { r: 252, g: 250, b: 245 };
const INK = { r: 30, g: 41, b: 59 };
const MUTED = { r: 71, g: 85, b: 105 };

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

function drawDecorativeFrame(doc: jsPDF, pageW: number, pageH: number): void {
  doc.setFillColor(PAPER.r, PAPER.g, PAPER.b);
  doc.rect(0, 0, pageW, pageH, "F");

  const m = 22;
  doc.setDrawColor(NAVY.r, NAVY.g, NAVY.b);
  doc.setLineWidth(3.5);
  doc.roundedRect(m, m, pageW - 2 * m, pageH - 2 * m, 4, 4, "S");

  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(1.25);
  doc.roundedRect(m + 7, m + 7, pageW - 2 * (m + 7), pageH - 2 * (m + 7), 3, 3, "S");

  doc.setDrawColor(NAVY_LIGHT.r, NAVY_LIGHT.g, NAVY_LIGHT.b);
  doc.setLineWidth(0.6);
  doc.roundedRect(m + 14, m + 14, pageW - 2 * (m + 14), pageH - 2 * (m + 14), 2, 2, "S");

  doc.setDrawColor(GOLD_DEEP.r, GOLD_DEEP.g, GOLD_DEEP.b);
  doc.setLineWidth(0.35);
  doc.line(m + 18, m + 42, pageW - m - 18, m + 42);
}

function drawDashedPlaceholder(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  captionUa: string,
  captionEn: string
): void {
  doc.setDrawColor(MUTED.r, MUTED.g, MUTED.b);
  doc.setLineWidth(0.75);
  doc.setLineDashPattern([4, 3], 0);
  doc.roundedRect(x, y, w, h, 2, 2, "S");
  doc.setLineDashPattern([], 0);
  doc.setFont("Roboto", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  const cap = `${captionUa} / ${captionEn}`;
  doc.text(cap, x + w / 2, y + h / 2 + 3, { align: "center", maxWidth: w - 8 });
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
  doc.setFontSize(7.5);
  doc.setTextColor(NAVY_LIGHT.r, NAVY_LIGHT.g, NAVY_LIGHT.b);
  doc.text(`${labelUa} / ${labelEn}`, left, y);
  let nextY = y + 11;
  doc.setFont("Roboto", "normal");
  doc.setFontSize(10);
  doc.setTextColor(INK.r, INK.g, INK.b);
  const lines = doc.splitTextToSize(value.trim() || "—", maxW);
  doc.text(lines, left, nextY);
  nextY += lines.length * 12.5 + 8;
  return nextY;
}

/** Single-page participation certificate (jsPDF + Roboto, Identity-H). */
export function renderCertificatePdfBuffer(payload: CertificatePayload): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
  loadRoboto(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const innerLeft = 52;
  const innerRight = pageW - 52;
  const maxW = innerRight - innerLeft;
  const cx = pageW / 2;

  drawDecorativeFrame(doc, pageW, pageH);

  let y = 58;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(11);
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
  doc.text("Certificate of Participation", cx, y, { align: "center", maxWidth: maxW });
  y += 16;

  doc.setFontSize(13);
  doc.setTextColor(GOLD_DEEP.r, GOLD_DEEP.g, GOLD_DEEP.b);
  doc.text("Сертифікат учасника", cx, y, { align: "center", maxWidth: maxW });
  y += 22;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(12);
  doc.setTextColor(INK.r, INK.g, INK.b);
  const titleUaLines = doc.splitTextToSize(payload.titleUa, maxW);
  doc.text(titleUaLines, cx, y, { align: "center", maxWidth: maxW });
  y += titleUaLines.length * 15 + 4;

  doc.setFont("Roboto", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  const titleEnLines = doc.splitTextToSize(payload.titleEn, maxW);
  doc.text(titleEnLines, cx, y, { align: "center", maxWidth: maxW });
  y += titleEnLines.length * 13 + 10;

  doc.setFont("Roboto", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(payload.locationDisplay, cx, y, { align: "center", maxWidth: maxW });
  y += 20;

  doc.setFontSize(8.5);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text("This is to certify that / Цим підтверджується, що", cx, y, { align: "center", maxWidth: maxW });
  y += 18;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(28);
  doc.setTextColor(GOLD.r, GOLD.g, GOLD.b);
  const nameLines = doc.splitTextToSize(payload.participantName, maxW - 24);
  doc.text(nameLines, cx, y, { align: "center", maxWidth: maxW });
  y += nameLines.length * 32 + 18;

  y = drawField(doc, y, innerLeft, maxW, "Назва тез", "Abstract title", payload.abstractTitle);
  y = drawField(doc, y, innerLeft, maxW, "Секція", "Section", payload.sectionBilingual);
  y = drawField(doc, y, innerLeft, maxW, "Науковий керівник", "Supervisor", payload.supervisorBlock);
  y = drawField(doc, y, innerLeft, maxW, "Заклад", "Institution", payload.institution);
  y = drawField(doc, y, innerLeft, maxW, "Дата конференції (UA)", "Conference date (EN)", `${payload.dateUa}\n${payload.dateEn}`);

  const footerTop = Math.min(y + 12, pageH - 118);
  const boxH = 58;
  const sigW = 148;
  const stampW = 102;
  const gap = 28;
  const rowW = sigW + gap + stampW;
  const rowX = (pageW - rowW) / 2;

  drawDashedPlaceholder(doc, rowX, footerTop, sigW, boxH, "Місце для підпису", "Signature");
  drawDashedPlaceholder(doc, rowX + sigW + gap, footerTop, stampW, boxH, "Місце для печатки", "Stamp");

  doc.setFont("Roboto", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text("Організаційний комітет / Organizing committee", cx, footerTop + boxH + 14, { align: "center", maxWidth: maxW });

  const out = doc.output("arraybuffer") as ArrayBuffer;
  return Buffer.from(out);
}
