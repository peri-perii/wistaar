import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type PostType = "text" | "image" | "poll";

export interface PollOption {
  id: string;
  post_id: string;
  option_text: string;
  vote_count: number;
}

export interface AuthorPost {
  id: string;
  author_id: string;
  post_type: PostType;
  content: string | null;
  image_url: string | null;
  poll_duration_days: number | null;
  created_at: string;
  poll_options?: PollOption[];
}

// ── Fetch posts for an author ─────────────────────────────────────────────────

export function useAuthorPosts(authorId: string | undefined) {
  return useQuery({
    queryKey: ["author-posts", authorId],
    enabled: !!authorId,
    staleTime: 30_000,
    queryFn: async (): Promise<AuthorPost[]> => {
      // Fetch posts
      const { data: posts, error: postsError } = await (supabase as any)
        .from("author_posts")
        .select("*")
        .eq("author_id", authorId)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;
      if (!posts || posts.length === 0) return [];

      // Fetch poll options for all posts
      const pollPostIds = posts
        .filter((p: AuthorPost) => p.post_type === "poll")
        .map((p: AuthorPost) => p.id);

      let optionsMap: Record<string, PollOption[]> = {};

      if (pollPostIds.length > 0) {
        const { data: options, error: optErr } = await (supabase as any)
          .from("poll_options")
          .select("*")
          .in("post_id", pollPostIds)
          .order("created_at", { ascending: true });

        if (!optErr && options) {
          optionsMap = options.reduce((acc: Record<string, PollOption[]>, opt: PollOption) => {
            if (!acc[opt.post_id]) acc[opt.post_id] = [];
            acc[opt.post_id].push(opt);
            return acc;
          }, {});
        }
      }

      return posts.map((p: AuthorPost) => ({
        ...p,
        poll_options: optionsMap[p.id] ?? [],
      }));
    },
  });
}

// ── Create post ───────────────────────────────────────────────────────────────

interface CreatePostPayload {
  post_type: PostType;
  content?: string;
  image_url?: string;
  poll_options?: string[];
  poll_duration_days?: number;
  author_name: string;
}

export function useCreatePost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePostPayload) => {
      if (!user) throw new Error("Not authenticated");

      // 1. Insert the post
      const { data: post, error: postError } = await (supabase as any)
        .from("author_posts")
        .insert({
          author_id: user.id,
          post_type: payload.post_type,
          content: payload.content ?? null,
          image_url: payload.image_url ?? null,
          poll_duration_days: payload.poll_duration_days ?? 7,
        })
        .select()
        .single();

      if (postError) throw postError;

      // 2. Insert poll options if poll type
      if (payload.post_type === "poll" && payload.poll_options?.length) {
        const { error: optErr } = await (supabase as any)
          .from("poll_options")
          .insert(
            payload.poll_options.map((text: string) => ({
              post_id: post.id,
              option_text: text,
            }))
          );
        if (optErr) throw optErr;
      }

      // 3. Trigger edge function to notify followers (fire-and-forget)
      supabase.functions
        .invoke("notify-author-post", {
          body: {
            post_id: post.id,
            author_id: user.id,
            post_type: payload.post_type,
            author_name: payload.author_name,
          },
        })
        .catch((e) => console.warn("Notification dispatch failed:", e));

      return post as AuthorPost;
    },
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ["author-posts", post.author_id] });
    },
  });
}

// ── Delete post ───────────────────────────────────────────────────────────────

export function useDeletePost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any)
        .from("author_posts")
        .delete()
        .eq("id", postId)
        .eq("author_id", user.id);
      if (error) throw error;
      return postId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["author-posts"] });
    },
  });
}

// ── Upload image to storage ───────────────────────────────────────────────────

export async function uploadPostImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("post-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("post-images").getPublicUrl(path);
  return data.publicUrl;
}
