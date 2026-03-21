import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function generateHash(params: Record<string, string>, salt: string): Promise<string> {
  const hashString = `${params.key}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|${params.udf1 || ""}|${params.udf2 || ""}|${params.udf3 || ""}|${params.udf4 || ""}|${params.udf5 || ""}||||||${salt}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyHash(params: Record<string, string>, salt: string, receivedHash: string): Promise<boolean> {
  // Reverse hash: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  const hashString = `${salt}|${params.status}||||||${params.udf5 || ""}|${params.udf4 || ""}|${params.udf3 || ""}|${params.udf2 || ""}|${params.udf1 || ""}|${params.email}|${params.firstname}|${params.productinfo}|${params.amount}|${params.txnid}|${params.key}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const computed = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return computed === receivedHash;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const PAYU_MERCHANT_KEY = Deno.env.get("PAYU_MERCHANT_KEY");
  const PAYU_MERCHANT_SALT = Deno.env.get("PAYU_MERCHANT_SALT");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!PAYU_MERCHANT_KEY || !PAYU_MERCHANT_SALT) {
    return new Response(JSON.stringify({ error: "PayU not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  try {
    // --- Initiate Payment ---
    if (path === "initiate" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
      if (claimsErr || !claims?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = claims.claims.sub as string;
      const userEmail = (claims.claims.email as string) || "user@example.com";

      const { bookId, bookTitle, amount, returnUrl } = await req.json();

      if (!bookId || !amount || !returnUrl) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const txnid = `TXN_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

      // Create pending purchase record
      const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { error: insertErr } = await adminSupabase.from("book_purchases").upsert(
        {
          user_id: userId,
          book_id: bookId,
          amount: amount,
          payu_txnid: txnid,
          payment_status: "pending",
        },
        { onConflict: "user_id,book_id" }
      );

      if (insertErr) {
        console.error("Insert error:", insertErr);
        return new Response(JSON.stringify({ error: "Failed to create purchase record" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params: Record<string, string> = {
        key: PAYU_MERCHANT_KEY,
        txnid,
        amount: String(amount),
        productinfo: bookTitle || "Book Purchase",
        firstname: "",
        email: userEmail,
        udf1: userId,
        udf2: bookId,
      };

      const hash = await generateHash(params, PAYU_MERCHANT_SALT);

      // Build PayU form data
      const payuData = {
        ...params,
        hash,
        surl: `${SUPABASE_URL}/functions/v1/payu-payment/callback`,
        furl: `${SUPABASE_URL}/functions/v1/payu-payment/callback`,
        // PayU production URL
        payuUrl: "https://secure.payu.in/_payment",
      };

      return new Response(JSON.stringify(payuData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Payment Callback ---
    if (path === "callback" && req.method === "POST") {
      const formData = await req.formData();
      const params: Record<string, string> = {};
      formData.forEach((value, key) => {
        params[key] = String(value);
      });

      const receivedHash = params.hash;
      params.key = PAYU_MERCHANT_KEY;

      const isValid = await verifyHash(params, PAYU_MERCHANT_SALT, receivedHash);

      const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const txnid = params.txnid;
      const status = params.status === "success" && isValid ? "completed" : "failed";

      await adminSupabase
        .from("book_purchases")
        .update({
          payment_status: status,
          transaction_id: params.mihpayid || params.txnid,
        })
        .eq("payu_txnid", txnid);

      // Redirect user back to the app
      const bookId = params.udf2;
      const redirectUrl = status === "completed"
        ? `${req.headers.get("origin") || ""}/book/${bookId}?payment=success`
        : `${req.headers.get("origin") || ""}/book/${bookId}?payment=failed`;

      // Since we can't know the frontend origin from callback, use a simple HTML redirect
      const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/book/${bookId}?payment=${status === "completed" ? "success" : "failed"}"><script>window.location.href="/book/${bookId}?payment=${status === "completed" ? "success" : "failed"}";</script></head><body>Redirecting...</body></html>`;

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("PayU error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
