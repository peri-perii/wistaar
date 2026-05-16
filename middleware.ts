/**
 * Vercel Edge Middleware — Dynamic OG Meta Tags
 *
 * Intercepts requests to /book/:id from social media crawlers (WhatsApp, Twitter,
 * Discord, Telegram, Facebook, LinkedIn, Slack etc.) and returns a lightweight HTML
 * page containing book-specific Open Graph + Twitter Card meta tags.
 *
 * Real users are passed through normally and receive the React SPA as usual.
 */

export const config = {
  matcher: ["/book/:id*"],
};

// Social-media and search-engine bot User-Agent patterns
const BOT_PATTERN =
  /WhatsApp|Twitterbot|facebookexternalhit|Facebot|LinkedInBot|TelegramBot|Discordbot|Slackbot|Googlebot|bingbot|DuckDuckBot|Applebot|ia_archiver|crawler|spider/i;

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildOgHtml(book: {
  title: string;
  description: string;
  cover_image_url: string | null;
  genre: string;
  author: string;
}, bookUrl: string): string {
  const title = escapeHtml(`${book.title} — Wistaar`);
  const desc = escapeHtml((book.description || "").slice(0, 200));
  const cover = book.cover_image_url ? escapeHtml(book.cover_image_url) : "";
  const safeUrl = escapeHtml(bookUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />

  <!-- Open Graph -->
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:type" content="book" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:site_name" content="Wistaar" />
  <meta property="og:locale" content="en_IN" />
  ${cover ? `<meta property="og:image" content="${cover}" />
  <meta property="og:image:width" content="800" />
  <meta property="og:image:height" content="1200" />
  <meta property="og:image:alt" content="${escapeHtml(book.title)}" />` : ""}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="${cover ? "summary_large_image" : "summary"}" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  ${cover ? `<meta name="twitter:image" content="${cover}" />` : ""}

  <!-- JSON-LD for Search Engines -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": ${JSON.stringify(book.title)},
    "description": ${JSON.stringify((book.description || "").slice(0, 300))},
    "genre": ${JSON.stringify(book.genre || "")},
    "author": {
      "@type": "Person",
      "name": ${JSON.stringify(book.author || "Unknown")}
    },
    "url": ${JSON.stringify(bookUrl)}
    ${cover ? `, "image": ${JSON.stringify(book.cover_image_url)}` : ""}
  }
  </script>
</head>
<body>
  <h1>${escapeHtml(book.title)}</h1>
  <p>${desc}</p>
  <p>Read this book on <a href="${safeUrl}">Wistaar</a></p>
</body>
</html>`;
}

export default async function middleware(request: Request) {
  const userAgent = request.headers.get("user-agent") || "";

  // Pass non-bot requests straight through to the SPA
  if (!BOT_PATTERN.test(userAgent)) {
    return; // undefined = continue to next handler (serves index.html via vercel.json rewrite)
  }

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const bookId = pathParts[1]; // /book/:id → index 1

  if (!bookId) return;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[og-middleware] Missing Supabase env vars");
    return;
  }

  try {
    // Fetch book + author profile via two quick sequential queries
    const bookApiUrl = `${supabaseUrl}/rest/v1/book_submissions?id=eq.${encodeURIComponent(bookId)}&status=eq.approved&select=title,description,cover_image_url,genre,author_id&limit=1`;

    const res = await fetch(bookApiUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.error("[og-middleware] Supabase error:", res.status);
      return;
    }

    const books = await res.json() as any[];
    const book = books?.[0];

    if (!book) {
      // Book not found or not approved — let the SPA handle the 404
      return;
    }

    // Fetch author name from profiles table
    let authorName = "Unknown Author";
    if (book.author_id) {
      try {
        const profileRes = await fetch(
          `${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(book.author_id)}&select=display_name&limit=1`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Accept: "application/json" } }
        );
        if (profileRes.ok) {
          const profiles = await profileRes.json() as any[];
          authorName = profiles?.[0]?.display_name || "Unknown Author";
        }
      } catch { /* non-critical */ }
    }

    const ogHtml = buildOgHtml(
      {
        title: book.title || "Untitled",
        description: book.description || "",
        cover_image_url: book.cover_image_url || null,
        genre: book.genre || "",
        author: authorName,
      },
      url.href
    );

    return new Response(ogHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Cache for 10 minutes — bots don't need real-time data
        "Cache-Control": "public, max-age=600, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("[og-middleware] Unexpected error:", err);
    return; // Fall through to SPA on error
  }
}
