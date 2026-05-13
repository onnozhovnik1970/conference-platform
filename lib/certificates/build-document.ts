import type { CertificatePayload } from "@/lib/certificates/fetch-payloads";

/** pdfmake document definition (typed loosely for compatibility). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildCertificateDocumentDefinition(payload: CertificatePayload): any {
  const kv = (labelUa: string, labelEn: string, value: string) => ({
    margin: [0, 0, 0, 10],
    stack: [
      { text: `${labelUa} / ${labelEn}`, style: "fieldLabel" },
      { text: value, style: "fieldValue" }
    ]
  });

  return {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [48, 56, 48, 56],
    defaultStyle: {
      font: "Roboto",
      fontSize: 10.5,
      color: "#1e293b"
    },
    background: (currentPage: number, pageSize: { width: number; height: number }) => {
      if (currentPage !== 1) {
        return [];
      }
      return [
        {
          canvas: [
            {
              type: "rect",
              x: 26,
              y: 26,
              w: pageSize.width - 52,
              h: pageSize.height - 52,
              r: 3,
              lineWidth: 2,
              lineColor: "#b8860b"
            },
            {
              type: "rect",
              x: 34,
              y: 34,
              w: pageSize.width - 68,
              h: pageSize.height - 68,
              r: 2,
              lineWidth: 0.5,
              lineColor: "#e2cfa5"
            }
          ]
        }
      ];
    },
    content: [
      {
        text: "CERTIFICATE OF PARTICIPATION",
        style: "topRibbon",
        alignment: "center",
        margin: [0, 6, 0, 2]
      },
      {
        text: "Грамота учасника",
        style: "topRibbonUa",
        alignment: "center",
        margin: [0, 0, 0, 14]
      },
      {
        text: payload.titleUa,
        style: "confTitleUa",
        alignment: "center",
        margin: [0, 0, 0, 2]
      },
      {
        text: payload.titleEn,
        style: "confTitleEn",
        alignment: "center",
        margin: [0, 0, 0, 10]
      },
      {
        text: payload.locationDisplay,
        style: "locationLine",
        alignment: "center",
        margin: [0, 0, 0, 18]
      },
      {
        text: "This is to certify that / Цим підтверджується, що",
        style: "certifyLine",
        alignment: "center",
        margin: [0, 0, 0, 10]
      },
      {
        text: payload.participantName,
        style: "participantName",
        alignment: "center",
        margin: [0, 0, 0, 18]
      },
      kv("Назва тез", "Abstract title", payload.abstractTitle),
      kv("Секція", "Section", payload.sectionBilingual),
      kv("Науковий керівник", "Supervisor", payload.supervisorBlock),
      kv("Заклад", "Institution", payload.institution),
      kv("Дата конференції (UA)", "Conference date (EN)", `${payload.dateUa}\n${payload.dateEn}`),
      { text: "", margin: [0, 14, 0, 0] },
      {
        columns: [
          { width: "*", text: "" },
          {
            width: 220,
            stack: [
              { canvas: [{ type: "line", x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.75, lineColor: "#334155" }] },
              { text: "Підпис організатора / Organizer signature", style: "sigCaption", margin: [0, 6, 0, 0] }
            ]
          },
          { width: "*", text: "" }
        ]
      }
    ],
    styles: {
      topRibbon: { fontSize: 9, bold: true, letterSpacing: 2, color: "#92400e" },
      topRibbonUa: { fontSize: 10, bold: true, color: "#78350f" },
      confTitleUa: { fontSize: 13, bold: true, color: "#0f172a" },
      confTitleEn: { fontSize: 11, italics: true, color: "#475569" },
      locationLine: { fontSize: 10, color: "#334155" },
      certifyLine: { fontSize: 9, color: "#64748b" },
      participantName: { fontSize: 18, bold: true, color: "#0f172a" },
      fieldLabel: { fontSize: 8, bold: true, color: "#64748b" },
      fieldValue: { fontSize: 11, color: "#0f172a", margin: [0, 2, 0, 0] },
      sigCaption: { fontSize: 8, color: "#64748b", alignment: "center" }
    }
  };
}
