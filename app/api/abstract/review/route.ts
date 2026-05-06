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

    console.log("Extracted text length:", extractedText.length);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API key not configured" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `You are a scientific reviewer. Review these conference abstracts and respond ONLY with valid JSON, no other text:\n\nTitle: ${abstractTitle}\n\nText: ${extractedText.substring(0, 3000)}\n\nRespond with exactly this JSON structure:\n{"score":8,"verdict":"Recommended","feedback":"Your feedback here","suggestions":["Suggestion 1","Suggestion 2"]}`
      }]
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    console.log("RAW RESPONSE:", rawText.substring(0, 300));

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ success: false, error: "Could not parse AI response" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, ...result });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Review error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
