import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

import { loadConferenceEmailBundle } from "@/lib/email/conference-email-bundle";
import { getResendEnv } from "@/lib/email/resend-config";
import { buildWelcomeRegistrationHtml } from "@/lib/email/welcome-registration-html";

export async function sendRegistrationWelcomeEmail(
  supabase: SupabaseClient,
  opts: { to: string; firstName: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const env = getResendEnv();
  if (!env) {
    return { ok: false, error: "RESEND_API_KEY or RESEND_FROM_EMAIL missing" };
  }
  try {
    const bundle = await loadConferenceEmailBundle(supabase);
    const html = buildWelcomeRegistrationHtml({ firstName: opts.firstName, bundle });
    const resend = new Resend(env.apiKey);
    const { error } = await resend.emails.send({
      from: env.from,
      to: [opts.to.trim().toLowerCase()],
      subject: "Ласкаво просимо / Welcome — SUTE Conference",
      html
    });
    if (error) {
      return { ok: false, error: error.message ?? "Resend error" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
