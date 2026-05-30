import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Users, Star, Award, TrendingUp, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import ApprovedBookCard from "@/components/ApprovedBookCard";
import type { ApprovedBook } from "@/hooks/useApprovedBooks";

interface AuthorProfileData {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  username: string | null;
}

export default function AuthorPublicPage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  const [author, setAuthor] = useState<AuthorProfileData | null>(null);
  const [books, setBooks] = useState<ApprovedBook[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [mostSoldBookId, setMostSoldBookId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (username) {
      fetchAuthorData();
    }
  }, [username, currentUser]);

  const fetchAuthorData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Author Profile by username
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profileData) {
        setAuthor(null);
        setLoading(false);
        return;
      }

      setAuthor(profileData as AuthorProfileData);

      // 2. Fetch approved books of this author
      const { data: submissions, error: booksError } = await supabase
        .from("book_submissions")
        .select("*")
        .eq("author_id", profileData.user_id)
        .eq("status", "approved");

      if (booksError) throw booksError;

      const formattedBooks: ApprovedBook[] = (submissions || []).map((s) => ({
        id: s.id,
        title: s.title,
        author: profileData.display_name || "Unknown Author",
        authorBio: profileData.bio || "",
        genre: s.genre,
        price: s.price > 0 ? "premium" : "free",
        priceAmount: Number(s.price),
        freeChapters: s.free_chapters,
        rating: Number(s.rating || 0),
        coverColor: s.cover_color,
        coverImageUrl: s.cover_image_url,
        description: s.description,
        publishedDate: s.submitted_at,
        readCount: s.read_count,
        totalChapters: s.total_chapters,
      }));

      setBooks(formattedBooks);

      // 3. Fetch Follower count
      const { count, error: countError } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileData.user_id);

      if (!countError) setFollowerCount(count || 0);

      // 4. Check if current user is following
      if (currentUser && currentUser.id !== profileData.user_id) {
        const { data: followData } = await supabase
          .from("follows")
          .select("*")
          .eq("follower_id", currentUser.id)
          .eq("following_id", profileData.user_id)
          .maybeSingle();
        
        setIsFollowing(!!followData);
      }

      // 5. Query to find the most sold book by sales rows count
      if (submissions && submissions.length > 0) {
        const bookIds = submissions.map(s => s.id);
        const { data: salesData } = await supabase
          .from("book_sales")
          .select("book_id");

        if (salesData) {
          const counts: Record<string, number> = {};
          salesData.forEach(sale => {
            if (bookIds.includes(sale.book_id)) {
              counts[sale.book_id] = (counts[sale.book_id] || 0) + 1;
            }
          });
          
          let topBookId: string | null = null;
          let maxSales = 0;
          Object.entries(counts).forEach(([id, count]) => {
            if (count > maxSales) {
              maxSales = count;
              topBookId = id;
            }
          });
          setMostSoldBookId(topBookId);
        }
      }

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to follow this author.",
        variant: "destructive",
      });
      return;
    }

    if (!author) return;

    setActionLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", author.user_id);
        
        if (error) throw error;
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        toast({
          title: "Unfollowed",
          description: `You are no longer following ${author.display_name || "this author"}.`,
        });
      } else {
        // Follow
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: currentUser.id,
            following_id: author.user_id
          });
        
        if (error) throw error;
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        toast({
          title: "Following",
          description: `You are now following ${author.display_name || "this author"}!`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Find highest rated book
  const mostRatedBook = useMemo(() => {
    if (books.length === 0) return null;
    return books.reduce((top, current) => (current.rating > top.rating ? current : top));
  }, [books]);

  // Find most sold book
  const mostSoldBook = useMemo(() => {
    if (!mostSoldBookId || books.length === 0) return null;
    return books.find(b => b.id === mostSoldBookId) || null;
  }, [books, mostSoldBookId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <Navigation />
        <main className="flex-1 flex flex-col items-center justify-center py-20 px-6">
          <AlertCircle className="w-12 h-12 text-[#c84b2f] mb-4" />
          <h2 className="font-serif text-2xl text-foreground mb-2">Author Not Found</h2>
          <p className="text-muted-foreground text-sm mb-6">The username @{username} does not exist or is not registered as an author.</p>
          <Link to="/explore">
            <Button className="bg-[#c84b2f] hover:bg-[#c84b2f]/90 text-white font-semibold">Explore Books</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const initials = (author.display_name || author.username || "A").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground">
      <Navigation />
      <main className="pt-24 pb-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto space-y-10">
          
          {/* Public Profile Header Card */}
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pb-6 border-b border-border/30">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
              <Avatar className="w-20 h-20 md:w-24 md:h-24 border border-border/40 shadow-sm shrink-0">
                <AvatarImage src={author.avatar_url || undefined} alt={author.display_name || ""} />
                <AvatarFallback className="bg-[#c84b2f]/10 text-[#c84b2f] text-xl font-serif">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">{author.display_name || "Unknown Author"}</h1>
                  <Badge variant="outline" className="text-[10px] border-[#c84b2f]/20 text-[#c84b2f] bg-[#c84b2f]/5 tracking-widest uppercase py-0.5">
                    Author
                  </Badge>
                </div>
                <p className="text-sm font-medium text-[#c84b2f]">@{author.username}</p>
                <p className="text-sm text-muted-foreground/90 max-w-xl leading-relaxed whitespace-pre-line">
                  {author.bio || "No biography provided."}
                </p>
                
                {/* Followers & Counts */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-1 pt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    {followerCount} <span className="text-muted-foreground font-normal">followers</span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    {books.length} <span className="text-muted-foreground font-normal">books published</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Follow/Unfollow Button */}
            {(!currentUser || currentUser.id !== author.user_id) && (
              <div className="shrink-0 pt-2">
                <Button
                  onClick={handleFollowToggle}
                  disabled={actionLoading}
                  variant={isFollowing ? "outline" : "default"}
                  className={`w-36 h-10 font-semibold text-sm ${
                    isFollowing 
                      ? "border-border/40 hover:bg-muted/10" 
                      : "bg-[#c84b2f] hover:bg-[#c84b2f]/90 text-white"
                  }`}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </Button>
              </div>
            )}
          </div>

          {/* Highlights Section */}
          {(mostSoldBook || (mostRatedBook && mostRatedBook.rating > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mostSoldBook && (
                <Card className="border-border/30 bg-[#121212]/10 p-5 flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold block mb-0.5">Most Sold Book</span>
                    <Link to={`/book/${mostSoldBook.id}`} className="font-serif text-base text-foreground hover:text-[#c84b2f] transition-colors line-clamp-1 font-semibold">
                      {mostSoldBook.title}
                    </Link>
                  </div>
                </Card>
              )}
              {mostRatedBook && mostRatedBook.rating > 0 && (
                <Card className="border-border/30 bg-[#121212]/10 p-5 flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-amber-500 font-bold block mb-0.5">Highest Rated</span>
                    <Link to={`/book/${mostRatedBook.id}`} className="font-serif text-base text-foreground hover:text-[#c84b2f] transition-colors line-clamp-1 font-semibold">
                      {mostRatedBook.title}
                    </Link>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground font-mono">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{mostRatedBook.rating.toFixed(1)} / 5.0</span>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Books grid */}
          <div className="space-y-6">
            <h2 className="font-serif text-2xl text-foreground font-medium flex items-center gap-2 border-b border-border/20 pb-3">
              <Sparkles className="w-5 h-5 text-[#c84b2f]" />
              Published Books
            </h2>

            {books.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border/30 rounded-xl bg-[#121212]/10">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium text-sm">No published books listed yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 lg:gap-8">
                {books.map((book) => (
                  <ApprovedBookCard key={book.id} book={book} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
