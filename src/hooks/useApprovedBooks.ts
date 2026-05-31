import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ApprovedBook {
  id: string;
  title: string;
  author: string;
  authorBio: string;
  authorUsername: string | null;   // slug for /author/:username
  authorId: string;                // fallback for linking
  genre: string;
  price: "free" | "premium";
  priceAmount: number;
  freeChapters: number;
  rating: number;
  coverColor: string;
  coverImageUrl: string | null;
  description: string;
  publishedDate: string;
  readCount: number;
  totalChapters: number;
}

export function useApprovedBooks() {
  return useQuery({
    queryKey: ["approved-books"],
    queryFn: async (): Promise<ApprovedBook[]> => {
      // Fetch approved submissions
      const { data: submissions, error } = await supabase
        .from("book_submissions")
        .select("*")
        .eq("status", "approved");

      if (error) throw error;
      if (!submissions) return [];

      // Get author profiles
      const authorIds = [...new Set(submissions.map((s) => s.author_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, bio, username")
        .in("user_id", authorIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      return submissions.map((s) => {
        const profile = profileMap.get(s.author_id);
        return {
          id: s.id,
          title: s.title,
          author: profile?.display_name || "Unknown Author",
          authorBio: profile?.bio || "",
          authorUsername: profile?.username || null,
          authorId: s.author_id,
          genre: s.genre,
          price: s.price > 0 ? "premium" : "free",
          priceAmount: Number(s.price),
          freeChapters: s.free_chapters,
          rating: Number(s.rating),
          coverColor: s.cover_color,
          coverImageUrl: s.cover_image_url,
          description: s.description,
          publishedDate: s.submitted_at,
          readCount: s.read_count,
          totalChapters: s.total_chapters,
        };
      });
    },
  });
}
