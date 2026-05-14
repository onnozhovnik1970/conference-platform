import { readFileSync } from "node:fs";
import { join } from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const FONTS_DIR = join(process.cwd(), "lib", "certificates", "fonts");

/** Portrait A4 (points). */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 56;
const MARGIN_TOP = 72;
const MARGIN_BOTTOM = 56;

const BODY_COLOR = rgb(15 / 255, 23 / 255, 42 / 255);
const MUTED_COLOR = rgb(71 / 255, 85 / 255, 105 / 255);

function wrapParagraphToLines(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.replace(/\r\n/g, "\n").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let buf = "";

  const pushBuf = () => {
    if (buf) {
      lines.push(buf);
      buf = "";
    }
  };

  for (const w of words) {
    const trial = buf ? `${buf} ${w}` : w;
    if (font.widthOfTextAtSize(trial, fontSize) <= maxWidth) {
      buf = trial;
      continue;
    }
    pushBuf();
    if (font.widthOfTextAtSize(w, fontSize) <= maxWidth) {
      buf = w;
      continue;
    }
    let rest = w;
    while (rest.length) {
      let n = rest.length;
      while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), fontSize) > maxWidth) {
        n -= 1;
      }
      lines.push(rest.slice(0, n));
      rest = rest.slice(n);
    }
  }
  if (buf) {
    lines.push(buf);
  }
  return lines.length ? lines : [];
}

function wrapBodyToLines(body: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const normalized = body.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return ["—"];
  }
  const paras = normalized.split(/\n{2,}/);
  const out: string[] = [];
  for (let i = 0; i < paras.length; i += 1) {
    const inner = paras[i].split(/\n/).join(" ");
    const chunk = wrapParagraphToLines(inner, font, fontSize, maxWidth);
    out.push(...chunk);
    if (i < paras.length - 1) {
      out.push("");
    }
  }
  return out.length ? out : ["—"];
}

export type AbstractBookEntry = {
  displayNumber: number;
  authorFullName: string;
  titleAllCaps: string;
  affiliationItalic: string;
  bodyText: string;
};

type LayoutCtx = {
  doc: PDFDocument;
  page: PDFPage;
  regular: PDFFont;
  medium: PDFFont;
  italic: PDFFont;
  maxW: number;
  cursorY: number;
};

function ensureSpace(ctx: LayoutCtx, lineHeight: number): void {
  if (ctx.cursorY - lineHeight < MARGIN_BOTTOM) {
    ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
    ctx.cursorY = PAGE_H - MARGIN_TOP - 14;
  }
}

function drawCover(page: PDFPage, regular: PDFFont, medium: PDFFont, maxW: number, conferenceTitle: string, dateLine: string, cityLine: string): void {
  const titleSize = 16;
  const subSize = 12;
  const titleLines = wrapParagraphToLines(conferenceTitle, medium, titleSize, maxW);
  const titleLH = titleSize * 1.4;
  const subLH = subSize * 1.35;
  let y = PAGE_H * 0.58;

  for (const line of titleLines) {
    const tw = medium.widthOfTextAtSize(line, titleSize);
    page.drawText(line, {
      x: (PAGE_W - tw) / 2,
      y,
      size: titleSize,
      font: medium,
      color: BODY_COLOR
    });
    y -= titleLH;
  }
  y -= subLH * 0.4;
  for (const line of [dateLine, cityLine]) {
    if (!line.trim()) {
      continue;
    }
    const tw = regular.widthOfTextAtSize(line, subSize);
    page.drawText(line, {
      x: (PAGE_W - tw) / 2,
      y,
      size: subSize,
      font: regular,
      color: MUTED_COLOR
    });
    y -= subLH;
  }
}

function drawWrappedLines(ctx: LayoutCtx, lines: string[], font: PDFFont, size: number, color: ReturnType<typeof rgb>, lineHeight: number): void {
  for (const line of lines) {
    ensureSpace(ctx, lineHeight);
    if (line === "") {
      ctx.cursorY -= lineHeight;
      continue;
    }
    ctx.page.drawText(line, {
      x: MARGIN_X,
      y: ctx.cursorY,
      size,
      font,
      color
    });
    ctx.cursorY -= lineHeight;
  }
}

/**
 * Conference abstract book: cover + numbered entries (author in Medium as bold substitute,
 * title in caps, affiliation italic, body).
 */
export async function renderAbstractBookPdfBuffer(
  conferenceTitle: string,
  conferenceDateDisplay: string,
  conferenceCityLine: string,
  entries: AbstractBookEntry[]
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  /** Required before embedding custom TTF/OTF (same as certificates). */
  doc.registerFontkit(fontkit);

  const regularBytes = readFileSync(join(FONTS_DIR, "Roboto-Regular.ttf"));
  const mediumBytes = readFileSync(join(FONTS_DIR, "Roboto-Medium.ttf"));
  const italicBytes = readFileSync(join(FONTS_DIR, "Roboto-Italic.ttf"));

  const regular = await doc.embedFont(regularBytes);
  const medium = await doc.embedFont(mediumBytes);
  const italic = await doc.embedFont(italicBytes);

  const maxW = PAGE_W - 2 * MARGIN_X;
  const coverPage = doc.addPage([PAGE_W, PAGE_H]);
  drawCover(coverPage, regular, medium, maxW, conferenceTitle, conferenceDateDisplay, conferenceCityLine);

  const ctx: LayoutCtx = {
    doc,
    page: doc.addPage([PAGE_W, PAGE_H]),
    regular,
    medium,
    italic,
    maxW,
    cursorY: PAGE_H - MARGIN_TOP - 14
  };

  const authorSize = 11;
  const titleSize = 11;
  const affSize = 10;
  const bodySize = 10;
  const gapAfterEntry = 16;

  const lhAuthor = authorSize * 1.35;
  const lhTitle = titleSize * 1.35;
  const lhAff = affSize * 1.35;
  const lhBody = bodySize * 1.35;

  for (const entry of entries) {
    const headLine = `${entry.displayNumber}. ${entry.authorFullName}`;
    const headLines = wrapParagraphToLines(headLine, medium, authorSize, ctx.maxW);
    const titleLines = wrapParagraphToLines(entry.titleAllCaps, regular, titleSize, ctx.maxW);
    const affLines = wrapParagraphToLines(entry.affiliationItalic, italic, affSize, ctx.maxW);
    const bodyLines = wrapBodyToLines(entry.bodyText, regular, bodySize, ctx.maxW);

    drawWrappedLines(ctx, headLines.length ? headLines : [`${entry.displayNumber}. —`], medium, authorSize, BODY_COLOR, lhAuthor);
    drawWrappedLines(ctx, titleLines.length ? titleLines : ["—"], regular, titleSize, BODY_COLOR, lhTitle);
    drawWrappedLines(ctx, affLines.length ? affLines : ["—"], italic, affSize, MUTED_COLOR, lhAff);
    drawWrappedLines(ctx, bodyLines, regular, bodySize, BODY_COLOR, lhBody);
    ensureSpace(ctx, gapAfterEntry);
    ctx.cursorY -= gapAfterEntry;
  }

  const bytes = await doc.save({ useObjectStreams: true });
  return Buffer.from(bytes);
}
