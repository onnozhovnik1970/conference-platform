type PdfMakeInstance = {
  vfs: Record<string, string>;
  createPdf: (docDefinition: object) => {
    getBuffer: (cb: (buffer: Buffer) => void) => void;
  };
};

/** pdfmake 0.3.x: `vfs_fonts` is the vfs map itself; older snippets used `{ pdfMake: { vfs } }`. */
function resolvePdfmakeVfs(mod: unknown): Record<string, string> {
  if (!mod || typeof mod !== "object") {
    return {};
  }
  const o = mod as { pdfMake?: unknown; default?: unknown };
  if (o.pdfMake && typeof o.pdfMake === "object" && "vfs" in o.pdfMake) {
    const vfs = (o.pdfMake as { vfs?: Record<string, string> }).vfs;
    if (vfs && typeof vfs === "object") {
      return vfs;
    }
  }
  const d = o.default;
  if (d && typeof d === "object" && !("pdfMake" in d)) {
    return d as Record<string, string>;
  }
  return mod as Record<string, string>;
}

export function renderCertificatePdfBuffer(docDefinition: object): Promise<Buffer> {
  // pdfmake ships Roboto + Cyrillic in vfs_fonts (no filesystem fonts required; works on Vercel).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfMake = require("pdfmake/build/pdfmake") as PdfMakeInstance;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vfsFontsModule = require("pdfmake/build/vfs_fonts") as unknown;
  pdfMake.vfs = resolvePdfmakeVfs(vfsFontsModule);

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
