import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Feather, Check } from "lucide-react";

interface UpgradeToAuthorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess?: () => void;
}

export default function UpgradeToAuthor({ isOpen, onOpenChange, userId, onSuccess }: UpgradeToAuthorProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      // 1. Check if user already has author role in user_roles
      const { data: existingRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "author");

      if (!existingRoles || existingRoles.length === 0) {
        // Insert 'author' role in user_roles
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "author" as any });

        if (roleError && !roleError.message?.includes("duplicate key")) {
          throw roleError;
        }
      }

      // 2. Update profiles table role to 'author'
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: "author" })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      toast({
        title: "Pen Name Activated",
        description: "Welcome to the Wistaar Author Portal. You are now an author!",
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
      
      // Redirect to author dashboard
      navigate("/author/dashboard");
    } catch (err: any) {
      toast({
        title: "Upgrade Failed",
        description: err.message || "An unexpected error occurred during the upgrade.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-[#0d0d0d] border border-border/40 text-foreground p-6 rounded-xl">
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#c84b2f]/10 flex items-center justify-center text-[#c84b2f] mb-2">
            <Feather className="w-5 h-5" />
          </div>
          <DialogTitle className="font-serif text-2xl text-center font-medium leading-none">
            Become a Wistaar Author
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground/90 font-sans leading-relaxed pt-1">
            Publish your stories directly to readers around the world. Upgrading is completely free and instant.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {[
            "Retain 100% intellectual property ownership",
            "Earn a premium 65% royalty split on every sale",
            "Access detailed real-time reader stats and reviews",
            "Clean, clutter-free, completely ad-free reader environment"
          ].map((benefit) => (
            <div key={benefit} className="flex items-center gap-3 text-sm text-foreground/80 font-sans">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#c84b2f]/15 text-[#c84b2f] flex items-center justify-center">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5 pt-4">
          <Button
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className="w-full h-11 bg-[#c84b2f] hover:bg-[#c84b2f]/90 text-white font-semibold text-sm rounded-lg"
          >
            {isUpgrading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Activating Pen Name...
              </>
            ) : (
              "Confirm Free Upgrade"
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isUpgrading}
            className="w-full h-11 text-muted-foreground hover:text-foreground font-semibold text-sm hover:bg-muted/10 rounded-lg"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
