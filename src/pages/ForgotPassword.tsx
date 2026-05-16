import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { requestPasswordReset } from '@/integrations/password-reset';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { motion } from 'framer-motion';

const emailSchema = z.string().email('Please enter a valid email address');

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setEmailError(result.error.errors[0].message);
      return;
    }
    setEmailError('');
    setIsLoading(true);

    try {
      await requestPasswordReset(email);
      setSent(true);
      toast({
        title: 'Reset link sent',
        description: 'Check your email for the password reset link',
      });
    } catch (error) {
      toast({
        title: 'Error sending reset link',
        description: error instanceof Error ? error.message : 'Failed to send reset link',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-12">
            <a href="/" className="text-2xl font-display font-medium text-foreground">
              Wistaar
            </a>
          </div>

          <Link
            to="/auth"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-display font-medium text-foreground mb-3">
                Check your inbox
              </h1>
              <p className="text-muted-foreground mb-2">
                We've sent a password reset link to
              </p>
              <p className="font-medium text-foreground mb-6">{email}</p>
              <p className="text-sm text-muted-foreground mb-8">
                The link expires in 1 hour. Check your spam folder if you don't see it.
              </p>
              <Button variant="outline" onClick={() => setSent(false)}>
                Send again
              </Button>
            </motion.div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-display font-medium text-foreground mb-2">
                  Reset your password
                </h1>
                <p className="text-muted-foreground">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-12 bg-background border-border focus:border-accent pl-12"
                      disabled={isLoading}
                      autoFocus
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                </div>

                <Button type="submit" size="lg" className="w-full h-12" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send reset link'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 bg-muted items-center justify-center p-12">
        <div className="max-w-md text-center">
          <blockquote className="text-2xl font-display font-medium text-foreground leading-relaxed mb-6">
            "Not all those who wander are lost."
          </blockquote>
          <cite className="text-muted-foreground">— J.R.R. Tolkien</cite>
        </div>
      </div>
    </div>
  );
}
