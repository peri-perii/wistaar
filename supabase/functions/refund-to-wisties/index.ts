import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const { bookId } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Get purchase
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from("book_purchases")
      .select("*")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .maybeSingle();

    if (purchaseError || !purchase) {
      throw new Error("Purchase not found");
    }

    if (purchase.payment_status === "refunded_to_wisties") {
      throw new Error("Already refunded");
    }

    // 2. Check age
    const purchaseAgeHours = (new Date().getTime() - new Date(purchase.purchased_at).getTime()) / (1000 * 60 * 60);
    
    // Get setting (or default to 36)
    const { data: settings } = await supabaseAdmin.from("platform_settings").select("wisties_refund_window_hours").single();
    const windowHours = settings?.wisties_refund_window_hours || 36;

    if (purchaseAgeHours > windowHours) {
      throw new Error(`Refund window of ${windowHours} hours has expired.`);
    }

    // 3. Credit Wisties via RPC (RPC is security definer, but we are admin here anyway, wait RPC might use auth.uid(). Let's check RPC: it doesn't use auth.uid, it takes p_user_id)
    const { error: rpcError } = await supabaseAdmin.rpc("credit_wisties", {
      p_user_id: user.id,
      p_amount: purchase.amount,
      p_type: "refund",
      p_ref: purchase.id,
      p_desc: `Refund for book purchase`
    });

    if (rpcError) throw rpcError;

    // 4. Update purchase status
    const { error: updateError } = await supabaseAdmin
      .from("book_purchases")
      .update({ payment_status: "refunded_to_wisties" })
      .eq("id", purchase.id);

    if (updateError) throw updateError;

    // 5. Notify user
    await supabaseAdmin.from("notifications").insert({
      user_id: user.id,
      title: "Refund Processed",
      message: `Your refund for ₹${purchase.amount} has been credited to your Wisties balance.`,
      type: "system",
      is_read: false
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
