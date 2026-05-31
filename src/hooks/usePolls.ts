import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { PollOption } from "./useAuthorPosts";

// ── Poll results (options with % share) ──────────────────────────────────────

export interface PollResult extends PollOption {
  percentage: number;
  totalVotes: number;
}

export function usePollResults(postId: string | undefined) {
  return useQuery({
    queryKey: ["poll-results", postId],
    enabled: !!postId,
    staleTime: 10_000,
    queryFn: async (): Promise<PollResult[]> => {
      const { data, error } = await (supabase as any)
        .from("poll_options")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      const options = (data ?? []) as PollOption[];
      const totalVotes = options.reduce((sum, o) => sum + o.vote_count, 0);

      return options.map((o) => ({
        ...o,
        totalVotes,
        percentage: totalVotes === 0 ? 0 : Math.round((o.vote_count / totalVotes) * 100),
      }));
    },
  });
}

// ── Check if current user has voted on a post ─────────────────────────────────

export function useHasVoted(postId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["has-voted", postId, user?.id],
    enabled: !!postId && !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<string | null> => {
      // Returns the option_id the user voted for, or null
      const { data, error } = await (supabase as any)
        .from("poll_votes")
        .select("option_id")
        .eq("post_id", postId)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data?.option_id ?? null;
    },
  });
}

// ── Cast a vote ───────────────────────────────────────────────────────────────

export function useVotePoll() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      optionId,
    }: {
      postId: string;
      optionId: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase as any).rpc("cast_poll_vote", {
        p_post_id: postId,
        p_option_id: optionId,
        p_user_id: user.id,
      });

      if (error) throw error;
      return { postId, optionId };
    },
    onSuccess: ({ postId }) => {
      queryClient.invalidateQueries({ queryKey: ["poll-results", postId] });
      queryClient.invalidateQueries({ queryKey: ["has-voted", postId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["author-posts"] });
    },
  });
}
