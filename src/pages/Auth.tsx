import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, BookOpen, PenLine, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import { useSEO } from '@/hooks/useSEO';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const [view, setView] = useState<'select' | 'auth'>('select');
  const [isSignUp, setIsSignUp] = useState(false);

  useSEO({
    title: view === 'select' ? 'Get Started' : (isSignUp ? 'Create Account' : 'Sign In'),
    description: 'Sign in or create your Wistaar account to start reading and publishing eBooks.',
    canonicalPath: '/auth',
    noIndex: true,
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; confirmPassword?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    if (isSignUp && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
          toast({
            title: 'Sign up failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Check your email',
            description: 'We sent you a confirmation link. Please verify your email to continue.',
          });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: 'Sign in failed',
            description: error.message,
            variant: 'destructive',
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setErrors({});
    setPassword('');
    setConfirmPassword('');
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
      <AnimatePresence mode="wait">
        {view === 'select' ? (
          <motion.div
            key="select-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 flex flex-col justify-between py-12 px-6"
          >
            {/* Top header */}
            <div className="max-w-4xl mx-auto w-full flex items-center justify-between mb-8">
              <Link to="/" className="text-2xl font-serif text-foreground">
                Wistaar
              </Link>
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>

            {/* Path Selection Content */}
            <div className="flex-1 flex items-center justify-center py-8">
              <div className="w-full max-w-3xl mx-auto text-center space-y-10">
                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-foreground tracking-tight max-w-xl mx-auto leading-tight">
                    Begin your journey on Wistaar
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                    Choose how you would like to experience the reading studio.
                  </p>
                </div>

                {/* Split choices grid */}
                <div className="grid sm:grid-cols-2 gap-6 text-left max-w-2xl mx-auto">
                  {/* Reader Card */}
                  <motion.div
                    whileHover={{ y: -4, borderColor: "rgba(200, 75, 47, 0.4)" }}
                    className="bg-[#121212]/30 border border-border/30 rounded-xl p-6 flex flex-col justify-between space-y-6 transition-all duration-300"
                  >
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-lg bg-[#c84b2f]/10 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-[#c84b2f]" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-serif font-medium text-foreground">Start as Reader</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          Discover, purchase, and read premium independent books. Follow and support your favorite writers.
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => {
                        setIsSignUp(true);
                        setView('auth');
                      }}
                      className="w-full bg-[#c84b2f] hover:bg-[#c84b2f]/90 text-white font-semibold h-11"
                    >
                      Join as Reader
                    </Button>
                  </motion.div>

                  {/* Author Card */}
                  <motion.div
                    whileHover={{ y: -4, borderColor: "rgba(200, 75, 47, 0.4)" }}
                    className="bg-[#121212]/30 border border-border/30 rounded-xl p-6 flex flex-col justify-between space-y-6 transition-all duration-300"
                  >
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-lg bg-[#c84b2f]/10 flex items-center justify-center">
                        <PenLine className="w-6 h-6 text-[#c84b2f]" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-serif font-medium text-foreground">Start as Author</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          Publish, distribute, and monetize your original manuscripts. Earn a transparent 65% royalty on sales.
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => navigate('/author/signup')}
                      variant="outline"
                      className="w-full border-border/40 hover:border-[#c84b2f] hover:text-[#c84b2f] font-semibold h-11"
                    >
                      Join as Author
                    </Button>
                  </motion.div>
                </div>

                {/* Existing user link */}
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setIsSignUp(false);
                      setView('auth');
                    }}
                    className="text-foreground hover:text-[#c84b2f] font-semibold underline underline-offset-4 transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>

            {/* Footer info spacing */}
            <div className="max-w-4xl mx-auto w-full text-center text-xs text-muted-foreground/40 font-mono">
              WISTAAR READING STUDIO · SECURE ONBOARDING
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="auth-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 flex"
          >
            {/* Left side - Form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
              <div className="w-full max-w-md">
                <div className="mb-12 flex items-center justify-between">
                  <Link to="/" className="text-2xl font-serif text-foreground">
                    Wistaar
                  </Link>
                  <button
                    type="button"
                    onClick={() => setView('select')}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-sans font-semibold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                </div>
                
                <div className="mb-8">
                  <h1 className="text-3xl font-serif text-foreground mb-2">
                    {isSignUp ? 'Create your account' : 'Welcome back'}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {isSignUp 
                      ? 'Start your reading journey today.' 
                      : 'Sign in to continue reading.'}
                  </p>
                </div>

                {/* Google Sign In */}
                <div className="mb-6">
                  <GoogleLoginButton 
                    onSuccess={() => navigate('/')}
                    onError={() => setIsLoading(false)}
                  />
                </div>

                <div className="relative mb-6">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground uppercase">
                    or
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-12 bg-background border-border focus:border-accent"
                      disabled={isLoading}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-foreground">Password</Label>
                      {!isSignUp && (
                        <Link
                          to="/forgot-password"
                          className="text-xs text-muted-foreground hover:text-accent transition-colors"
                        >
                          Forgot password?
                        </Link>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-12 bg-background border-border focus:border-accent pr-12"
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
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="h-12 bg-background border-border focus:border-accent pr-12"
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
                      {errors.confirmPassword && (
                        <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                      )}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full h-12"
                    disabled={isLoading}
                  >
                    {isLoading 
                      ? (isSignUp ? 'Creating account...' : 'Signing in...') 
                      : (isSignUp ? 'Create account' : 'Sign in')}
                  </Button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-muted-foreground">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button 
                      onClick={toggleMode}
                      className="text-foreground hover:text-accent transition-colors underline-offset-4 hover:underline"
                      disabled={isLoading}
                    >
                      {isSignUp ? 'Sign in' : 'Sign up'}
                    </button>
                  </p>
                </div>
              </div>
            </div>

            {/* Right side - Visual */}
            <div className="hidden lg:flex flex-1 bg-[#121212]/30 items-center justify-center p-12 border-l border-border/20">
              <div className="max-w-md text-center">
                <blockquote className="text-2xl font-serif text-foreground leading-relaxed mb-6">
                  "A reader lives a thousand lives before he dies. The man who never reads lives only one."
                </blockquote>
                <cite className="text-muted-foreground text-sm">— George R.R. Martin</cite>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
