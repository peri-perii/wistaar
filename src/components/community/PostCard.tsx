import { useState } from "react";
import { motion } from "framer-motion";
import { Share2, Trash2, BarChart2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useDeletePost, type AuthorPost } from "@/hooks/useAuthorPosts";
import { useToast } from "@/hooks/use-toast";
import PollCard from "./PollCard";

interface AuthorMeta {
  displayName: string;
  avatarUrl?: string | null;
  username?: string | null;
}

interface PostCardProps {
  post: AuthorPost;
  author: AuthorMeta;
  isOwner?: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function PostCard({ post, author, isOwner = false }: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const deletePost = useDeletePost();
  const [deleting, setDeleting] = useState(false);

  const initials = (author.displayName || "A").slice(0, 2).toUpperCase();

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `Post by ${author.displayName}`, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "Post URL copied to clipboard." });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deletePost.mutateAsync(post.id);
      toast({ title: "Post deleted" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="bg-[#111111] border border-[#1e1e1e] rounded-2xl overflow-hidden hover:border-[#c84b2f]/20 transition-colors duration-300"
    >
      {/* Author meta row */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 border border-[#1e1e1e]">
            <AvatarImage src={author.avatarUrl ?? undefined} alt={author.displayName} />
            <AvatarFallback className="bg-[#c84b2f]/10 text-[#c84b2f] text-sm font-serif">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-white leading-none">{author.displayName}</p>
            <p className="text-xs text-[#888888] mt-0.5">{timeAgo(post.created_at)}</p>
          </div>
        </div>

        {/* Post type badge */}
        {post.post_type === "poll" && (
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
            <BarChart2 className="w-3 h-3" />
            Poll
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pb-4">
        {/* Text post */}
        {post.post_type === "text" && post.content && (
          <p className="text-sm text-white/90 leading-relaxed whitespace-pre-line">{post.content}</p>
        )}

        {/* Image post */}
        {post.post_type === "image" && (
          <div className="space-y-3">
            {post.image_url && (
              <div className="rounded-xl overflow-hidden border border-[#1e1e1e]">
                <img
                  src={post.image_url}
                  alt="Post image"
                  className="w-full object-cover max-h-80"
                  loading="lazy"
                />
              </div>
            )}
            {post.content && (
              <p className="text-sm text-white/80 leading-relaxed">{post.content}</p>
            )}
          </div>
        )}

        {/* Poll */}
        {post.post_type === "poll" && (
          <PollCard post={post} />
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[#1e1e1e]">
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>

        {isOwner && user && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-xs text-[#888888] hover:text-[#c84b2f] transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        )}
      </div>
    </motion.div>
  );
}
