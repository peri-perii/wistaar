import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Plus, BookOpen, Star, TrendingUp, Users, DollarSign, Loader2, Edit3, X, Sparkles, Award } from 'lucide-react';
import { useAuthorDashboardData } from '@/hooks/useAuthorDashboardData';
import AuthorProfileEdit from '@/components/author/AuthorProfileEdit';

export default function AuthorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAuthor, setIsAuthor] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Fetch author specific dashboard data from custom hook
  const { data: dashboardData, isLoading: dataLoading, refetch } = useAuthorDashboardData();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/author/signup');
      return;
    }
    if (user) {
      checkAuthorRole();
    }
  }, [user, authLoading]);

  const checkAuthorRole = async () => {
    if (!user) return;
    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'author');

      if (error) throw error;

      if (!roles || roles.length === 0) {
        toast({
          title: 'Author Profile Required',
          description: 'You need an author account to view the dashboard.',
          variant: 'destructive',
        });
        navigate('/profile');
      } else {
        setIsAuthor(true);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setCheckingRole(false);
    }
  };

  // Determine "Most Sold" and "Top Rated" books
  const books = dashboardData?.books || [];
  
  const mostSoldBook = useMemo(() => {
    if (books.length === 0) return null;
    const soldBooks = books.filter(b => b.copiesSold > 0);
    if (soldBooks.length === 0) return null;
    return soldBooks.reduce((top, current) => (current.copiesSold > top.copiesSold ? current : top));
  }, [books]);

  const topRatedBook = useMemo(() => {
    if (books.length === 0) return null;
    const ratedBooks = books.filter(b => b.rating > 0);
    if (ratedBooks.length === 0) return null;
    return ratedBooks.reduce((top, current) => (current.rating > top.rating ? current : top));
  }, [books]);

  if (authLoading || checkingRole || dataLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthor || !dashboardData) return null;

  const { profile, stats } = dashboardData;
  const initials = (profile.displayName || profile.username || "A").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground">
      <Navigation />
      <main className="pt-24 pb-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto space-y-10">

          {/* Author Header */}
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pb-6 border-b border-border/30">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
              <Avatar className="w-20 h-20 md:w-24 md:h-24 border border-border/40 shadow-sm shrink-0">
                <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
                <AvatarFallback className="bg-[#c84b2f]/10 text-[#c84b2f] text-xl font-serif">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">{profile.displayName}</h1>
                  <Badge variant="outline" className="text-[10px] border-[#c84b2f]/20 text-[#c84b2f] bg-[#c84b2f]/5 tracking-widest uppercase py-0.5">
                    Author Partner
                  </Badge>
                </div>
                {profile.username && (
                  <p className="text-sm font-medium text-[#c84b2f]">@{profile.username}</p>
                )}
                <p className="text-sm text-muted-foreground/90 max-w-xl leading-relaxed whitespace-pre-line">
                  {profile.bio || "Write a brief description of your background and style by clicking Edit Profile."}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 shrink-0 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="h-10 border-border/40 font-semibold text-sm flex items-center gap-2 hover:bg-muted/10"
              >
                {isEditingProfile ? (
                  <>
                    <X className="w-4 h-4" />
                    Close Editor
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4" />
                    Edit Profile
                  </>
                )}
              </Button>
              <Link to="/publish">
                <Button className="h-10 bg-[#c84b2f] hover:bg-[#c84b2f]/90 text-white font-semibold text-sm flex items-center gap-2 px-5">
                  <Plus className="w-4 h-4" />
                  Publish New Book
                </Button>
              </Link>
            </div>
          </div>

          {/* Profile Edit Drawer Component */}
          {isEditingProfile && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
              <AuthorProfileEdit 
                userId={user!.id} 
                onSuccess={() => {
                  refetch();
                  setIsEditingProfile(false);
                }} 
              />
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'Total Books',
                value: stats.totalBooks.toString(),
                icon: BookOpen,
                color: 'text-muted-foreground',
                bgColor: 'bg-muted/10',
                subtext: 'Approved submissions',
              },
              {
                title: 'Total Sales',
                value: stats.totalSales.toString(),
                icon: TrendingUp,
                color: 'text-emerald-500',
                bgColor: 'bg-emerald-500/10',
                subtext: 'Copies purchased by readers',
              },
              {
                title: 'Total Earnings',
                value: `₹${stats.totalEarnings.toFixed(2)}`,
                icon: DollarSign,
                color: 'text-[#c84b2f]',
                bgColor: 'bg-[#c84b2f]/10',
                subtext: '65% of net catalog revenue',
              },
              {
                title: 'Followers',
                value: stats.followers.toString(),
                icon: Users,
                color: 'text-blue-500',
                bgColor: 'bg-blue-500/10',
                subtext: 'Engaged readers following',
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="border-border/30 bg-[#121212]/10 hover:border-[#c84b2f]/20 transition-all duration-300 shadow-sm">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{stat.title}</p>
                      <p className="text-2xl font-serif font-bold text-foreground truncate mb-0.5">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground/60 truncate font-sans">{stat.subtext}</p>
                    </div>
                    <div className={`${stat.bgColor} p-3 rounded-lg ml-2 shrink-0 flex items-center justify-center`}>
                      <Icon className={`${stat.color} h-5 w-5`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Books Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/20 pb-3">
              <h2 className="font-serif text-2xl text-foreground font-medium flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#c84b2f]" />
                Your Catalog
              </h2>
              <span className="text-xs text-muted-foreground font-mono">{books.length} published books</span>
            </div>

            {books.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border/30 rounded-xl bg-[#121212]/10">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-serif text-xl font-medium text-foreground mb-2">No published books yet</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                  Submit your manuscript, pricing, and cover. Once approved by the admin, it will instantly list here.
                </p>
                <Link to="/publish">
                  <Button className="bg-[#c84b2f] hover:bg-[#c84b2f]/90 text-white font-semibold">
                    Submit Your First Book
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {books.map((book) => {
                  const isTopSeller = mostSoldBook && mostSoldBook.id === book.id && book.copiesSold > 0;
                  const isHighestRated = topRatedBook && topRatedBook.id === book.id && book.rating > 0;

                  return (
                    <Card key={book.id} className="border-border/30 bg-[#0d0d0d] hover:border-[#c84b2f]/20 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-sm relative group">
                      
                      {/* Top Badges overlay */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                        {isTopSeller && (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] tracking-widest uppercase font-extrabold flex items-center gap-1 border-0 shadow-md h-5 px-2">
                            <TrendingUp className="w-2.5 h-2.5" />
                            Most Sold
                          </Badge>
                        )}
                        {isHighestRated && (
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] tracking-widest uppercase font-extrabold flex items-center gap-1 border-0 shadow-md h-5 px-2">
                            <Award className="w-2.5 h-2.5" />
                            Top Rated
                          </Badge>
                        )}
                      </div>

                      <CardContent className="p-5 flex gap-4">
                        {/* Cover image or placeholder */}
                        <div className="w-18 h-24 bg-muted rounded-md overflow-hidden relative shrink-0 shadow-sm">
                          {book.coverUrl ? (
                            <img
                              src={book.coverUrl}
                              alt={book.title}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
                              <BookOpen className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        {/* Text Detail */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="space-y-0.5">
                            <h3 className="font-serif text-lg font-bold text-foreground leading-snug line-clamp-1 group-hover:text-[#c84b2f] transition-colors">{book.title}</h3>
                            <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">{book.genre}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              {book.rating.toFixed(1)}
                            </span>
                            <span>·</span>
                            <span>{book.copiesSold} sold</span>
                          </div>
                        </div>
                      </CardContent>

                      {/* Footer Earnings Split Details */}
                      <div className="bg-[#121212]/30 border-t border-border/20 p-4 flex items-center justify-between text-xs font-mono">
                        <span className="text-muted-foreground">Net Earnings (65%)</span>
                        <span className="font-serif font-bold text-lg text-[#c84b2f]">₹{book.earnings.toFixed(2)}</span>
                      </div>

                    </Card>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
