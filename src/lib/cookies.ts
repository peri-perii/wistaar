// ─── Cookie utility layer ─────────────────────────────────────────────────────
// Consent is stored as JSON in the 'wistaar-consent' cookie:
// { "essential": true, "functional": true, "analytics": false, "personalization": false }

export type ConsentCategory = 'essential' | 'functional' | 'analytics' | 'personalization';

export interface ConsentMap {
  essential: true;
  functional: boolean;
  analytics: boolean;
  personalization: boolean;
}

const CONSENT_COOKIE = 'wistaar-consent';

// ─── Core primitives ──────────────────────────────────────────────────────────

export function setCookie(name: string, value: string, days: number): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `expires=${expires.toUTCString()}`,
    'path=/',
    'SameSite=Lax',
  ].join(';');
}

export function getCookie(name: string): string | null {
  const key = `${encodeURIComponent(name)}=`;
  for (const part of document.cookie.split(';')) {
    const c = part.trimStart();
    if (c.startsWith(key)) return decodeURIComponent(c.slice(key.length));
  }
  return null;
}

export function deleteCookie(name: string): void {
  document.cookie = `${encodeURIComponent(name)}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}

// ─── Consent helpers ──────────────────────────────────────────────────────────

/** Read the full consent map from the wistaar-consent cookie. */
export function getConsentMap(): ConsentMap | null {
  const raw = getCookie(CONSENT_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentMap>;
    if (typeof parsed.essential !== 'boolean') return null;
    return {
      essential:       true,
      functional:      parsed.functional      ?? false,
      analytics:       parsed.analytics       ?? false,
      personalization: parsed.personalization ?? false,
    };
  } catch {
    return null;
  }
}

/** Write the consent map to the wistaar-consent cookie (1 year). */
export function setConsentMap(map: Omit<ConsentMap, 'essential'>): void {
  const full: ConsentMap = { essential: true, ...map };
  setCookie(CONSENT_COOKIE, JSON.stringify(full), 365);
}

/** Check if the user has given consent for a specific category. */
export function hasConsent(category: ConsentCategory): boolean {
  if (category === 'essential') return true; // always active
  const map = getConsentMap();
  if (!map) return false;
  return map[category] === true;
}

/** True if the user has made any consent choice at all. */
export function hasAnyConsent(): boolean {
  return getCookie(CONSENT_COOKIE) !== null;
}

// ─── Device ID ────────────────────────────────────────────────────────────────
// Anonymous fingerprint for fraud prevention — always set, no consent required.

function generateDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getDeviceId(): string {
  const existing = getCookie('wistaar-device-id');
  if (existing) return existing;
  const id = generateDeviceId();
  setCookie('wistaar-device-id', id, 365);
  return id;
}
