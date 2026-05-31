// ─── Analytics engine ─────────────────────────────────────────────────────────
// Batches events in memory, flushes to Supabase every 30 seconds.
// Fully respects consent — never tracks before analytics consent is given.
// Anonymous when not logged in; links to user_id when logged in.

import { supabase } from '@/integrations/supabase/client';
import { hasConsent, getDeviceId } from './cookies';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalyticsEvent {
  event_name: string;
  properties: Record<string, unknown>;
  user_id?: string;
  device_id: string;
  created_at: string;
}

// ─── In-memory queue ──────────────────────────────────────────────────────────

let queue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let currentUserId: string | undefined;

/** Call once on app init / auth change to attach user identity to future events. */
export function setAnalyticsUser(userId: string | undefined): void {
  currentUserId = userId;
}

// ─── Core tracking ────────────────────────────────────────────────────────────

/** Track a named event with arbitrary properties. No-op if analytics consent missing. */
export function trackEvent(
  eventName: string,
  properties: Record<string, unknown> = {},
): void {
  if (!hasConsent('analytics')) return;

  queue.push({
    event_name:  eventName,
    properties,
    user_id:     currentUserId,
    device_id:   getDeviceId(),
    created_at:  new Date().toISOString(),
  });
}

/** Track a page view. */
export function trackPageView(page: string): void {
  trackEvent('page_view', { page, referrer: document.referrer });
}

/** Track a book detail page view. */
export function trackBookView(bookId: string, meta: Record<string, unknown> = {}): void {
  trackEvent('book_view', { book_id: bookId, ...meta });
}

/** Track a search query. */
export function trackSearch(query: string, resultCount: number): void {
  trackEvent('search', { query, result_count: resultCount });
}

/** Track a genre/category filter click. */
export function trackGenreClick(genre: string): void {
  trackEvent('genre_click', { genre });
}

// ─── Flush ────────────────────────────────────────────────────────────────────

/** Send all queued events to Supabase in one batch insert. */
export async function flushEvents(): Promise<void> {
  if (queue.length === 0) return;
  if (!hasConsent('analytics')) {
    queue = [];
    return;
  }

  const batch = [...queue];
  queue = []; // clear immediately so new events aren't lost if insert fails

  try {
    const { error } = await supabase.from('analytics_events').insert(batch);
    if (error) {
      // Put events back so they're retried next flush
      queue = [...batch, ...queue];
      console.warn('[analytics] flush failed:', error.message);
    }
  } catch (err) {
    queue = [...batch, ...queue];
    console.warn('[analytics] flush error:', err);
  }
}

// ─── Auto-flush every 30 seconds ─────────────────────────────────────────────

/** Start the 30-second batch flush timer. Safe to call multiple times. */
export function startAnalytics(): void {
  if (flushTimer !== null) return;
  flushTimer = setInterval(flushEvents, 30_000);
  // Also flush on page hide (tab close, navigation)
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushEvents();
  });
}

/** Stop the timer (call on app teardown). */
export function stopAnalytics(): void {
  if (flushTimer !== null) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}
