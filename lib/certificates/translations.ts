/** Locales supported for certificate chrome (static strings). */
export type CertificateLanguage = "en" | "de" | "pl" | "cs";

export type CertificateStrings = {
  conferenceHeader: string;
  certificateTitle: string;
  certifiesThat: string;
  hasPresentedPaper: string;
};

export const CERTIFICATE_TRANSLATIONS: Record<CertificateLanguage, CertificateStrings> = {
  en: {
    conferenceHeader: "INTERNATIONAL SCIENTIFIC CONFERENCE",
    certificateTitle: "CERTIFICATE OF PARTICIPATION",
    certifiesThat: "This certifies that",
    hasPresentedPaper: "has presented a paper entitled"
  },
  de: {
    conferenceHeader: "INTERNATIONALE WISSENSCHAFTLICHE KONFERENZ",
    certificateTitle: "TEILNAHMEZERTIFIKAT",
    certifiesThat: "Hiermit wird bestätigt, dass",
    hasPresentedPaper: "einen Beitrag präsentiert hat mit dem Titel"
  },
  pl: {
    conferenceHeader: "MIĘDZYNARODOWA KONFERENCJA NAUKOWA",
    certificateTitle: "CERTYFIKAT UCZESTNICTWA",
    certifiesThat: "Niniejszym zaświadcza się, że",
    hasPresentedPaper: "zaprezentował/a referat pt."
  },
  cs: {
    conferenceHeader: "MEZINÁRODNÍ VĚDECKÁ KONFERENCE",
    certificateTitle: "CERTIFIKÁT O ÚČASTI",
    certifiesThat: "Tímto se potvrzuje, že",
    hasPresentedPaper: "prezentoval/a příspěvek s názvem"
  }
};

const LOWER_ABSTRACT_LANG_TO_CERT: Record<string, CertificateLanguage> = {
  english: "en",
  german: "de",
  polish: "pl",
  czech: "cs"
};

/** Map `submissions.abstract_language` (dashboard values) to certificate UI language. */
export function certificateLanguageFromAbstractLanguage(raw: string | null | undefined): CertificateLanguage {
  const key = (raw ?? "").trim().toLowerCase();
  return LOWER_ABSTRACT_LANG_TO_CERT[key] ?? "en";
}

/** Normalize `?lang=` / request hints to a supported certificate language. */
export function resolveCertificateLanguage(raw: string | null | undefined): CertificateLanguage | null {
  if (raw == null || raw === "") {
    return null;
  }
  const k = raw.trim().toLowerCase();
  if (k === "en" || k === "english") {
    return "en";
  }
  if (k === "de" || k === "german") {
    return "de";
  }
  if (k === "pl" || k === "polish") {
    return "pl";
  }
  if (k === "cs" || k === "czech") {
    return "cs";
  }
  return null;
}

export function getCertificateStrings(lang: CertificateLanguage): CertificateStrings {
  return CERTIFICATE_TRANSLATIONS[lang] ?? CERTIFICATE_TRANSLATIONS.en;
}

const DATE_LOCALES: Record<CertificateLanguage, string> = {
  en: "en-US",
  de: "de-DE",
  pl: "pl-PL",
  cs: "cs-CZ"
};

/** Long conference date for the orange line under the paper title (uses noon UTC for the date column). */
export function formatCertificateVenueDateLine(
  locationDisplay: string,
  isoDate: string | null | undefined,
  lang: CertificateLanguage
): string {
  const loc = (locationDisplay ?? "").trim() || "Online";
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate.trim())) {
    return loc;
  }
  const d = new Date(`${isoDate.trim()}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    return loc;
  }
  const formatted = new Intl.DateTimeFormat(DATE_LOCALES[lang], { dateStyle: "long", timeZone: "UTC" }).format(d);
  return `${loc} — ${formatted}`;
}
