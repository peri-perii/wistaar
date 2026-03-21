import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, CheckCircle, XCircle, Clock, Download, Eye, Trash2, Users, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import AdminManagement from '@/components/admin/AdminManagement';
import CouponManagement from '@/components/admin/CouponManagement';

interface Submission {
  id: string;
  author_id: string;
  title: string;
  description: string;
  genre: string;
  status: string;
  submitted_at: string;
  cover_image_url: string | null;
  manuscript_url: string | null;
  admin_feedback: string | null;
}

const SUPER_ADMIN_EMAIL = 'priyamj1502@gmail.com';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    if (!loading && !user) { navigate('/auth'); return; }
    if (user) checkAdminAndLoad();
  }, [user, loading]);

  const checkAdminAndLoad = async () => {
    if (!user) return;
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (!roles || roles.length === 0) {
      toast({ title: 'Access denied', description: 'Admin access required.', variant: 'destructive' });
      navigate('/');
      return;
    }

    setIsAdmin(true);

    // Check super admin
    const { data: perms } = await supabase
      .from('admin_permissions' as any)
      .select('is_super_admin')
      .eq('user_id', user.id)
      .single();
    setIsSuperAdmin(!!(perms as any)?.is_super_admin);

    await loadSubmissions();
    setChecking(false);
  };

  const loadSubmissions = async () => {
    let query = supabase.from('book_submissions').select('*').order('submitted_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    if (data) setSubmissions(data as unknown as Submission[]);
  };

  useEffect(() => {
    if (isAdmin) loadSubmissions();
  }, [filter]);

  const handleAction = async (action: 'approved' | 'rejected') => {
    if (!selectedSub || !user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('book_submissions')
        .update({
          status: action,
          admin_feedback: feedback.trim() || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        } as any)
        .eq('id', selectedSub.id);

      if (error) throw error;

      // Notify the author in-app
      const notifTitle = action === 'approved'
        ? `✅ "${selectedSub.title}" has been approved!`
        : `❌ "${selectedSub.title}" was not approved`;
      const notifMessage = action === 'approved'
        ? `Congratulations! Your book is now live on Wistaar and available for readers.`
        : `Your submission was reviewed. ${feedback.trim() ? `Feedback: ${feedback.trim()}` : 'Please review and resubmit.'}`;

      await supabase.from('notifications' as any).insert({
        user_id: selectedSub.author_id,
        title: notifTitle,
        message: notifMessage,
        type: action === 'approved' ? 'book_approved' : 'book_rejected',
      } as any);

      if (action === 'approved' && selectedSub.manuscript_url) {
        toast({ title: 'Book Approved!', description: `Extracting chapters from "${selectedSub.title}"...` });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-chapters`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({ book_id: selectedSub.id }),
            }
          );
          toast({ title: 'Chapters extracted!', description: `"${selectedSub.title}" is now ready to read.` });
        } catch {
          toast({ title: 'Extraction note', description: 'Book approved but chapter extraction may still be processing.' });
        }
      } else {
        toast({
          title: action === 'approved' ? 'Book Approved!' : 'Book Rejected',
          description: `"${selectedSub.title}" has been ${action}.`,
        });
      }

      setSelectedSub(null);
      setFeedback('');
      await loadSubmissions();
    } catch (err: any) {
      toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (sub: Submission) => {
    try {
      const { error } = await supabase.from('book_submissions').delete().eq('id', sub.id);
      if (error) throw error;
      toast({ title: 'Book removed', description: `"${sub.title}" has been removed.` });
      await loadSubmissions();
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const downloadManuscript = async (manuscriptUrl: string) => {
    const { data, error } = await supabase.storage
      .from('book-manuscripts')
      .createSignedUrl(manuscriptUrl, 3600);
    if (error || !data?.signedUrl) {
      toast({ title: 'Download failed', description: 'Could not generate download link.', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const statusConfig = {
    pending: { icon: Clock, label: 'Pending', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
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
          <div className="mb-10">
            <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage books, coupons{isSuperAdmin ? ', and admins' : ''}</p>
          </div>

          <Tabs defaultValue="submissions">
            <TabsList className="mb-8 h-auto flex-wrap gap-1">
              <TabsTrigger value="submissions" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Book Submissions
              </TabsTrigger>
              <TabsTrigger value="coupons" className="gap-2">
                <Tag className="w-4 h-4" />
                Coupons
              </TabsTrigger>
              {isSuperAdmin && (
                <TabsTrigger value="admins" className="gap-2">
                  <Users className="w-4 h-4" />
                  Manage Admins
                </TabsTrigger>
              )}
            </TabsList>

            {/* ── Submissions Tab ── */}
            <TabsContent value="submissions">
              {/* Filter tabs */}
              <div className="flex gap-2 mb-8 flex-wrap">
                {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
                  <Button
                    key={f}
                    variant={filter === f ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className="capitalize"
                  >
                    {f}
                  </Button>
                ))}
              </div>

              {submissions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-4" />
                    <h3 className="font-serif text-xl text-foreground mb-2">No {filter} submissions</h3>
                    <p className="text-muted-foreground">
                      {filter === 'pending' ? 'No books awaiting review.' : `No ${filter} submissions found.`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {submissions.map(sub => {
                    const config = statusConfig[sub.status as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    return (
                      <Card key={sub.id} className="hover:border-accent/30 transition-colors">
                        <CardContent className="flex items-start gap-6 p-6">
                          {sub.cover_image_url ? (
                            <img src={sub.cover_image_url} alt={sub.title} className="w-20 h-28 object-cover rounded" />
                          ) : (
                            <div className="w-20 h-28 bg-muted rounded flex items-center justify-center">
                              <BookOpen className="w-6 h-6 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-serif text-lg text-foreground mb-1">{sub.title}</h3>
                                <p className="text-sm text-muted-foreground mb-1">{sub.genre}</p>
                                <p className="text-sm text-muted-foreground line-clamp-2">{sub.description}</p>
                              </div>
                              <Badge variant="outline" className={config.color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {config.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-4 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                Submitted {new Date(sub.submitted_at).toLocaleDateString()}
                              </span>
                              {sub.manuscript_url && (
                                <Button variant="ghost" size="sm" onClick={() => downloadManuscript(sub.manuscript_url!)} className="gap-1 h-7 text-xs">
                                  <Download className="w-3 h-3" />
                                  Download PDF
                                </Button>
                              )}
                              {sub.status === 'pending' && (
                                <Button variant="outline" size="sm" onClick={() => { setSelectedSub(sub); setFeedback(''); }} className="gap-1 h-7 text-xs">
                                  <Eye className="w-3 h-3" />
                                  Review
                                </Button>
                              )}
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
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── Coupons Tab ── */}
            <TabsContent value="coupons">
              <CouponManagement />
            </TabsContent>

            {/* ── Admins Tab (super admin only) ── */}
            {isSuperAdmin && (
              <TabsContent value="admins">
                <AdminManagement />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* Review Dialog */}
      <Dialog open={!!selectedSub} onOpenChange={() => setSelectedSub(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Review: {selectedSub?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Genre</p>
              <p className="text-sm text-muted-foreground">{selectedSub?.genre}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Description</p>
              <p className="text-sm text-muted-foreground">{selectedSub?.description}</p>
            </div>
            {selectedSub?.manuscript_url && (
              <Button variant="outline" size="sm" onClick={() => downloadManuscript(selectedSub.manuscript_url!)} className="gap-2">
                <Download className="w-4 h-4" />
                Download Manuscript
              </Button>
            )}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Feedback (optional)</p>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add feedback for the author..."
                rows={3}
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleAction('rejected')} disabled={actionLoading} className="gap-1 text-destructive hover:text-destructive">
              <XCircle className="w-4 h-4" />
              Reject
            </Button>
            <Button onClick={() => handleAction('approved')} disabled={actionLoading} className="gap-1">
              <CheckCircle className="w-4 h-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
