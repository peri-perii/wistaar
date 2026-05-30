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
import { BookOpen, Users, Star, Award, TrendingUp, Sparkles, AlertCircle } from "lucide-react";
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

export default function AuthorProfile() {
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
        rating: Number(s.rating),
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

  // Find most rated book
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading author profile...</div>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 flex flex-col items-center justify-center py-20 px-6">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="font-serif text-2xl text-foreground mb-2">Author Not Found</h2>
          <p className="text-muted-foreground mb-6">The username @{username} does not exist or is not registered as an author.</p>
          <Link to="/explore">
            <Button>Explore Books</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-24 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Author Banner Card */}
          <Card className="border border-border/60 bg-gradient-to-r from-secondary/30 via-background to-secondary/15 mb-12 overflow-hidden shadow-sm">
            <CardContent className="p-8 md:p-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                <Avatar className="w-24 h-24 md:w-28 md:h-28 border-2 border-primary/20 shadow-md">
                  <AvatarImage src={author.avatar_url || undefined} alt={author.display_name || ""} />
                  <AvatarFallback className="bg-accent text-accent-foreground text-2xl font-serif">
                    {(author.display_name || author.username || "A").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-3">
                  <div>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
                      <h1 className="font-serif text-3xl text-foreground font-medium">{author.display_name || "Unknown Author"}</h1>
                      <Badge variant="outline" className="text-xs border-accent/30 text-accent font-semibold tracking-wider uppercase">
                        Author
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">@{author.username}</p>
                  </div>
                  <p className="text-foreground/80 text-sm max-w-xl leading-relaxed whitespace-pre-line">
                    {author.bio || "No bio added yet."}
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      {followerCount} <span className="text-muted-foreground font-normal">followers</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      {books.length} <span className="text-muted-foreground font-normal">books published</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Follow action button */}
              {(!currentUser || currentUser.id !== author.user_id) && (
                <div className="shrink-0 pt-2">
                  <Button
                    onClick={handleFollowToggle}
                    disabled={actionLoading}
                    variant={isFollowing ? "outline" : "default"}
                    className="w-36 font-semibold"
                  >
                    {isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Highlights Section */}
          {(mostSoldBook || (mostRatedBook && mostRatedBook.rating > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {mostSoldBook && (
                <Card className="border-emerald-500/20 bg-emerald-500/[0.02] flex items-center p-6 gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-emerald-600 font-bold block mb-1">Most Sold Book</span>
                    <Link to={`/book/${mostSoldBook.id}`} className="font-serif text-lg text-foreground hover:text-primary transition-colors line-clamp-1 font-semibold">
                      {mostSoldBook.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">A reader favorite on Wistaar</p>
                  </div>
                </Card>
              )}
              {mostRatedBook && mostRatedBook.rating > 0 && (
                <Card className="border-amber-500/20 bg-amber-500/[0.02] flex items-center p-6 gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-amber-600 font-bold block mb-1">Highest Rated</span>
                    <Link to={`/book/${mostRatedBook.id}`} className="font-serif text-lg text-foreground hover:text-primary transition-colors line-clamp-1 font-semibold">
                      {mostRatedBook.title}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span className="text-xs font-semibold text-foreground">{mostRatedBook.rating.toFixed(1)} / 5.0</span>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Books grid */}
          <div>
            <h2 className="font-serif text-2xl text-foreground mb-8 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Published Books
            </h2>

            {books.length === 0 ? (
              <div className="text-center py-16 border border-dashed rounded-lg bg-card/30">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No published books listed yet.</p>
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
