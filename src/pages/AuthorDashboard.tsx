import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, BookOpen, Clock, CheckCircle, XCircle, Trash2, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuthorEarnings } from '@/hooks/useAuthorEarnings';
import EarningsOverview from '@/components/author/EarningsOverview';
import EarningsBreakdown from '@/components/author/EarningsBreakdown';
import RecentSales from '@/components/author/RecentSales';

interface BookSubmission {
  id: string;
  title: string;
  description: string;
  genre: string;
  status: string;
  submitted_at: string;
  admin_feedback: string | null;
  cover_image_url: string | null;
}

export default function AuthorDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<BookSubmission[]>([]);
  const [isAuthor, setIsAuthor] = useState(false);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<'submissions' | 'earnings'>('earnings');
  const { data: earningsData, isLoading: earningsLoading } = useAuthorEarnings();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/author/signup');
      return;
    }
    if (user) {
      checkAuthorAndLoad();
    }
  }, [user, loading]);

  const checkAuthorAndLoad = async () => {
    if (!user) return;

    // Check author role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'author');

    if (!roles || roles.length === 0) {
      // Check if pending signup
      const pending = localStorage.getItem('pending_author_signup');
      if (pending) {
        // Assign author role
        await supabase.from('user_roles').insert({ user_id: user.id, role: 'author' as any });
        const { name } = JSON.parse(pending);
        if (name) {
          await supabase.from('profiles').update({ display_name: name }).eq('user_id', user.id);
        }
        localStorage.removeItem('pending_author_signup');
        setIsAuthor(true);
      } else {
        toast({ title: 'Access denied', description: 'You need an author account to access this page.', variant: 'destructive' });
        navigate('/author/signup');
        return;
      }
    } else {
      setIsAuthor(true);
    }

    // Load submissions
    const { data: subs } = await supabase
      .from('book_submissions')
      .select('*')
      .eq('author_id', user.id)
      .order('submitted_at', { ascending: false });

    if (subs) setSubmissions(subs as unknown as BookSubmission[]);
    setChecking(false);
  };

  const handleDelete = async (sub: BookSubmission) => {
    try {
      const { error } = await supabase.from('book_submissions').delete().eq('id', sub.id);
      if (error) throw error;
      toast({ title: 'Book removed', description: `"${sub.title}" has been removed.` });
      setSubmissions(prev => prev.filter(s => s.id !== sub.id));
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const statusConfig = {
    pending: { icon: Clock, label: 'Pending Review', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    approved: { icon: CheckCircle, label: 'Approved', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    rejected: { icon: XCircle, label: 'Rejected', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  };

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-24 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">Author Dashboard</h1>
              <p className="text-muted-foreground">Manage submissions and track earnings</p>
            </div>
            <Link to="/author/submit">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Submit New Book
              </Button>
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-border">
            <button
              onClick={() => setActiveTab('earnings')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'earnings'
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Earnings & Analytics
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'submissions'
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="w-4 h-4 inline mr-2" />
              My Submissions
            </button>
          </div>

          {/* Earnings Tab */}
          {activeTab === 'earnings' && (
            <div>
              <EarningsOverview 
                stats={{
                  totalEarnings: earningsData?.totalEarnings || 0,
                  totalSales: earningsData?.totalSales || 0,
                  topBook: earningsData?.topBook || null,
                }}
                isLoading={earningsLoading}
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <EarningsBreakdown
                    bookEarnings={earningsData?.bookEarnings || []}
                    isLoading={earningsLoading}
                  />
                </div>
                <div>
                  <RecentSales />
                </div>
              </div>
            </div>
          )}

          {/* Submissions Tab */}
          {activeTab === 'submissions' && (
            <>
              {submissions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-4" />
                    <h3 className="font-serif text-xl text-foreground mb-2">No submissions yet</h3>
                    <p className="text-muted-foreground mb-6">Submit your first book to get started.</p>
                    <Link to="/author/submit">
                      <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        Submit Your First Book
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {submissions.map((sub) => {
                    const config = statusConfig[sub.status as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    return (
                      <Card key={sub.id} className="hover:border-accent/30 transition-colors">
                        <CardContent className="flex items-center gap-6 p-6">
                          {sub.cover_image_url ? (
                            <img
                              src={sub.cover_image_url}
                              alt={sub.title}
                              className="w-16 h-20 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-20 bg-muted rounded flex items-center justify-center">
                              <BookOpen className="w-6 h-6 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-serif text-lg text-foreground mb-1 truncate">{sub.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{sub.genre}</p>
                            <p className="text-sm text-muted-foreground truncate">{sub.description}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <Badge variant="outline" className={config.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(sub.submitted_at).toLocaleDateString()}
                            </span>
                            <Link to={`/reader/${sub.id}`}>
                              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs border-accent/20 hover:bg-accent/5 hover:text-accent">
                                <BookOpen className="w-3.5 h-3.5" />
                                Preview Layout
                              </Button>
                            </Link>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs text-destructive hover:text-destructive">
                                  <Trash2 className="w-3 h-3" />
                                  Remove
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove "{sub.title}"?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently remove this book. This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(sub)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                        {sub.admin_feedback && sub.status === 'rejected' && (
                          <div className="px-6 pb-4">
                            <div className="bg-destructive/5 border border-destructive/10 rounded p-3">
                              <p className="text-sm text-destructive"><strong>Feedback:</strong> {sub.admin_feedback}</p>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
