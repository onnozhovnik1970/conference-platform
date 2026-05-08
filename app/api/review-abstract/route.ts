import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const abstractTitle = formData.get("abstractTitle") as string;
    const languageRaw = (formData.get("language") as string | null)?.toLowerCase();
    const language: "ua" | "en" = languageRaw === "en" ? "en" : "ua";
    const shouldRespondEnglish = language === "en";
    const responseLanguageLabel = shouldRespondEnglish ? "English" : "Ukrainian";
    const motivationalMessage = shouldRespondEnglish
      ? "Thank you for submitting your scientific materials. The recommendations provided are aimed at improving the quality of your work. We wish you success in preparing for the conference!"
      : "Дякуємо за подання наукових матеріалів. Наведені рекомендації спрямовані на підвищення якості вашої роботи. Бажаємо успіху у підготовці до конференції!";

    if (!file) {
      return NextResponse.json({ success: false, error: "File not uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";
    if (file.name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else {
      return NextResponse.json({ success: false, error: "Only .docx files supported" }, { status: 400 });
    }

    console.log("Extracted length:", extractedText.length);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const client = new Anthropic({ apiKey });

    const maxInputChars = 16000;

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 6000,
      messages: [{
        role: "user",
        content: `You are an expert reviewer of Ukrainian conference abstracts.

Evaluate the submitted abstract strictly by these criteria:
1) Formatting compliance: Times New Roman, 14 pt, proper margins, total length 3-4 pages.
2) Student and supervisor information: verify required details are present and correctly formatted.
3) Relevance of topic: assess alignment with conference theme and whether key modern trends are clearly highlighted.
4) Citation quality: references must be real, relevant, and formatted according to DSTU 8302:2015.
5) CRITICAL VIOLATION: detect any Russian or Soviet sources. If present, explicitly flag as a serious violation.

Scoring rules:
- Return overall score from 0 to 10 (scoreMax must be 10).
- If Russian or Soviet sources are detected, reduce score significantly and clearly explain the reason.

Response requirements:
- Do NOT provide a corrected full text.
- Always respond entirely in ${responseLanguageLabel}.
- Respond ONLY with valid JSON (no markdown, no extra text).
- Keep all values plain text.
- Use ${responseLanguageLabel} for all textual fields.

Abstract title: ${abstractTitle}
Abstract text: ${extractedText.substring(0, maxInputChars)}

Respond with this exact JSON structure:
{"score":7,"scoreMax":10,"issues":["Issue 1","Issue 2"],"recommendations":["Recommendation 1","Recommendation 2"],"formattingIssues":["Formatting issue 1","Formatting issue 2"],"summary":"Short overall summary"}`
      }]
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    console.log("RAW:", rawText.substring(0, 300));

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ success: false, error: "Could not parse AI response" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      success: true,
      score: result.score,
      scoreMax: result.scoreMax,
      issues: result.issues,
      recommendations: result.recommendations,
      formattingIssues: result.formattingIssues,
      summary: result.summary,
      motivationalMessage,
      abstractText: extractedText,
      fileName: file.name
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("=== ERROR:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
