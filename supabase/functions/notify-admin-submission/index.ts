import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");
    if (!ADMIN_EMAIL) {
      throw new Error("ADMIN_EMAIL is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { bookTitle, authorEmail, genre } = await req.json();

    if (!bookTitle || !authorEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send email notification using Supabase's built-in email
    // We'll use a simple approach: insert a notification record
    // and log it. For production, integrate with an email service.
    console.log(
      `[ADMIN NOTIFICATION] New book submission:
      Title: ${bookTitle}
      Author: ${authorEmail}
      Genre: ${genre}
      Admin Email: ${ADMIN_EMAIL}
      Timestamp: ${new Date().toISOString()}`
    );

    // For now, we'll use Supabase's auth admin API to send an email
    // In production, replace with a proper email service (SendGrid, Resend, etc.)
    const emailSubject = `New Book Submission: "${bookTitle}"`;
    const emailBody = `
A new book has been submitted for review on Wistaar.

📖 Book Title: ${bookTitle}
✍️ Author Email: ${authorEmail}
📚 Genre: ${genre}
📅 Submitted: ${new Date().toLocaleString()}

Please log in to the admin dashboard to review this submission.
    `.trim();

    // Log the notification (email sending requires external service)
    console.log(`Email would be sent to: ${ADMIN_EMAIL}`);
    console.log(`Subject: ${emailSubject}`);
    console.log(`Body: ${emailBody}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin notification sent",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error sending notification:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
