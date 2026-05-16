/** Participant dashboard — persisted AI review on `submissions`. */

export type DashboardAiSubmissionRow = {
  ai_score?: unknown;
  ai_summary?: string | null;
  ai_issues?: string[] | null;
  ai_recommendations?: string[] | null;
  ai_formatting_issues?: string[] | null;
};

export type DashboardReviewResult = {
  success?: boolean;
  error?: string;
  score?: number;
  scoreMax?: number;
  issues?: string[];
  recommendations?: string[];
  formattingIssues?: string[];
  summary?: string;
  fileName?: string;
  motivationalMessage?: string;
  plagiarismWarning?: string | null;
};

export function parseAiScore(value: unknown): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function rowHasAiReport(row: DashboardAiSubmissionRow | null | undefined): boolean {
  if (!row) {
    return false;
  }
  if (parseAiScore(row.ai_score) !== undefined) {
    return true;
  }
  if (row.ai_summary?.trim()) {
    return true;
  }
  if (Array.isArray(row.ai_issues) && row.ai_issues.length > 0) {
    return true;
  }
  if (Array.isArray(row.ai_recommendations) && row.ai_recommendations.length > 0) {
    return true;
  }
  if (Array.isArray(row.ai_formatting_issues) && row.ai_formatting_issues.length > 0) {
    return true;
  }
  return false;
}

export function reviewResultFromSubmissionRow(row: DashboardAiSubmissionRow): DashboardReviewResult {
  return {
    score: parseAiScore(row.ai_score),
    scoreMax: 10,
    issues: row.ai_issues ?? [],
    recommendations: row.ai_recommendations ?? [],
    formattingIssues: row.ai_formatting_issues ?? [],
    summary: row.ai_summary ?? undefined
  };
}

/** Prefer persisted DB fields; overlay ephemeral API-only fields from a fresh check. */
export function mergeReviewResults(
  persisted: DashboardReviewResult | null,
  session: DashboardReviewResult | null
): DashboardReviewResult | null {
  if (!persisted && !session) {
    return null;
  }
  if (!persisted) {
    return session;
  }
  if (!session) {
    return persisted;
  }
  return {
    ...persisted,
    ...session,
    issues: session.issues?.length ? session.issues : persisted.issues,
    recommendations: session.recommendations?.length ? session.recommendations : persisted.recommendations,
    formattingIssues: session.formattingIssues?.length ? session.formattingIssues : persisted.formattingIssues,
    summary: session.summary?.trim() ? session.summary : persisted.summary,
    score: session.score ?? persisted.score,
    scoreMax: session.scoreMax ?? persisted.scoreMax
  };
}

export function buildAiReviewDbPayload(result: DashboardReviewResult) {
  return {
    ai_score: result.score ?? null,
    ai_summary: result.summary?.trim() || null,
    ai_issues: result.issues ?? [],
    ai_recommendations: result.recommendations ?? [],
    ai_formatting_issues: result.formattingIssues ?? []
  };
}
