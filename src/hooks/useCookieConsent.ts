// ─── Cookie consent hook ──────────────────────────────────────────────────────
// Single source of truth for all consent state across the app.
// Consent is persisted as JSON in the 'wistaar-consent' cookie (1 year).
// Format: { "essential": true, "functional": true, "analytics": false, "personalization": false }

import { useState, useEffect, useCallback } from 'react';
import {
  ConsentMap,
  getConsentMap,
  setConsentMap,
  hasAnyConsent,
} from '@/lib/cookies';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { ConsentMap };

export type CustomCategories = Omit<ConsentMap, 'essential'>;

const DEFAULT_CONSENT: ConsentMap = {
  essential:       true,
  functional:      false,
  analytics:       false,
  personalization: false,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCookieConsent() {
  // Load from cookie on mount
  const [consent, setConsent] = useState<ConsentMap>(() => getConsentMap() ?? DEFAULT_CONSENT);
  const [showBanner, setShowBanner] = useState(false);

  // Show banner after a small delay if no consent yet (avoids flash on load)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasAnyConsent()) setShowBanner(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // ── Derived booleans for easy consumption ─────────────────────────────────
  const hasFunctional      = consent.functional;
  const hasAnalytics       = consent.analytics;
  const hasPersonalization = consent.personalization;
  const hasConsented       = hasAnyConsent();

  // ── Actions ───────────────────────────────────────────────────────────────

  const acceptAll = useCallback(() => {
    const map: ConsentMap = {
      essential:       true,
      functional:      true,
      analytics:       true,
      personalization: true,
    };
    setConsentMap({ functional: true, analytics: true, personalization: true });
    setConsent(map);
    setShowBanner(false);
  }, []);

  const acceptEssential = useCallback(() => {
    const map: ConsentMap = {
      essential:       true,
      functional:      false,
      analytics:       false,
      personalization: false,
    };
    setConsentMap({ functional: false, analytics: false, personalization: false });
    setConsent(map);
    setShowBanner(false);
  }, []);

  const saveCustom = useCallback((categories: CustomCategories) => {
    const map: ConsentMap = { essential: true, ...categories };
    setConsentMap(categories);
    setConsent(map);
    setShowBanner(false);
  }, []);

  const resetConsent = useCallback(() => {
    // Clear the cookie
    document.cookie = 'wistaar-consent=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
    setConsent(DEFAULT_CONSENT);
    setShowBanner(true);
  }, []);

  // ── Legacy compatibility (CookieConsent.tsx still calls these) ────────────
  /** @deprecated Use acceptEssential instead */
  const rejectNonEssential = acceptEssential;

  return {
    // Full consent object
    consent,
    // Convenient booleans
    hasConsented,
    hasFunctional,
    hasAnalytics,
    hasPersonalization,
    // Banner visibility
    showBanner,
    // Actions
    acceptAll,
    acceptEssential,
    rejectNonEssential,   // legacy alias
    saveCustom,
    resetConsent,
    // Legacy shape — CookieConsent.tsx still reads preferences.analytics/marketing
    preferences: {
      essential:   true  as const,
      analytics:   consent.analytics,
      marketing:   consent.personalization,  // mapped
      consentedAt: hasAnyConsent() ? 'set' : null,
    },
  };
}
