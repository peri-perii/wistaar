import { X, Mail } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function EmailVerificationBanner() {
  const { user, isEmailVerified } = useAuth();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);

  // Only show if logged in but NOT verified
  if (!user || isEmailVerified || dismissed) return null;

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });
    setResending(false);
    if (error) {
      toast({ title: 'Failed to resend', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Verification email sent',
        description: `Check ${user.email} for the confirmation link.`,
      });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 z-50"
      >
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Mail className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">
            <strong>Please verify your email</strong> — check your inbox for the confirmation link.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 shrink-0"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? 'Sending…' : 'Resend email'}
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-600 hover:text-amber-800 transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
