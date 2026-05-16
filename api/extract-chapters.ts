import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse';

interface RawChapter {
  chapter_number: number;
  title: string;
  content: string;
}

function detectChaptersFromText(text: string): RawChapter[] {
  const CHAPTER_PATTERNS = [
    /^(chapter\s+[\divxlcdm]+[.:–—\s]*.*)$/im,
    /^(CHAPTER\s+[\dIVXLCDM]+[.:–—\s]*.*)$/m,
    /^(part\s+[\divxlcdm]+[.:–—\s]*.*)$/im,
    /^(\d{1,2}\.\s+[A-Z].{3,60})$/m,
    /^(section\s+\d+[.:–—\s]*.*)$/im,
    /^((?:I{1,3}|IV|V|VI{0,3}|IX|X{1,3}|XI{1,3}|XIV|XV|XVI{0,3}|XIX|XX)\s*\.?\s*)$/m,
    /^([A-Z][A-Z\s]{4,50})$/m,
  ];

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

  headings.sort((a, b) => a.index - b.index);

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

  // Fallback: chunk by ~1500 words
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

async function enhanceChapterTitlesWithAI(chapters: RawChapter[], bookTitle: string, lovableKey: string): Promise<RawChapter[]> {
  try {
    const structureSummary = chapters.map((ch) => `${ch.chapter_number}. Raw title: "${ch.title}" | Preview: "${ch.content.slice(0, 200)}"`).join("\n");
    const prompt = `You are processing the book "${bookTitle}". Here are the detected chapter headings and their preview text:\n\n${structureSummary}\n\nReturn a JSON array with cleaned chapter information. For each chapter provide "chapter_number" and a clean concise "title". Return ONLY valid JSON array.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!res.ok) return chapters;
    const aiData = await res.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const enhanced = JSON.parse(jsonStr) as Array<{ chapter_number: number; title: string }>;

    const titleMap = new Map(enhanced.map((e) => [e.chapter_number, e.title]));
    return chapters.map((ch) => ({ ...ch, title: titleMap.get(ch.chapter_number) || ch.title }));
  } catch {
    return chapters;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, apikey');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !anonKey) {
      return res.status(500).json({ error: 'Missing Supabase environment variables on Vercel' });
    }

    const { book_id } = req.body;
    if (!book_id) return res.status(400).json({ error: 'book_id required' });

    // Important: Use the access token from the client request to act on behalf of the admin user
    const authHeader = req.headers.authorization;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const { data: book, error: bookErr } = await supabase.from('book_submissions').select('*').eq('id', book_id).single();
    if (bookErr || !book) return res.status(404).json({ error: 'Book not found. Are you an admin?' });
    if (!book.manuscript_url) return res.status(400).json({ error: 'No manuscript uploaded' });

    const { data: fileData, error: fileErr } = await supabase.storage.from('book-manuscripts').download(book.manuscript_url);
    if (fileErr || !fileData) return res.status(500).json({ error: 'Could not download manuscript' });

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let fullText = '';
    try {
      const pdfData = await pdfParse(buffer);
      fullText = pdfData.text;
    } catch (err) {
      console.error('PDF Parse Error:', err);
      return res.status(500).json({ error: 'Failed to parse PDF file' });
    }

    if (fullText.length < 300) {
      return res.status(422).json({
        error: 'scanned_pdf',
        message: 'This PDF appears to be a scanned document (image-only). Please upload a text-based PDF.'
      });
    }

    let chapters = detectChaptersFromText(fullText);
    if (chapters.length === 0) return res.status(500).json({ error: 'Could not detect any content in the PDF' });

    const lovableKey = process.env.LOVABLE_API_KEY;
    if (lovableKey) {
      chapters = await enhanceChapterTitlesWithAI(chapters, book.title, lovableKey);
    }

    await supabase.from('book_chapters').delete().eq('book_id', book_id);

    const chapterRows = chapters.map((ch) => ({
      book_id,
      chapter_number: ch.chapter_number,
      title: ch.title || `Chapter ${ch.chapter_number}`,
      content: ch.content || '',
    }));

    const { error: insertErr } = await supabase.from('book_chapters').insert(chapterRows);
    if (insertErr) return res.status(500).json({ error: 'Failed to save chapters' });

    await supabase.from('book_submissions').update({ total_chapters: chapters.length }).eq('id', book_id);

    return res.status(200).json({ success: true, chapters_extracted: chapters.length });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
