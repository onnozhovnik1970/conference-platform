import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type SubmitAbstractPayload = {
  participantId: string;
  abstractTitle: string;
  fileName: string;
  abstractText: string;
  aiReview: string;
  aiScore: "accepted" | "needs_revision" | "rejected";
};

function normalizeSupabaseUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.origin;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<SubmitAbstractPayload>;
    console.log("[abstract/submit] Request received", {
      bodyKeys: Object.keys(body ?? {})
    });
    const payload: SubmitAbstractPayload = {
      participantId: body.participantId ?? "",
      abstractTitle: body.abstractTitle ?? "",
      fileName: body.fileName ?? "",
      abstractText: body.abstractText ?? "",
      aiReview: body.aiReview ?? "",
      aiScore: (body.aiScore ?? "needs_revision") as SubmitAbstractPayload["aiScore"]
    };

    if (
      !payload.participantId.trim() ||
      !payload.abstractTitle.trim() ||
      !payload.fileName.trim() ||
      !payload.abstractText.trim() ||
      !payload.aiReview.trim() ||
      !["accepted", "needs_revision", "rejected"].includes(payload.aiScore)
    ) {
      console.error("[abstract/submit] Invalid payload", {
        participantId: payload.participantId ? "present" : "missing",
        abstractTitle: payload.abstractTitle ? "present" : "missing",
        fileName: payload.fileName ? "present" : "missing",
        abstractTextLength: payload.abstractText.length,
        aiReviewLength: payload.aiReview.length,
        aiScore: payload.aiScore
      });
      return NextResponse.json({ success: false, error: "Invalid abstract submission payload." }, { status: 400 });
    }
    console.log("[abstract/submit] Payload validation passed", {
      participantId: payload.participantId,
      abstractTitleLength: payload.abstractTitle.length,
      fileName: payload.fileName,
      abstractTextLength: payload.abstractText.length,
      aiReviewLength: payload.aiReview.length,
      aiScore: payload.aiScore
    });

    const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = supabaseUrlRaw ? normalizeSupabaseUrl(supabaseUrlRaw) : null;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("[abstract/submit] Missing Supabase server credentials", {
        hasUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(supabaseServiceRoleKey)
      });
      return NextResponse.json({ success: false, error: "Supabase server credentials are not configured." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { error } = await supabase.from("abstracts").insert({
      participant_id: payload.participantId.trim(),
      abstract_title: payload.abstractTitle.trim(),
      file_name: payload.fileName.trim(),
      abstract_text: payload.abstractText.trim(),
      ai_review: payload.aiReview.trim(),
      ai_score: payload.aiScore,
      status: "submitted"
    });

    if (error) {
      console.error("[abstract/submit] Failed to save abstract", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    console.log("[abstract/submit] Abstract saved successfully", {
      participantId: payload.participantId,
      fileName: payload.fileName
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[abstract/submit] Invalid request body", error);
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }
}
