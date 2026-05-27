import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, Shield, Check, Info, Settings, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { cn } from "@/lib/utils";

export default function CookieConsent() {
  const {
    preferences,
    showBanner,
    acceptAll,
    rejectNonEssential,
    saveCustom,
  } = useCookieConsent();

  const [visible, setVisible] = useState(false);
  const [customizeMode, setCustomizeMode] = useState(false);
  
  // Custom switch states
  const [analytics, setAnalytics] = useState(preferences.analytics);
  const [marketing, setMarketing] = useState(preferences.marketing);

  // Sync state with preferences when they change
  useEffect(() => {
    setAnalytics(preferences.analytics);
    setMarketing(preferences.marketing);
  }, [preferences]);

  // Open preferences event listener
  useEffect(() => {
    const handleOpenPrefs = () => {
      setVisible(true);
      setCustomizeMode(true);
    };
    window.addEventListener("wistaar-open-cookie-preferences", handleOpenPrefs);
    return () => {
      window.removeEventListener("wistaar-open-cookie-preferences", handleOpenPrefs);
    };
  }, []);

  // Control visibility with a small delay for mounting/unmounting animation
  useEffect(() => {
    if (showBanner) {
      setVisible(true);
    } else {
      // Allow exit animation to run
      const timer = setTimeout(() => {
        if (!showBanner) {
          setVisible(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showBanner]);

  if (!visible && !showBanner) return null;

  const handleSaveCustom = () => {
    saveCustom({ analytics, marketing });
    setCustomizeMode(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <div className="fixed inset-0 bg-background/20 backdrop-blur-xs z-50 pointer-events-none md:hidden" />
      )}
      
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className={cn(
            "fixed bottom-6 left-6 right-6 md:left-auto md:right-6 z-50",
            "max-w-md w-auto md:w-[26rem]",
            "bg-background/95 dark:bg-zinc-900/95 backdrop-blur-xl",
            "border border-border/80 dark:border-zinc-800 shadow-2xl rounded-2xl",
            "p-6 flex flex-col gap-5 pointer-events-auto",
            "transition-all duration-300"
          )}
        >
          {!customizeMode ? (
            /* SIMPLE/INITIAL VIEW */
            <>
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0 dark:bg-primary/20">
                  <Cookie className="h-6 w-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground font-serif">
                    Cookie Preferences
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We use cookies to personalize your reading experience, analyze site usage, and assist in our marketing efforts.
                  </p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground flex gap-1.5 items-center">
                <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>
                  Read our{" "}
                  <a
                    href="/privacy"
                    className="underline hover:text-foreground font-medium transition-colors"
                  >
                    Privacy Policy
                  </a>{" "}
                  for more details.
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomizeMode(true)}
                  className="w-full sm:w-auto hover:bg-muted font-medium transition-all"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Customize
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={rejectNonEssential}
                  className="w-full sm:w-auto text-muted-foreground hover:text-foreground font-medium transition-all"
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={acceptAll}
                  className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all"
                >
                  Accept All
                </Button>
              </div>
            </>
          ) : (
            /* DETAILED CUSTOMIZE VIEW */
            <>
              <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCustomizeMode(false)}
                  className="h-8 w-8 rounded-full shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h3 className="text-base font-semibold text-foreground font-serif">
                    Cookie Settings
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Customize your data preferences below
                  </p>
                </div>
              </div>

              <div className="space-y-4 max-h-[16rem] overflow-y-auto pr-1 py-1">
                {/* Essential Cookies */}
                <div className="flex items-start justify-between gap-4 p-3 bg-muted/40 rounded-xl border border-border/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">
                        Essential Cookies
                      </span>
                      <span className="text-[10px] bg-primary/10 text-primary dark:bg-primary/20 px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider">
                        Required
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Necessary for basic website functionality like user login, security, and storing preferences.
                    </p>
                  </div>
                  <div className="pt-0.5">
                    <div className="h-5 w-9 bg-primary/25 dark:bg-primary/30 flex items-center justify-end rounded-full p-0.5 opacity-60">
                      <div className="h-4 w-4 bg-primary text-white rounded-full flex items-center justify-center">
                        <Check className="h-2.5 w-2.5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-start justify-between gap-4 p-3 hover:bg-muted/30 rounded-xl border border-transparent hover:border-border/30 transition-all">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-foreground">
                      Analytics Cookies
                    </span>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Allows us to gather statistics about page visits, reading duration, and navigation behaviors to improve Wistaar.
                    </p>
                  </div>
                  <div className="pt-0.5">
                    <Switch
                      checked={analytics}
                      onCheckedChange={setAnalytics}
                      aria-label="Toggle analytics cookies"
                    />
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-start justify-between gap-4 p-3 hover:bg-muted/30 rounded-xl border border-transparent hover:border-border/30 transition-all">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-foreground">
                      Marketing Cookies
                    </span>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Helps us recommend book suggestions, run newsletters, and track promotional campaigns.
                    </p>
                  </div>
                  <div className="pt-0.5">
                    <Switch
                      checked={marketing}
                      onCheckedChange={setMarketing}
                      aria-label="Toggle marketing cookies"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/60 pt-3 mt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3 shrink-0" />
                  Your choice is respected
                </span>
                <Button
                  size="sm"
                  onClick={handleSaveCustom}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium shadow-sm transition-all"
                >
                  Save Choices
                </Button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
