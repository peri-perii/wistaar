import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Image as ImageIcon, IndianRupee } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { z } from 'zod';

const genres = [
  'Fiction', 'Non-Fiction', 'Poetry', 'Mystery', 'Thriller', 'Romance',
  'Science Fiction', 'Fantasy', 'Horror', 'Biography', 'Self-Help',
  'History', 'Philosophy', 'Children', 'Young Adult', 'Other'
];

const submissionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000),
  genre: z.string().min(1, 'Please select a genre'),
});

export default function BookSubmit() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState('');
  const [freeChapters, setFreeChapters] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) navigate('/author/signup');
  }, [user, loading]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, cover: 'Cover image must be under 5MB' }));
        return;
      }
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      setErrors(prev => { const { cover, ...rest } = prev; return rest; });
    }
  };

  const handleManuscriptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('pdf')) {
        setErrors(prev => ({ ...prev, manuscript: 'Only PDF files are accepted' }));
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, manuscript: 'Manuscript must be under 20MB' }));
        return;
      }
      setManuscriptFile(file);
      setErrors(prev => { const { manuscript, ...rest } = prev; return rest; });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = submissionSchema.safeParse({ title, description, genre });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (isPremium && (!price || parseFloat(price) <= 0)) {
      setErrors(prev => ({ ...prev, price: 'Please enter a valid price' }));
      return;
    }

    if (!manuscriptFile) {
      setErrors(prev => ({ ...prev, manuscript: 'Please upload your manuscript (PDF)' }));
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      let coverUrl: string | null = null;
      let manuscriptUrl: string | null = null;

      // Upload cover image
      if (coverFile) {
        const coverPath = `${user!.id}/${Date.now()}-${coverFile.name}`;
        const { error: coverError } = await supabase.storage
          .from('book-covers')
          .upload(coverPath, coverFile);
        if (coverError) throw new Error('Failed to upload cover image');
        const { data: publicUrl } = supabase.storage.from('book-covers').getPublicUrl(coverPath);
        coverUrl = publicUrl.publicUrl;
      }

      // Upload manuscript
      const manuscriptPath = `${user!.id}/${Date.now()}-${manuscriptFile.name}`;
      const { error: manuscriptError } = await supabase.storage
        .from('book-manuscripts')
        .upload(manuscriptPath, manuscriptFile);
      if (manuscriptError) throw new Error('Failed to upload manuscript');
      manuscriptUrl = manuscriptPath; // Store path, not public URL (private bucket)

      // Create submission record
      const { error: insertError } = await supabase.from('book_submissions').insert({
        author_id: user!.id,
        title: title.trim(),
        description: description.trim(),
        genre,
        cover_image_url: coverUrl,
        manuscript_url: manuscriptUrl,
        status: 'pending',
        price: isPremium ? parseFloat(price) : 0,
        free_chapters: isPremium ? freeChapters : 0,
      });

      if (insertError) throw new Error('Failed to create submission');

      // Trigger email notification to admin
      try {
        await supabase.functions.invoke('notify-admin-submission', {
          body: { bookTitle: title.trim(), authorEmail: user!.email, genre },
        });
      } catch {
        // Non-critical: submission still created even if email fails
        console.warn('Admin notification failed, but submission was created');
      }

      toast({
        title: 'Book submitted!',
        description: 'Your manuscript has been submitted for review. We\'ll notify you once it\'s reviewed.',
      });

      navigate('/author/dashboard');
    } catch (err: any) {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
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
        <div className="max-w-2xl mx-auto">
          <div className="mb-10">
            <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">Submit Your Book</h1>
            <p className="text-muted-foreground">
              Fill in the details below. Our team will review your submission and get back to you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Book Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your book title"
                className="h-12"
                disabled={isSubmitting}
                maxLength={200}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>

            {/* Genre */}
            <div className="space-y-2">
              <Label>Genre *</Label>
              <Select value={genre} onValueChange={setGenre} disabled={isSubmitting}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a genre" />
                </SelectTrigger>
                <SelectContent>
                  {genres.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.genre && <p className="text-sm text-destructive">{errors.genre}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a brief description of your book (synopsis, themes, etc.)"
                rows={5}
                disabled={isSubmitting}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">{description.length}/2000</p>
              {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <Label>Cover Image (optional)</Label>
              <div className="flex items-start gap-4">
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover preview" className="w-24 h-32 object-cover rounded border border-border" />
                ) : (
                  <div className="w-24 h-32 bg-muted rounded border border-dashed border-border flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex-1">
                  <label className="cursor-pointer">
                    <div className="border border-dashed border-border rounded-lg p-4 text-center hover:border-accent/40 transition-colors">
                      <Upload className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {coverFile ? coverFile.name : 'Click to upload cover image'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG — Max 5MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleCoverChange}
                      className="hidden"
                      disabled={isSubmitting}
                    />
                  </label>
                </div>
              </div>
              {errors.cover && <p className="text-sm text-destructive">{errors.cover}</p>}
            </div>

            {/* Pricing */}
            <div className="space-y-4 rounded-lg border border-border p-5 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Premium Content</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Charge readers for access to your book
                  </p>
                </div>
                <Switch checked={isPremium} onCheckedChange={setIsPremium} disabled={isSubmitting} />
              </div>

              {isPremium && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹) *</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="price"
                        type="number"
                        min="29"
                        max="9999"
                        step="1"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="199"
                        className="h-12 pl-9"
                        disabled={isSubmitting}
                      />
                    </div>
                    {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Free preview chapters</Label>
                      <span className="text-sm font-medium text-foreground">{freeChapters}</span>
                    </div>
                    <Slider
                      value={[freeChapters]}
                      onValueChange={(v) => setFreeChapters(v[0])}
                      min={1}
                      max={10}
                      step={1}
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground">
                      Readers can read the first {freeChapters} chapter{freeChapters > 1 ? 's' : ''} for free
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Manuscript (PDF) *</Label>
              <label className="cursor-pointer block">
                <div className={`border border-dashed rounded-lg p-6 text-center hover:border-accent/40 transition-colors ${
                  manuscriptFile ? 'border-accent/40 bg-accent/5' : 'border-border'
                }`}>
                  {manuscriptFile ? (
                    <>
                      <FileText className="w-8 h-8 mx-auto mb-2 text-accent" />
                      <p className="text-sm text-foreground font-medium">{manuscriptFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(manuscriptFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload your manuscript</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF only — Max 20MB</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleManuscriptChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
              </label>
              {errors.manuscript && <p className="text-sm text-destructive">{errors.manuscript}</p>}
            </div>

            <div className="pt-4">
              <Button type="submit" size="lg" className="w-full h-12" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit for Review'}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Your submission will be reviewed by our team. You'll receive a notification once it's approved.
              </p>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
