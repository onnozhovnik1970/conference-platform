import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const abstractTitle = formData.get("abstractTitle") as string;

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

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: `You are a scientific abstract reviewer.

Analyze the submitted abstract and provide:
1) Overall quality score out of 10
2) List of issues and inconsistencies found
3) Specific recommendations for improvement
4) Formatting issues

Do NOT provide a corrected version of the text.
Respond in the same language as the submitted abstract (Ukrainian or English).

Abstract title: ${abstractTitle}
Abstract text: ${extractedText.substring(0, 2500)}

IMPORTANT RULES:
- Respond ONLY with valid JSON (no markdown, no extra text)
- Keep all values plain text
- Use the same language as the abstract for all textual fields

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
      abstractText: extractedText,
      fileName: file.name
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("=== ERROR:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
