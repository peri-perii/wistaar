import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PenSquare, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthorPosts } from "@/hooks/useAuthorPosts";
import PostCard from "./PostCard";
import PostComposer from "./PostComposer";

interface AuthorMeta {
  displayName: string;
  avatarUrl?: string | null;
  username?: string | null;
}

interface CommunityFeedProps {
  authorId: string;
  author: AuthorMeta;
  isOwner?: boolean;
}

export default function CommunityFeed({ authorId, author, isOwner = false }: CommunityFeedProps) {
  const { data: posts, isLoading } = useAuthorPosts(authorId);
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between border-b border-[#1e1e1e] pb-3">
        <h2 className="font-serif text-2xl text-foreground font-medium flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#c84b2f]" />
          Community Posts
          {!isLoading && posts && posts.length > 0 && (
            <span className="text-sm font-sans font-normal text-[#888888] ml-1">
              · {posts.length}
            </span>
          )}
        </h2>

        {isOwner && (
          <Button
            onClick={() => setComposerOpen(true)}
            className="bg-[#c84b2f] hover:bg-[#c84b2f]/90 text-white font-semibold text-sm flex items-center gap-2 h-9 px-4"
          >
            <PenSquare className="w-4 h-4" />
            New Post
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-[#888888]" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!posts || posts.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 border border-dashed border-[#1e1e1e] rounded-2xl"
        >
          <MessageSquare className="w-10 h-10 text-[#888888]/30 mx-auto mb-4" />
          <h3 className="font-serif text-lg font-medium text-foreground mb-1">
            {isOwner ? "No posts yet" : "No community posts yet"}
          </h3>
          <p className="text-sm text-[#888888] max-w-xs mx-auto">
            {isOwner
              ? "Share updates, polls, or images with your followers."
              : "This author hasn't posted any community updates yet. Follow them to be notified when they do."}
          </p>
          {isOwner && (
            <Button
              onClick={() => setComposerOpen(true)}
              className="mt-6 bg-[#c84b2f] hover:bg-[#c84b2f]/90 text-white font-semibold gap-2"
            >
              <PenSquare className="w-4 h-4" />
              Write your first post
            </Button>
          )}
        </motion.div>
      )}

      {/* Posts list */}
      {!isLoading && posts && posts.length > 0 && (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                author={author}
                isOwner={isOwner}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Composer modal */}
      <AnimatePresence>
        {composerOpen && (
          <PostComposer
            authorName={author.displayName}
            onClose={() => setComposerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
