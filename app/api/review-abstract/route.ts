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
        content: `You are a scientific secretary of SUTE Conference 2026 reviewing student conference abstracts.

Evaluate strictly on these criteria:
1. STRUCTURE: Essay format — relevance, thesis, argumentation with references, conclusion. Methods/results only if empirical.
2. SOURCES: DSTU 8302:2015 style. Min 3 sources. Recent Ukrainian/English sources preferred. No Russian sources.
3. LANGUAGE: Academic Ukrainian style, proper terminology, no colloquialisms.
4. CONTENT: Relevance to conference panels (Economics, IT, Philology, International Trade, Management, Psychology).

Abstract title: ${abstractTitle}
Abstract text: ${extractedText.substring(0, 2500)}

IMPORTANT RULES:
- Respond ONLY with valid JSON, no markdown, no text outside JSON
- All text fields must be plain text only, no asterisks, no bold, no markdown
- reviewStructure_uk must start with "Структура:", reviewStructure_en must start with "Structure:"
- reviewSources_uk must start with "Джерела:", reviewSources_en must start with "Sources:"
- reviewLanguage_uk must start with "Мова:", reviewLanguage_en must start with "Language:"
- reviewContent_uk must start with "Зміст:", reviewContent_en must start with "Content:"
- correctedText_uk and correctedText_en: provide FULL corrected version of the abstract, same length as original
- Give specific actionable feedback, mention exact problems, avoid generic phrases
- No line breaks inside JSON string values

Respond with this exact JSON structure:
{"scoreStructure":4,"scoreStructureMax":5,"scoreSources":3,"scoreSourcesMax":5,"scoreLanguage":5,"scoreLanguageMax":5,"scoreContent":4,"scoreContentMax":5,"overallVerdict_uk":"Потребує незначного доопрацювання","overallVerdict_en":"Needs minor revision","reviewStructure_uk":"Структура: конкретний відгук","reviewStructure_en":"Structure: specific feedback","reviewSources_uk":"Джерела: конкретний відгук","reviewSources_en":"Sources: specific feedback","reviewLanguage_uk":"Мова: конкретний відгук","reviewLanguage_en":"Language: specific feedback","reviewContent_uk":"Зміст: конкретний відгук","reviewContent_en":"Content: specific feedback","correctedText_uk":"повний виправлений текст українською","correctedText_en":"full corrected text in English"}`
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
      scoreStructure: result.scoreStructure,
      scoreStructureMax: result.scoreStructureMax,
      scoreSources: result.scoreSources,
      scoreSourcesMax: result.scoreSourcesMax,
      scoreLanguage: result.scoreLanguage,
      scoreLanguageMax: result.scoreLanguageMax,
      scoreContent: result.scoreContent,
      scoreContentMax: result.scoreContentMax,
      overallVerdict_uk: result.overallVerdict_uk,
      overallVerdict_en: result.overallVerdict_en,
      reviewStructure_uk: result.reviewStructure_uk,
      reviewStructure_en: result.reviewStructure_en,
      reviewSources_uk: result.reviewSources_uk,
      reviewSources_en: result.reviewSources_en,
      reviewLanguage_uk: result.reviewLanguage_uk,
      reviewLanguage_en: result.reviewLanguage_en,
      reviewContent_uk: result.reviewContent_uk,
      reviewContent_en: result.reviewContent_en,
      abstractText: extractedText,
      correctedText_uk: result.correctedText_uk,
      correctedText_en: result.correctedText_en,
      fileName: file.name
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("=== ERROR:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
