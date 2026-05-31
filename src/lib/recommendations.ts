// ─── Recommendations / user behavior engine ───────────────────────────────────
// Tracks what books/authors users interact with.
// Stores in user_behavior table. Used to power "Recommended for you".
// Respects personalization consent.

import { supabase } from '@/integrations/supabase/client';
import { hasConsent, getDeviceId } from './cookies';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BehaviorAction =
  | 'view'        // opened a book detail page
  | 'purchase'    // completed a purchase
  | 'complete'    // finished reading a book (>90%)
  | 'follow'      // followed an author
  | 'wishlist'    // added to wishlist
  | 'search'      // searched for something
  | 'genre_click' // clicked a genre filter

export type EntityType = 'book' | 'author' | 'genre' | 'query';

export interface BehaviorRecord {
  user_id:     string | null;
  device_id:   string;
  action:      BehaviorAction;
  entity_type: EntityType;
  entity_id:   string;
  metadata:    Record<string, unknown>;
  created_at:  string;
}

// ─── Track a behavior event ───────────────────────────────────────────────────

/**
 * Record a user behavior event for personalization.
 * No-op if personalization consent has not been granted.
 */
export async function trackBehavior(
  action: BehaviorAction,
  entityType: EntityType,
  entityId: string,
  userId?: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (!hasConsent('personalization')) return;

  const record: BehaviorRecord = {
    user_id:     userId ?? null,
    device_id:   getDeviceId(),
    action,
    entity_type: entityType,
    entity_id:   entityId,
    metadata,
    created_at:  new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from('user_behavior').insert(record);
    if (error) console.warn('[recommendations] trackBehavior failed:', error.message);
  } catch (err) {
    console.warn('[recommendations] trackBehavior error:', err);
  }
}

// ─── Fetch recommendations ────────────────────────────────────────────────────

export interface RecommendedBook {
  book_id: string;
  score:   number;
}

/**
 * Fetch book recommendations for a user.
 * Returns the most interacted-with book IDs (simple frequency-based approach).
 * Upgrade path: replace with a proper ML scoring function in Supabase.
 */
export async function getRecommendations(
  userId: string,
  limit = 10,
): Promise<RecommendedBook[]> {
  if (!hasConsent('personalization')) return [];

  try {
    // Aggregate: count how many times each book entity was interacted with
    const { data, error } = await supabase
      .from('user_behavior')
      .select('entity_id')
      .eq('user_id', userId)
      .eq('entity_type', 'book')
      .in('action', ['view', 'wishlist', 'purchase', 'complete'])
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !data) return [];

    // Score by frequency
    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.entity_id] = (counts[row.entity_id] ?? 0) + 1;
    }

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([book_id, score]) => ({ book_id, score }));
  } catch {
    return [];
  }
}

/**
 * Fetch genre affinities — which genres the user interacts with most.
 */
export async function getGenreAffinities(userId: string): Promise<string[]> {
  if (!hasConsent('personalization')) return [];

  try {
    const { data, error } = await supabase
      .from('user_behavior')
      .select('entity_id')
      .eq('user_id', userId)
      .eq('entity_type', 'genre')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) return [];

    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.entity_id] = (counts[row.entity_id] ?? 0) + 1;
    }

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([genre]) => genre);
  } catch {
    return [];
  }
}
