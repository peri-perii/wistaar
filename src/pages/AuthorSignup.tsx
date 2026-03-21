import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import { PenLine, Eye, EyeOff } from 'lucide-react';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters').max(100);

export default function AuthorSignup() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      handlePostLogin();
    }
  }, [user, loading]);

  const handlePostLogin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'author');

    if (data && data.length > 0) {
      navigate('/author/dashboard');
      return;
    }

    // Check if there's a pending author signup
    const pending = localStorage.getItem('pending_author_signup');
    if (pending) {
      localStorage.removeItem('pending_author_signup');
      await assignAuthorRoleIfNeeded();
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) newErrors.email = emailResult.error.errors[0].message;

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) newErrors.password = passwordResult.error.errors[0].message;

    if (isSignUp) {
      const nameResult = nameSchema.safeParse(authorName);
      if (!nameResult.success) newErrors.authorName = nameResult.error.errors[0].message;
      if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
          return;
        }

        // After signup, we need to assign author role once they verify email
        // Store the intent in localStorage so we can assign role after verification
        localStorage.setItem('pending_author_signup', JSON.stringify({ name: authorName }));

        toast({
          title: 'Check your email',
          description: 'We sent you a confirmation link. Please verify your email to complete author registration.',
        });
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
          return;
        }
        // Check and assign author role if needed
        await assignAuthorRoleIfNeeded();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const assignAuthorRoleIfNeeded = async () => {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user?.id;
    if (!userId) return;

    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'author');

    if (!existingRole || existingRole.length === 0) {
      await supabase.from('user_roles').insert({ user_id: userId, role: 'author' as any });
    }

    navigate('/author/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-12">
            <a href="/" className="text-2xl font-serif text-foreground">Wistaar</a>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <PenLine className="w-5 h-5 text-accent" />
              <span className="text-sm uppercase tracking-widest text-accent">Author Portal</span>
            </div>
            <h1 className="text-3xl font-serif text-foreground mb-2">
              {isSignUp ? 'Create your author account' : 'Welcome back, author'}
            </h1>
            <p className="text-muted-foreground">
              {isSignUp
                ? 'Start publishing your stories on Wistaar.'
                : 'Sign in to manage your submissions.'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={isSignUp ? 'signup' : 'signin'}
              onSubmit={handleSubmit}
              className="space-y-5"
              initial={{ x: isSignUp ? 50 : -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isSignUp ? -50 : 50, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="authorName">Author Name</Label>
                  <Input
                    id="authorName"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your pen name or full name"
                    className="h-12 bg-background border-border"
                    disabled={isLoading}
                  />
                  {errors.authorName && <p className="text-sm text-destructive">{errors.authorName}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 bg-background border-border"
                  disabled={isLoading}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 bg-background border-border pr-12"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-12 bg-background border-border pr-12"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full h-12" disabled={isLoading}>
                {isLoading
                  ? (isSignUp ? 'Creating account...' : 'Signing in...')
                  : (isSignUp ? 'Create Author Account' : 'Sign in')}
              </Button>
            </motion.form>
          </AnimatePresence>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              {isSignUp ? 'Already have an author account?' : "Don't have an author account?"}{' '}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setErrors({}); }}
                className="text-foreground hover:text-accent transition-colors underline-offset-4 hover:underline"
                disabled={isLoading}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
            <Separator className="my-6" />
            <p className="text-sm text-muted-foreground">
              Looking to read instead?{' '}
              <a href="/auth" className="text-foreground hover:text-accent transition-colors underline-offset-4 hover:underline">
                Reader sign in
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-muted items-center justify-center p-12">
        <div className="max-w-md text-center">
          <blockquote className="text-2xl font-serif text-foreground leading-relaxed mb-6">
            "Every story deserves a reader who truly listens."
          </blockquote>
          <cite className="text-muted-foreground">— A Wistaar Author</cite>
        </div>
      </div>
    </div>
  );
}
