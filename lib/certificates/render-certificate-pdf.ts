import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import sharp from "sharp";

import type { CertificatePayload } from "@/lib/certificates/fetch-payloads";
import {
  formatCertificateVenueDateLine,
  getCertificateStrings,
  type CertificateLanguage
} from "@/lib/certificates/translations";

const CERT_DIR = join(process.cwd(), "lib", "certificates");
const TEMPLATE_SVG_PATH = join(CERT_DIR, "certificate-template.svg");
const FONTS_DIR = join(CERT_DIR, "fonts");

/** Landscape A4 in PDF points (72 dpi). */
const PAGE_W = 841.89;
const PAGE_H = 595.28;

const NAME_SIZE_PT = 48;
const PAPER_TITLE_SIZE_PT = 22;
const NAME_COLOR = rgb(26 / 255, 26 / 255, 46 / 255);
const PAPER_TITLE_COLOR = rgb(108 / 255, 99 / 255, 255 / 255);

const HEADER_COLOR = rgb(253 / 255, 186 / 255, 116 / 255);
const TITLE_COLOR = rgb(15 / 255, 23 / 255, 42 / 255);
const CERTIFIES_COLOR = rgb(30 / 255, 41 / 255, 59 / 255);
const HAS_PRESENTED_COLOR = rgb(148 / 255, 163 / 255, 184 / 255);
const DATE_LINE_COLOR = rgb(234 / 255, 88 / 255, 12 / 255);

const H_MARGIN_PT = 56;
const RASTER_SCALE = 2;

/** Vertical layout: fraction from top (0 = top, 1 = bottom) for block center. */
const FR_CONFERENCE = 52 / PAGE_H;
const FR_CERT_TITLE = 133 / PAGE_H;
const FR_CERTIFIES = 208 / PAGE_H;
/** Participant name center — ~one line closer to "This certifies that" than previous 0.58. */
const OFFSET_CERTIFIES_TO_NAME_PT = 78;
const FR_NAME = FR_CERTIFIES + OFFSET_CERTIFIES_TO_NAME_PT / PAGE_H;
const FR_HAS_PRESENTED = 0.64;
const FR_PAPER = 0.72;
const FR_DATE_LINE = 0.8;

let templatePngCache: Promise<Buffer> | null = null;
const customTemplatePngCache = new Map<string, Promise<Buffer>>();

function safePublicFilePath(urlPath: string): string | null {
  const rel = urlPath.trim().replace(/^\/+/u, "").replace(/\\/g, "/");
  if (!rel || rel.split("/").includes("..")) {
    return null;
  }
  const pubRoot = resolve(process.cwd(), "public");
  const candidate = resolve(pubRoot, rel);
  const relFromPub = relative(pubRoot, candidate);
  if (!relFromPub || relFromPub.startsWith("..") || isAbsolute(relFromPub)) {
    return null;
  }
  return candidate;
}

async function rasterizeTemplateSvg(): Promise<Buffer> {
  if (!existsSync(TEMPLATE_SVG_PATH)) {
    throw new Error(
      `Certificate template not found at ${TEMPLATE_SVG_PATH}. Place certificate-template.svg in lib/certificates/.`
    );
  }
  if (!templatePngCache) {
    templatePngCache = (async () => {
      const svg = readFileSync(TEMPLATE_SVG_PATH);
      const w = Math.round(PAGE_W * RASTER_SCALE);
      const h = Math.round(PAGE_H * RASTER_SCALE);
      return sharp(svg, { density: 300 }).resize(w, h, { fit: "fill" }).png().toBuffer();
    })();
  }
  return templatePngCache;
}

async function rasterizeImageBytesToPng(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  const isSvg = meta.format === "svg";
  const w = Math.round(PAGE_W * RASTER_SCALE);
  const h = Math.round(PAGE_H * RASTER_SCALE);
  const pipeline = isSvg ? sharp(input, { density: 300 }) : sharp(input);
  return pipeline.resize(w, h, { fit: "fill" }).png().toBuffer();
}

async function loadCustomTemplatePng(trimmedUrl: string): Promise<Buffer | null> {
  try {
    let input: Buffer;
    if (/^https?:\/\//i.test(trimmedUrl)) {
      const res = await fetch(trimmedUrl, { redirect: "follow" });
      if (!res.ok) {
        return null;
      }
      input = Buffer.from(await res.arrayBuffer());
    } else if (trimmedUrl.startsWith("/")) {
      const abs = safePublicFilePath(trimmedUrl);
      if (!abs || !existsSync(abs)) {
        return null;
      }
      input = readFileSync(abs);
    } else {
      return null;
    }
    return rasterizeImageBytesToPng(input);
  } catch {
    return null;
  }
}

/**
 * Raster background for one certificate page: optional URL/path from settings, else bundled SVG.
 */
async function getCertificateBackgroundPng(templateUrl: string | null | undefined): Promise<Buffer> {
  const trimmed = templateUrl?.trim();
  if (!trimmed) {
    return rasterizeTemplateSvg();
  }
  let cached = customTemplatePngCache.get(trimmed);
  if (!cached) {
    cached = (async () => {
      const custom = await loadCustomTemplatePng(trimmed);
      return custom ?? (await rasterizeTemplateSvg());
    })();
    customTemplatePngCache.set(trimmed, cached);
  }
  return cached;
}

function wrapToLines(text: string, font: PDFFont, fontSize: number, maxWidth: number, maxLines: number): string[] {
  const words = (text.trim() || "—").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let buf = "";

  const pushBuf = () => {
    if (buf) {
      lines.push(buf);
      buf = "";
    }
  };

  for (const w of words) {
    if (lines.length >= maxLines) {
      return lines;
    }
    const trial = buf ? `${buf} ${w}` : w;
    if (font.widthOfTextAtSize(trial, fontSize) <= maxWidth) {
      buf = trial;
      continue;
    }
    pushBuf();
    if (lines.length >= maxLines) {
      return lines;
    }
    if (font.widthOfTextAtSize(w, fontSize) <= maxWidth) {
      buf = w;
      continue;
    }
    let rest = w;
    while (rest.length && lines.length < maxLines) {
      let n = rest.length;
      while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), fontSize) > maxWidth) {
        n -= 1;
      }
      lines.push(rest.slice(0, n));
      rest = rest.slice(n);
    }
  }
  if (buf && lines.length < maxLines) {
    lines.push(buf);
  }
  return lines.length > 0 ? lines : ["—"];
}

/** `fractionFromTop`: 0 = top edge, 1 = bottom edge (PDF y increases upward). */
function drawCenteredBlock(
  page: PDFPage,
  lines: string[],
  font: PDFFont,
  fontSize: number,
  color: ReturnType<typeof rgb>,
  fractionFromTop: number
): void {
  const lineHeight = fontSize * 1.22;
  const n = lines.length;
  const yCenter = PAGE_H * (1 - fractionFromTop);
  const asc = fontSize * 0.35;
  let y = yCenter - asc + ((n - 1) * lineHeight) / 2;

  for (const line of lines) {
    const tw = font.widthOfTextAtSize(line, fontSize);
    page.drawText(line, {
      x: (PAGE_W - tw) / 2,
      y,
      size: fontSize,
      font,
      color
    });
    y -= lineHeight;
  }
}

function drawCenteredSingleLine(
  page: PDFPage,
  text: string,
  font: PDFFont,
  fontSize: number,
  color: ReturnType<typeof rgb>,
  fractionFromTop: number
): void {
  drawCenteredBlock(page, [text], font, fontSize, color, fractionFromTop);
}

/**
 * Landscape certificate: background from `certificateTemplateUrl` (PNG/SVG path or URL) or bundled SVG,
 * static strings from {@link getCertificateStrings}, then participant name and abstract title.
 */
export async function renderCertificatePdfBuffer(payload: CertificatePayload): Promise<Buffer> {
  const lang: CertificateLanguage = payload.certificateLanguage ?? "en";
  const strings = getCertificateStrings(lang);

  const pngBuffer = await getCertificateBackgroundPng(payload.certificateTemplateUrl);
  const regularBytes = readFileSync(join(FONTS_DIR, "Roboto-Regular.ttf"));
  const mediumBytes = readFileSync(join(FONTS_DIR, "Roboto-Medium.ttf"));
  const italicBytes = readFileSync(join(FONTS_DIR, "Roboto-Italic.ttf"));

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const png = await pdfDoc.embedPng(pngBuffer);
  page.drawImage(png, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });

  const fontRegular = await pdfDoc.embedFont(regularBytes);
  const fontMedium = await pdfDoc.embedFont(mediumBytes);
  const fontItalic = await pdfDoc.embedFont(italicBytes);

  const textW = PAGE_W - 2 * H_MARGIN_PT;

  const conferenceLines = wrapToLines(strings.conferenceHeader, fontRegular, 10.5, textW, 2);
  drawCenteredBlock(page, conferenceLines, fontRegular, 10.5, HEADER_COLOR, FR_CONFERENCE);

  const titleLines = wrapToLines(strings.certificateTitle, fontMedium, 19, textW, 2);
  drawCenteredBlock(page, titleLines, fontMedium, 19, TITLE_COLOR, FR_CERT_TITLE);

  drawCenteredSingleLine(page, strings.certifiesThat, fontItalic, 12, CERTIFIES_COLOR, FR_CERTIFIES);

  const nameLines = wrapToLines(payload.participantName, fontItalic, NAME_SIZE_PT, textW, 3);
  drawCenteredBlock(page, nameLines, fontItalic, NAME_SIZE_PT, NAME_COLOR, FR_NAME);

  const hasPresentedLines = wrapToLines(strings.hasPresentedPaper, fontItalic, 11, textW, 2);
  drawCenteredBlock(page, hasPresentedLines, fontItalic, 11, HAS_PRESENTED_COLOR, FR_HAS_PRESENTED);

  const paperLines = wrapToLines(payload.abstractTitle, fontItalic, PAPER_TITLE_SIZE_PT, textW, 5);
  drawCenteredBlock(page, paperLines, fontItalic, PAPER_TITLE_SIZE_PT, PAPER_TITLE_COLOR, FR_PAPER);

  const venueDate = formatCertificateVenueDateLine(payload.locationDisplay, payload.conferenceDateIso, lang);
  const dateLines = wrapToLines(venueDate, fontRegular, 11, textW, 2);
  drawCenteredBlock(page, dateLines, fontRegular, 11, DATE_LINE_COLOR, FR_DATE_LINE);

  const bytes = await pdfDoc.save({ useObjectStreams: true });
  return Buffer.from(bytes);
}
