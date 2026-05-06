import { NextResponse } from "next/server";

import { anthropic } from "@/lib/anthropic";

export const runtime = "nodejs";

const AUTO_CORRECT_SYSTEM_PROMPT = `You are an expert editor for student conference abstracts.
Based on the review comments, rewrite the abstract so it satisfies required formatting/style constraints.
Keep the output in the same language as the abstract.
Return only the corrected abstract text without explanations.`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { abstractText?: string; aiReview?: string };
    const abstractText = body.abstractText?.trim() ?? "";
    const aiReview = body.aiReview?.trim() ?? "";

    if (!abstractText || !aiReview) {
      return NextResponse.json({ success: false, error: "Missing abstractText or aiReview." }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2200,
      system: AUTO_CORRECT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Review comments:\n${aiReview}\n\nOriginal abstract:\n${abstractText}`
        }
      ]
    });

    const correctedText = response.content.map((item) => ("text" in item ? item.text : "")).join("\n").trim();

    if (!correctedText) {
      return NextResponse.json({ success: false, error: "Claude returned an empty correction." }, { status: 502 });
    }

    return NextResponse.json({ success: true, correctedText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auto-correction failed.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
