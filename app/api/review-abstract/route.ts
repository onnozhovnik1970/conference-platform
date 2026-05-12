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
      // mammoth.convertToMarkdown exists at runtime; bundled typings omit it
      const result = await (
        mammoth as unknown as {
          convertToMarkdown: (input: { buffer: Buffer }) => Promise<{ value: string }>;
        }
      ).convertToMarkdown({ buffer });
      extractedText = result.value;
    } else {
      return NextResponse.json({ success: false, error: "Only .docx files supported" }, { status: 400 });
    }

    console.log("Extracted length:", extractedText.length);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const client = new Anthropic({ apiKey });

    const maxInputChars = 16000;

    const systemPrompt = `You are a Digital Assistant for the SUTE Student Scientific-Practical Conference. Your task is to evaluate student conference abstracts according to the official requirements below.

OFFICIAL FORMATTING REQUIREMENTS:
- Volume: up to 3-6 pages including references, figures, tables
- Format: A4, font Times New Roman 14pt (not 15pt), line spacing 1.5, margins 20mm all sides
- Text: no hyphenation, justified alignment, paragraph indent 1.25cm automatic
- Author info: top right corner, italics - full name (no abbreviations), year of study, group, specialty, institution, city, country
- Supervisor info: after author, italics - full name, academic title, degree, position, institution
- Title: centered, ALL CAPS, bold Times New Roman
- References font: Times New Roman 12pt, line spacing 1.0
- In-text citations: [3, с. 16] or [3, p. 16] format
- Citation placement (Ukrainian / international academic style): the bracketed citation must come AFTER the sentence-ending punctuation, not before. Correct: "…результат дослідження. [1]" or "…research finding. [1]". Incorrect: "…результат дослідження [1]." or "…research finding [1]." Flag the latter pattern in formattingIssues when you see it.
- Paragraph spacing: spacing between paragraphs should be consistent (uniform blank lines in the extracted Markdown). If some blocks are separated by one blank line and others by two or more, or spacing is clearly irregular, flag it as a formatting issue under formattingIssues.
- References: alphabetical order (Ukrainian first, then foreign), formatted strictly per DSTU 8302:2015
- Pages: NOT numbered
- File name format: Surname_section_N

DSTU 8302:2015 KEY RULES FOR REFERENCES:
- Journal article: Author A. Title // Journal name. – Year. – Vol. N, No N. – P. N–N.
- Web source: Title [Electronic resource] / Author. – URL: http://... (access date: DD.MM.YYYY).
- Book: Author A. Title / A. Author. – City : Publisher, Year. – N p.
- Web sources MUST include access date in format (дата звернення: DD.MM.YYYY) or (accessed: DD.MM.YYYY)
- Old Soviet/Russian format "– Режим доступу:" is NOT acceptable per DSTU 8302:2015

EVALUATION CRITERIA (score out of 10):
1. CONTENT AND ANALYTICAL QUALITY (50%): topic relevance, author's own analysis, logical argumentation, clear research objective, conclusions
2. STRUCTURE AND LOGIC (20%): presence of introduction/relevance, objective, main body, conclusions, bibliography
3. SOURCE QUALITY AND CITATION (20%): minimum 3-5 sources, real and verifiable, properly cited in text, formatted per DSTU 8302:2015
4. TECHNICAL FORMATTING (10%): correct author/supervisor block, title formatting, reference formatting, margins, font, consistent paragraph spacing in the extracted text, correct placement of in-text citations relative to sentence-ending punctuation

PLAGIARISM AND AI-GENERATED CONTENT DETECTION: Analyze the text for signs of plagiarism or fully AI-generated content. Look for: 1) unusually formal or inconsistent writing style that switches between simple and overly complex language, 2) generic phrases without specific examples or data, 3) text that reads like a Wikipedia summary without original analysis, 4) inconsistent terminology or citation style suggesting copy-paste from multiple sources, 5) lack of author's own position or conclusions. Add plagiarismWarning field to JSON response: null if no concerns, or a specific warning string if suspicious patterns are found.

AUTOMATIC SCORE REDUCTION:
- Russian or Soviet sources (published in Russian in any country, OR any language published in russia/belarus): CRITICAL VIOLATION - reduce score by 3 points and flag explicitly
- No in-text citations: reduce by 2 points
- Plagiarism indicators or fully AI-generated text without analysis: reduce by 2 points
- Prohibited topics (propaganda, hate speech, justifying aggression): automatic rejection

IMPORTANT: The abstract text is extracted from docx as Markdown: paragraph breaks and basic emphasis (bold/italic) are preserved, but exact Word layout (margins, alignment, precise typography) is not. Author and supervisor information typically appears at the very beginning of the text as the first lines. Do not flag missing author/supervisor info if names, year of study, faculty, institution and supervisor details are present anywhere in the first 10 lines of the text.

IMPORTANT FOR REFERENCES: Markdown extraction may still alter or simplify punctuation and spacing compared to the original Word document. When checking DSTU 8302:2015 compliance, focus on the presence of key elements (author, title, year, URL, access date) rather than exact punctuation formatting. Only flag references as non-compliant if key required elements are genuinely missing (e.g. no access date for web sources, no author, no year). Do not penalize for minor punctuation differences that may be caused by extraction.

COMMON STUDENT ERRORS TO CHECK:
- Inconsistent paragraph spacing (irregular blank lines between paragraphs in the Markdown extract)
- In-text citations placed before the period or full stop instead of after it (e.g. wrong: "…текст [1]."; right: "…текст. [1]")
- "– Режим доступу:" format (old Soviet standard, not DSTU 8302:2015 compliant)
- Missing access dates for web sources
- Author info not in italics or not right-aligned
- Supervisor credentials incomplete
- Title not in ALL CAPS or not bold
- Missing research objective sentence
- Weak or absent conclusions
- Sources not in alphabetical order
- In-text citation format wrong (e.g., (Author, 2020) instead of [1, с. 5])

RESPONSE FORMAT (JSON only, no markdown):
{
  "score": number (0-10),
  "scoreMax": 10,
  "summary": "2-3 sentence overall assessment in the response language",
  "issues": ["specific issue 1", "specific issue 2", ...],
  "recommendations": ["specific recommendation 1", ...],
  "formattingIssues": ["formatting issue 1", ...],
  "russianSourcesFound": boolean,
  "russianSourcesList": ["source 1 if found", ...],
  "plagiarismWarning": string | null
}

Respond entirely in ${responseLanguageLabel}.`;

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 6000,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: `Abstract title: ${abstractTitle}\n\nAbstract text:\n${extractedText.substring(0, maxInputChars)}`
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
      plagiarismWarning: result.plagiarismWarning ?? null,
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
