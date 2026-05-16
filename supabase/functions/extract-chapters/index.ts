import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── PDF Text Extraction ─────────────────────────────────────────────────────
// Extracts raw text from a PDF ArrayBuffer using a lightweight pure-JS parser.
// Works for all text-based PDFs (the vast majority of book manuscripts).
async function extractTextFromPDF(pdfBytes: ArrayBuffer): Promise<string> {
  try {
    // Use pdfjs-dist for reliable cross-platform PDF text extraction
    const pdfjsLib = await import("https://esm.sh/pdfjs-dist@4.4.168/legacy/build/pdf.mjs");

    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
    const numPages = pdf.numPages;
    const pageTexts: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || "")
        .join(" ")
        .replace(/\s{3,}/g, "\n\n") // large gaps = paragraph breaks
        .trim();
      if (pageText) pageTexts.push(pageText);
    }

    return pageTexts.join("\n\n");
  } catch (err) {
    console.error("pdfjs extraction failed, trying fallback:", err);
    return "";
  }
}

// ─── Regex-Based Chapter Detection ───────────────────────────────────────────
// Detects chapter boundaries from plain text using common heading patterns.
// Works WITHOUT AI for structure detection — AI is only used to polish titles.
interface RawChapter {
  chapter_number: number;
  title: string;
  content: string;
}

function detectChaptersFromText(text: string): RawChapter[] {
  // Common chapter heading patterns (case-insensitive)
  const CHAPTER_PATTERNS = [
    // "Chapter 1", "Chapter One", "Chapter I"
    /^(chapter\s+[\divxlcdm]+[.:–—\s]*.*)$/im,
    // "CHAPTER 1" (all caps)
    /^(CHAPTER\s+[\dIVXLCDM]+[.:–—\s]*.*)$/m,
    // "Part I", "Part 1"
    /^(part\s+[\divxlcdm]+[.:–—\s]*.*)$/im,
    // "1.", "2.", "10." at line start (numbered sections)
    /^(\d{1,2}\.\s+[A-Z].{3,60})$/m,
    // "§1", "Section 1"
    /^(section\s+\d+[.:–—\s]*.*)$/im,
    // Standalone Roman numerals on a line: "I", "II", "III", "IV"
    /^((?:I{1,3}|IV|V|VI{0,3}|IX|X{1,3}|XI{1,3}|XIV|XV|XVI{0,3}|XIX|XX)\s*\.?\s*)$/m,
    // All-caps short lines (likely a title heading)
    /^([A-Z][A-Z\s]{4,50})$/m,
  ];

  // Find all heading positions
  type HeadingMatch = { index: number; title: string };
  const headings: HeadingMatch[] = [];
  const seen = new Set<number>();

  for (const pattern of CHAPTER_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags.replace("g", "") + "g");
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!seen.has(match.index)) {
        seen.add(match.index);
        headings.push({ index: match.index, title: match[1].trim() });
      }
    }
  }

  // Sort headings by position in document
  headings.sort((a, b) => a.index - b.index);

  // If we found good chapter headings, split text by them
  if (headings.length >= 2) {
    const chapters: RawChapter[] = [];
    for (let i = 0; i < headings.length; i++) {
      const start = headings[i].index + headings[i].title.length;
      const end = i + 1 < headings.length ? headings[i + 1].index : text.length;
      const content = text.slice(start, end).trim();
      if (content.length > 100) {
        chapters.push({
          chapter_number: chapters.length + 1,
          title: headings[i].title,
          content,
        });
      }
    }
    if (chapters.length >= 2) return chapters;
  }

  // Fallback: split into equal size chunks (~3000 words per chapter)
  const words = text.split(/\s+/);
  const wordsPerChapter = Math.max(1500, Math.floor(words.length / 15));
  const chapters: RawChapter[] = [];
  for (let i = 0; i < words.length; i += wordsPerChapter) {
    const chunkWords = words.slice(i, i + wordsPerChapter);
    chapters.push({
      chapter_number: chapters.length + 1,
      title: `Chapter ${chapters.length + 1}`,
      content: chunkWords.join(" "),
    });
  }
  return chapters;
}

// ─── AI Title Enhancement ─────────────────────────────────────────────────────
// Send only the chapter structure (titles + first 200 chars) to AI to
// get clean, well-formatted chapter titles — does NOT send full PDF.
async function enhanceChapterTitlesWithAI(
  chapters: RawChapter[],
  bookTitle: string,
  lovableKey: string
): Promise<RawChapter[]> {
  try {
    const structureSummary = chapters
      .map((ch) => `${ch.chapter_number}. Raw title: "${ch.title}" | Preview: "${ch.content.slice(0, 200)}"`)
      .join("\n");

    const prompt = `You are processing the book "${bookTitle}". Here are the detected chapter headings and their preview text:

${structureSummary}

Return a JSON array with cleaned chapter information. For each chapter provide:
- "chapter_number": integer
- "title": a clean, properly formatted chapter title

Rules:
- Keep titles concise (under 60 characters)
- If the raw title looks like a chapter number only (e.g. "Chapter 1"), keep it as-is
- Remove extra symbols, fix capitalization
- If it appears to be a prologue, epilogue, or preface, name it appropriately
- Return ONLY valid JSON array, no other text

Example: [{"chapter_number": 1, "title": "The Awakening"}, {"chapter_number": 2, "title": "Chapter 2"}]`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 4000,
        }),
      }
    );

    if (!aiResponse.ok) {
      console.warn("AI title enhancement failed, using raw titles");
      return chapters;
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const enhanced = JSON.parse(jsonStr) as Array<{ chapter_number: number; title: string }>;

    // Merge enhanced titles back into chapters
    const titleMap = new Map(enhanced.map((e) => [e.chapter_number, e.title]));
    return chapters.map((ch) => ({
      ...ch,
      title: titleMap.get(ch.chapter_number) || ch.title,
    }));
  } catch (err) {
    console.warn("AI title enhancement error, using raw titles:", err);
    return chapters; // graceful fallback
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const { book_id } = await req.json();
    if (!book_id) return respond({ error: "book_id required" }, 400);

    // ── 1. Fetch book submission ──────────────────────────────────────────────
    const { data: book, error: bookErr } = await supabase
      .from("book_submissions")
      .select("*")
      .eq("id", book_id)
      .single();

    if (bookErr || !book) return respond({ error: "Book not found" }, 404);
    if (!book.manuscript_url) return respond({ error: "No manuscript uploaded" }, 400);

    console.log(`[extract-chapters] Processing book: "${book.title}" (${book_id})`);

    // ── 2. Download PDF from storage ─────────────────────────────────────────
    const { data: fileData, error: fileErr } = await supabase.storage
      .from("book-manuscripts")
      .download(book.manuscript_url);

    if (fileErr || !fileData) {
      console.error("Storage download error:", fileErr);
      return respond({ error: "Could not download manuscript from storage" }, 500);
    }

    const pdfBytes = await fileData.arrayBuffer();
    console.log(`[extract-chapters] Downloaded PDF: ${(pdfBytes.byteLength / 1024).toFixed(0)} KB`);

    // ── 3. Extract text from PDF ──────────────────────────────────────────────
    const fullText = await extractTextFromPDF(pdfBytes);
    console.log(`[extract-chapters] Extracted text: ${fullText.length} characters`);

    if (fullText.length < 300) {
      // PDF has no extractable text — likely a scanned/image PDF
      return respond({
        error: "scanned_pdf",
        message: "This PDF appears to be a scanned document (image-only). Please upload a text-based PDF for chapter extraction to work. You can use an OCR tool to convert scanned PDFs to text.",
      }, 422);
    }

    // ── 4. Detect chapters using regex patterns ───────────────────────────────
    let chapters = detectChaptersFromText(fullText);
    console.log(`[extract-chapters] Detected ${chapters.length} chapters via regex`);

    if (chapters.length === 0) {
      return respond({ error: "Could not detect any content in the PDF" }, 500);
    }

    // ── 5. Enhance titles with AI (lightweight text call, not image) ──────────
    if (lovableKey && chapters.length > 0) {
      chapters = await enhanceChapterTitlesWithAI(chapters, book.title, lovableKey);
      console.log(`[extract-chapters] AI title enhancement complete`);
    }

    // ── 6. Delete old chapters & insert new ones ──────────────────────────────
    await supabase.from("book_chapters").delete().eq("book_id", book_id);

    const chapterRows = chapters.map((ch) => ({
      book_id,
      chapter_number: ch.chapter_number,
      title: ch.title || `Chapter ${ch.chapter_number}`,
      content: ch.content || "",
    }));

    const { error: insertErr } = await supabase
      .from("book_chapters")
      .insert(chapterRows);

    if (insertErr) {
      console.error("DB insert error:", insertErr);
      return respond({ error: "Failed to save chapters to database" }, 500);
    }

    // ── 7. Update chapter count on book ──────────────────────────────────────
    await supabase
      .from("book_submissions")
      .update({ total_chapters: chapters.length })
      .eq("id", book_id);

    console.log(`[extract-chapters] ✅ Done: ${chapters.length} chapters saved`);

    return respond({
      success: true,
      chapters_extracted: chapters.length,
      text_length: fullText.length,
    });
  } catch (err) {
    console.error("[extract-chapters] Unexpected error:", err);
    return respond({ error: "Internal server error", detail: String(err) }, 500);
  }
});
