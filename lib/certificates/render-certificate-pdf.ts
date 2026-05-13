import { readFileSync } from "node:fs";
import { join } from "node:path";

import { jsPDF } from "jspdf";

import type { CertificatePayload } from "@/lib/certificates/fetch-payloads";

const FONTS_DIR = join(process.cwd(), "lib", "certificates", "fonts");

const BLACK = { r: 15, g: 15, b: 18 };
const GRAY = { r: 88, g: 95, b: 105 };
const GREEN = { r: 34, g: 139, b: 75 };
const GREEN_DARK = { r: 22, g: 101, b: 52 };
const WHITE = { r: 255, g: 255, b: 255 };

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

function lineHeightPt(fontSize: number): number {
  return fontSize * 1.38;
}

/** Draw plain lines inside [yTop, yTop+height]; never advances past box bottom. */
function drawLinesInBox(
  doc: jsPDF,
  x: number,
  yTop: number,
  width: number,
  height: number,
  lines: string[],
  fontSize: number,
  font: "Roboto",
  style: "normal" | "bold" | "italic",
  rgb: { r: number; g: number; b: number },
  align: "left" | "center" = "left"
): void {
  doc.setFont(font, style);
  doc.setFontSize(fontSize);
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  const lh = lineHeightPt(fontSize);
  const maxLines = Math.max(1, Math.floor((height - 2) / lh));
  const slice = lines.slice(0, maxLines);
  const firstBaseline = yTop + fontSize * 0.88;
  const bottom = yTop + height;
  let y = firstBaseline;
  for (let i = 0; i < slice.length; i++) {
    if (y > bottom - 1) {
      break;
    }
    const line = slice[i]!;
    const ox = align === "center" ? x + width / 2 : x;
    doc.text(line, ox, y, { align, maxWidth: width });
    y += lh;
  }
}

/** Split to width, then cap to maxLines; optional ellipsis on last visible line. */
function fitLines(
  doc: jsPDF,
  text: string,
  width: number,
  maxLines: number,
  font: "Roboto",
  style: "normal" | "bold" | "italic",
  fontSize: number
): string[] {
  doc.setFont(font, style);
  doc.setFontSize(fontSize);
  const raw = doc.splitTextToSize(text.trim() || "—", width) as string[];
  if (raw.length <= maxLines) {
    return raw;
  }
  const cut = raw.slice(0, maxLines);
  const last = cut[maxLines - 1] ?? "";
  if (last.length > 4) {
    cut[maxLines - 1] = `${last.slice(0, Math.max(0, last.length - 3))}…`;
  }
  return cut;
}

function drawPurpleMosaicBand(doc: jsPDF, pageW: number, pageH: number, bandX: number): void {
  const w0 = pageW - bandX;
  const cellW = 13.2;
  const cellH = 11.5;
  const cols = Math.max(1, Math.ceil(w0 / cellW));
  const rows = Math.max(1, Math.ceil(pageH / cellH));
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const n = (c * 19 + r * 37) % 120;
      const rv = 78 + (n % 70);
      const gv = 28 + ((n * 5) % 45);
      const bv = 108 + ((n * 7) % 95);
      doc.setFillColor(rv, gv, bv);
      doc.rect(bandX + c * cellW, r * cellH, cellW - 0.35, cellH - 0.35, "F");
    }
  }
}

function drawSoftWatermarkShapes(doc: jsPDF, pageH: number): void {
  doc.setFillColor(248, 252, 220);
  doc.circle(72, pageH - 88, 52, "F");
  doc.setFillColor(236, 252, 236);
  doc.circle(128, pageH - 132, 38, "F");
  doc.setFillColor(252, 250, 235);
  doc.circle(38, pageH - 48, 28, "F");
}

function drawCornerCrosshair(doc: jsPDF, cx: number, cy: number, size: number): void {
  doc.setDrawColor(BLACK.r, BLACK.g, BLACK.b);
  doc.setLineWidth(0.45);
  doc.line(cx - size, cy, cx + size, cy);
  doc.line(cx, cy - size, cx, cy + size);
}

function drawBrandMark(doc: jsPDF, x: number, y: number): void {
  doc.setFillColor(GREEN.r, GREEN.g, GREEN.b);
  doc.setDrawColor(GREEN_DARK.r, GREEN_DARK.g, GREEN_DARK.b);
  doc.setLineWidth(0.35);
  doc.circle(x, y, 11, "FD");

  doc.setFont("Roboto", "bold");
  doc.setFontSize(11);
  doc.setTextColor(GREEN_DARK.r, GREEN_DARK.g, GREEN_DARK.b);
  doc.text("МЦ", x + 18, y + 2, { baseline: "middle" });
  doc.setTextColor(200, 170, 30);
  doc.text("НД", x + 34, y + 2, { baseline: "middle" });
}

function drawSignatureBlock(doc: jsPDF, left: number, baseY: number): void {
  doc.setFont("Roboto", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
  doc.text("ПІДПИС / SIGNATURE", left, baseY);

  doc.setDrawColor(GRAY.r, GRAY.g, GRAY.b);
  doc.setLineWidth(0.6);
  doc.line(left, baseY + 10, left + 160, baseY + 10);

  doc.setFont("Roboto", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
  drawLinesInBox(doc, left, baseY + 14, 170, 16, ["Місце для підпису / Signature"], 6.5, "Roboto", "italic", GRAY, "left");
}

function drawStampPlaceholder(doc: jsPDF, cx: number, cy: number, r: number): void {
  doc.setDrawColor(GREEN.r, GREEN.g, GREEN.b);
  doc.setLineWidth(2.2);
  doc.circle(cx, cy, r, "S");
  doc.setLineWidth(0.5);
  doc.circle(cx, cy, r - 5, "S");

  doc.setFont("Roboto", "bold");
  doc.setFontSize(7);
  doc.setTextColor(GREEN_DARK.r, GREEN_DARK.g, GREEN_DARK.b);
  doc.text("ПЕЧАТКА", cx, cy - 4, { align: "center" });
  doc.setFont("Roboto", "normal");
  doc.setFontSize(6);
  doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
  doc.text("Stamp", cx, cy + 6, { align: "center" });
}

/** Fixed label + value block; value clipped to box height. */
function drawLabeledField(
  doc: jsPDF,
  x: number,
  yTop: number,
  width: number,
  boxHeight: number,
  ua: string,
  en: string,
  value: string
): void {
  const labelH = 12;
  const valueTop = yTop + labelH;
  const valueH = Math.max(10, boxHeight - labelH);
  doc.setFont("Roboto", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
  drawLinesInBox(doc, x, yTop, width, labelH + 2, [`${ua} / ${en}`], 6.5, "Roboto", "bold", GRAY, "left");
  const lh = lineHeightPt(8);
  const maxValLines = Math.max(1, Math.floor((valueH - 2) / lh));
  const vLines = fitLines(doc, value.trim() || "—", width, maxValLines, "Roboto", "normal", 8);
  drawLinesInBox(doc, x, valueTop, width, valueH, vLines, 8, "Roboto", "normal", BLACK, "left");
}

/** Landscape A4 — fixed vertical slots so elements never overlap. */
export function renderCertificatePdfBuffer(payload: CertificatePayload): Buffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4", compress: true });
  loadRoboto(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const marginL = 44;
  const bandX = pageW * 0.78;
  const logoReserve = 108;
  const contentW = bandX - marginL - logoReserve;

  const SIGNATURE_TOP = pageH - 86;

  doc.setFillColor(WHITE.r, WHITE.g, WHITE.b);
  doc.rect(0, 0, pageW, pageH, "F");

  drawSoftWatermarkShapes(doc, pageH);

  /** Fixed slots: [yTop, height] in pt — gaps keep stack above signature chrome (SIGNATURE_TOP). */
  let y = 32;
  const gap = 5;
  const slot = (h: number) => {
    const top = y;
    y += h + gap;
    return { top, h };
  };

  const s1 = slot(22);
  const s2 = slot(22);
  const s3 = slot(12);
  const s4 = slot(14);
  const s5 = slot(62);
  const s6 = slot(14);
  const s7 = slot(48);
  const s8 = slot(16);
  const s9 = slot(26);
  const s10 = slot(30);
  const s11 = slot(30);
  const s12 = slot(30);
  const s13 = slot(30);

  drawLinesInBox(doc, marginL, s1.top, contentW, s1.h, ["СЕРТИФІКАТ"], 19, "Roboto", "bold", BLACK, "left");
  drawLinesInBox(doc, marginL, s2.top, contentW, s2.h, ["УЧАСНИКА"], 19, "Roboto", "bold", BLACK, "left");
  drawCornerCrosshair(doc, marginL + contentW * 0.55, s2.top + s2.h * 0.45, 9);

  drawLinesInBox(
    doc,
    marginL,
    s3.top,
    contentW,
    s3.h,
    ["Certificate of Participation"],
    9,
    "Roboto",
    "normal",
    GRAY,
    "left"
  );

  drawLinesInBox(
    doc,
    marginL,
    s4.top,
    contentW,
    s4.h,
    ["Цим підтверджується, що / This is to certify that"],
    9,
    "Roboto",
    "normal",
    GRAY,
    "left"
  );

  const nameLines = fitLines(doc, payload.participantName, contentW, Math.floor((s5.h - 4) / lineHeightPt(21)), "Roboto", "italic", 21);
  drawLinesInBox(doc, marginL, s5.top, contentW, s5.h, nameLines, 21, "Roboto", "italic", BLACK, "left");

  drawLinesInBox(
    doc,
    marginL,
    s6.top,
    contentW,
    s6.h,
    ["взяв(ла) участь у / participated in"],
    9.5,
    "Roboto",
    "normal",
    GRAY,
    "left"
  );

  const confLines = fitLines(
    doc,
    payload.titleUa.toUpperCase(),
    contentW,
    Math.floor((s7.h - 4) / lineHeightPt(10.5)),
    "Roboto",
    "bold",
    10.5
  );
  drawLinesInBox(doc, marginL, s7.top, contentW, s7.h, confLines, 10.5, "Roboto", "bold", BLACK, "left");

  const whenWhere = `${payload.dateUa}  ◆  ${payload.locationDisplay}`;
  drawLinesInBox(doc, marginL, s8.top, contentW, s8.h, [whenWhere], 10, "Roboto", "bold", BLACK, "left");

  const enLines = fitLines(doc, payload.titleEn, contentW, Math.floor((s9.h - 4) / lineHeightPt(8)), "Roboto", "italic", 8);
  drawLinesInBox(doc, marginL, s9.top, contentW, s9.h, enLines, 8, "Roboto", "italic", GRAY, "left");

  drawLabeledField(doc, marginL, s10.top, contentW, s10.h, "Назва тез", "Abstract title", payload.abstractTitle);
  drawLabeledField(doc, marginL, s11.top, contentW, s11.h, "Секція", "Section", payload.sectionBilingual);
  drawLabeledField(doc, marginL, s12.top, contentW, s12.h, "Науковий керівник", "Supervisor", payload.supervisorBlock);
  drawLabeledField(doc, marginL, s13.top, contentW, s13.h, "Заклад", "Institution", payload.institution);

  const wmSource = (payload.titleUa || "").trim().toUpperCase();
  const wm = wmSource.length > 0 ? wmSource.slice(0, 80) : "CONFERENCE";
  doc.setFont("Roboto", "bold");
  doc.setFontSize(5.2);
  doc.setTextColor(235, 236, 240);
  doc.text(wm, marginL + contentW / 2, pageH - 16, { align: "center", maxWidth: bandX - marginL - 24 });

  drawPurpleMosaicBand(doc, pageW, pageH, bandX);

  drawBrandMark(doc, bandX - 78, 52);

  drawSignatureBlock(doc, marginL, SIGNATURE_TOP);
  drawStampPlaceholder(doc, marginL + 218, SIGNATURE_TOP + 14, 34);

  const out = doc.output("arraybuffer") as ArrayBuffer;
  return Buffer.from(out);
}
