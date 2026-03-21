import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { book_id } = await req.json();
    if (!book_id) {
      return new Response(JSON.stringify({ error: "book_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the book submission
    const { data: book, error: bookErr } = await supabase
      .from("book_submissions")
      .select("*")
      .eq("id", book_id)
      .single();

    if (bookErr || !book) {
      return new Response(
        JSON.stringify({ error: "Book not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!book.manuscript_url) {
      return new Response(
        JSON.stringify({ error: "No manuscript uploaded" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download the PDF from storage
    const { data: fileData, error: fileErr } = await supabase.storage
      .from("book-manuscripts")
      .download(book.manuscript_url);

    if (fileErr || !fileData) {
      return new Response(
        JSON.stringify({ error: "Could not download manuscript" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    // Use Lovable AI (Gemini) to extract chapters from the PDF
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract all chapters from this book PDF. Return a JSON array where each element has:
- "chapter_number": integer starting from 1
- "title": the chapter title (if no explicit title, use "Chapter N")
- "content": the full text content of that chapter, preserving paragraphs separated by double newlines

If the book doesn't have clear chapter divisions, split it into logical sections of roughly equal length (aim for 5-15 chapters).

IMPORTANT: Return ONLY the JSON array, no other text. Example:
[{"chapter_number": 1, "title": "The Beginning", "content": "First paragraph...\\n\\nSecond paragraph..."}]`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 100000,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI extraction failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse the JSON from AI response (handle markdown code blocks)
    let chapters;
    try {
      const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      chapters = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", rawContent.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to parse extracted chapters" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(chapters) || chapters.length === 0) {
      return new Response(
        JSON.stringify({ error: "No chapters extracted" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete existing chapters for this book
    await supabase.from("book_chapters").delete().eq("book_id", book_id);

    // Insert extracted chapters
    const chapterRows = chapters.map((ch: any) => ({
      book_id,
      chapter_number: ch.chapter_number,
      title: ch.title || `Chapter ${ch.chapter_number}`,
      content: ch.content || "",
    }));

    const { error: insertErr } = await supabase
      .from("book_chapters")
      .insert(chapterRows);

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to save chapters" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update total_chapters count on the book
    await supabase
      .from("book_submissions")
      .update({ total_chapters: chapters.length })
      .eq("id", book_id);

    return new Response(
      JSON.stringify({
        success: true,
        chapters_extracted: chapters.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
