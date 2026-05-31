import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyPayload {
  post_id: string;
  author_id: string;
  post_type: "text" | "image" | "poll";
  author_name: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: NotifyPayload = await req.json();
    const { post_id, author_id, post_type, author_name } = payload;

    // Use service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch all followers of this author
    const { data: follows, error: followsError } = await supabaseAdmin
      .from("follows")
      .select("follower_id")
      .eq("following_id", author_id);

    if (followsError) throw followsError;
    if (!follows || follows.length === 0) {
      return new Response(JSON.stringify({ inserted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build notification message based on post type
    const typeMap: Record<string, { type: string; title: string; message: string }> = {
      text: {
        type: "new_post",
        title: "New community post",
        message: `${author_name} posted a new update`,
      },
      image: {
        type: "new_post",
        title: "New community post",
        message: `${author_name} shared a new photo`,
      },
      poll: {
        type: "new_poll",
        title: "New poll",
        message: `${author_name} started a new poll`,
      },
    };

    const notif = typeMap[post_type] ?? typeMap["text"];

    // Batch insert notifications for all followers
    const notifications = follows.map((f) => ({
      user_id: f.follower_id,
      actor_id: author_id,
      entity_id: post_id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      is_read: false,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert(notifications);

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ inserted: notifications.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-author-post error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
