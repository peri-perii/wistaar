import { useState, useEffect, useCallback } from "react";

export type CookieCategory = "essential" | "analytics" | "marketing";

export interface CookiePreferences {
  essential: true; // Always true — can't be disabled
  analytics: boolean;
  marketing: boolean;
  consentedAt: string | null;
}

const STORAGE_KEY = "wistaar-cookie-consent";

const DEFAULT_PREFS: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  consentedAt: null,
};

function loadPrefs(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookiePreferences;
    // Basic shape validation
    if (typeof parsed.essential !== "boolean" || !parsed.consentedAt) return null;
    return { ...parsed, essential: true }; // Always enforce essential = true
  } catch {
    return null;
  }
}

function savePrefs(prefs: CookiePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function useCookieConsent() {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(
    () => loadPrefs()
  );
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Delay to avoid flash on page load
    const timer = setTimeout(() => {
      if (!preferences?.consentedAt) {
        setShowBanner(true);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [preferences]);

  const hasConsented = !!preferences?.consentedAt;

  const acceptAll = useCallback(() => {
    const prefs: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      consentedAt: new Date().toISOString(),
    };
    savePrefs(prefs);
    setPreferences(prefs);
    setShowBanner(false);
  }, []);

  const rejectNonEssential = useCallback(() => {
    const prefs: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false,
      consentedAt: new Date().toISOString(),
    };
    savePrefs(prefs);
    setPreferences(prefs);
    setShowBanner(false);
  }, []);

  const saveCustom = useCallback(
    (custom: Pick<CookiePreferences, "analytics" | "marketing">) => {
      const prefs: CookiePreferences = {
        essential: true,
        analytics: custom.analytics,
        marketing: custom.marketing,
        consentedAt: new Date().toISOString(),
      };
      savePrefs(prefs);
      setPreferences(prefs);
      setShowBanner(false);
    },
    []
  );

  const resetConsent = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPreferences(null);
    setShowBanner(true);
  }, []);

  return {
    preferences: preferences ?? DEFAULT_PREFS,
    hasConsented,
    showBanner,
    acceptAll,
    rejectNonEssential,
    saveCustom,
    resetConsent,
  };
}
