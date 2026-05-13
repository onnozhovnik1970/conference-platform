type PdfMakeInstance = {
  vfs: Record<string, string>;
  createPdf: (docDefinition: object) => {
    getBuffer: (cb: (buffer: Buffer) => void) => void;
  };
};

export function renderCertificatePdfBuffer(docDefinition: object): Promise<Buffer> {
  // pdfmake ships Roboto + Cyrillic in vfs_fonts (no filesystem fonts required; works on Vercel).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfMake = require("pdfmake/build/pdfmake") as PdfMakeInstance;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfFonts = require("pdfmake/build/vfs_fonts") as { pdfMake: { vfs: Record<string, string> } };
  pdfMake.vfs = pdfFonts.pdfMake.vfs;

  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).getBuffer((buffer: Buffer) => {
        resolve(buffer);
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error("PDF render failed"));
    }
  });
}
