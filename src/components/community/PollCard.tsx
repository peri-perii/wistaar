import { motion } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useVotePoll, usePollResults, useHasVoted } from "@/hooks/usePolls";
import type { AuthorPost } from "@/hooks/useAuthorPosts";

interface PollCardProps {
  post: AuthorPost;
}

export default function PollCard({ post }: PollCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const votePoll = useVotePoll();

  // Use live results from the DB (most up-to-date vote counts)
  const { data: results, isLoading: resultsLoading } = usePollResults(post.id);
  const { data: votedOptionId, isLoading: votedLoading } = useHasVoted(post.id);

  const hasVoted = !!votedOptionId;
  const isLoading = resultsLoading || votedLoading;

  // Calculate expiry
  const expiresAt = post.poll_duration_days
    ? new Date(new Date(post.created_at).getTime() + post.poll_duration_days * 86_400_000)
    : null;
  const isExpired = expiresAt ? Date.now() > expiresAt.getTime() : false;

  const handleVote = async (optionId: string) => {
    if (!user) {
      toast({ title: "Sign in to vote", description: "You need an account to vote on polls.", variant: "destructive" });
      return;
    }
    if (hasVoted || isExpired) return;

    try {
      await votePoll.mutateAsync({ postId: post.id, optionId });
    } catch (err: any) {
      if (err.message?.includes("unique") || err.code === "23505") {
        toast({ title: "Already voted", description: "You can only vote once per poll." });
      } else {
        toast({ title: "Vote failed", description: err.message, variant: "destructive" });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[#888888]" />
      </div>
    );
  }

  const totalVotes = results?.reduce((sum, r) => sum + r.vote_count, 0) ?? 0;

  // Use live results if available, fallback to embedded poll_options
  const options = results && results.length > 0 ? results : (post.poll_options ?? []).map((o) => ({
    ...o,
    percentage: 0,
    totalVotes: 0,
  }));

  return (
    <div className="space-y-3">
      {/* Question */}
      {post.content && (
        <p className="text-sm font-semibold text-white leading-relaxed">{post.content}</p>
      )}

      {/* Options */}
      <div className="space-y-2">
        {options.map((option) => {
          const pct = totalVotes === 0 ? 0 : Math.round((option.vote_count / totalVotes) * 100);
          const isChosen = votedOptionId === option.id;
          const showResults = hasVoted || isExpired || !user;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={showResults || votePoll.isPending}
              className={`relative w-full text-left rounded-xl overflow-hidden border transition-all duration-200 ${
                showResults
                  ? "cursor-default border-[#1e1e1e]"
                  : "border-[#1e1e1e] hover:border-[#c84b2f]/50 hover:bg-[#c84b2f]/5 cursor-pointer"
              } ${isChosen ? "border-[#c84b2f]/60" : ""}`}
            >
              {/* Animated fill bar */}
              {showResults && (
                <motion.div
                  className="absolute inset-y-0 left-0 bg-[#c84b2f]/15 rounded-xl"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                />
              )}

              <div className="relative flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  {isChosen && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#c84b2f] shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${isChosen ? "text-[#c84b2f]" : "text-white/90"}`}>
                    {option.option_text}
                  </span>
                </div>
                {showResults && (
                  <span className={`text-xs font-mono tabular-nums ${isChosen ? "text-[#c84b2f]" : "text-[#888888]"}`}>
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer meta */}
      <div className="flex items-center justify-between text-xs text-[#888888] pt-1">
        <span>{totalVotes} {totalVotes === 1 ? "vote" : "votes"}</span>
        {expiresAt && (
          <span className={isExpired ? "text-red-500/70" : ""}>
            {isExpired
              ? "Poll ended"
              : `Ends ${expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
          </span>
        )}
        {!user && <span className="text-[#888888]">Sign in to vote</span>}
      </div>
    </div>
  );
}
