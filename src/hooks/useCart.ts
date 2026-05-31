// ─── Cart hook ────────────────────────────────────────────────────────────────
// Works for guests (localStorage only) and authenticated users (localStorage + Supabase).
// On login: guest cart is merged into the DB cart automatically.
// Exports both a unified useCart() and legacy mutation hooks (useAddToCart, useRemoveFromCart)
// so existing pages (Cart.tsx, Navigation.tsx, BookDetail.tsx) don't need to change.

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id:       string;   // row id (guest: book_id, db: uuid)
  book_id:  string;
  added_at: string;
}

const LS_KEY = 'wistaar-cart';

// ─── localStorage helpers ─────────────────────────────────────────────────────

function readLocalCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<CartItem>[];
    return parsed
      .filter((i): i is CartItem => !!i.book_id)
      .map((i) => ({ id: i.id ?? i.book_id!, book_id: i.book_id!, added_at: i.added_at ?? new Date().toISOString() }));
  } catch { return []; }
}

function writeLocalCart(items: CartItem[]): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

function clearLocalCart(): void { localStorage.removeItem(LS_KEY); }

// ─── Primary hook — React Query shape ─────────────────────────────────────────
// Returns { data, isLoading } to match existing usage in Navigation.tsx, Cart.tsx

export function useCart() {
  const { user } = useAuth();

  return useQuery<CartItem[]>({
    queryKey: ['cart', user?.id ?? 'guest'],
    queryFn: async (): Promise<CartItem[]> => {
      if (!user) {
        // Guest: localStorage only
        return readLocalCart();
      }
      // Authenticated: Supabase DB
      const { data, error } = await supabase
        .from('cart_items')
        .select('id, book_id, added_at')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) throw error;
      const dbItems = (data ?? []) as CartItem[];
      // Keep localStorage in sync for instant offline reads
      writeLocalCart(dbItems);
      return dbItems;
    },
    staleTime: 30_000,
  });
}

// ─── Add to cart ──────────────────────────────────────────────────────────────

export function useAddToCart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      if (!user) {
        // Guest: write to localStorage
        const current = readLocalCart();
        if (current.some((i) => i.book_id === bookId)) return;
        const next: CartItem[] = [
          { id: bookId, book_id: bookId, added_at: new Date().toISOString() },
          ...current,
        ];
        writeLocalCart(next);
        return;
      }
      // Authenticated: upsert to DB
      const { error } = await supabase
        .from('cart_items')
        .upsert({ user_id: user.id, book_id: bookId }, { onConflict: 'user_id,book_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Added to cart');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Remove from cart ─────────────────────────────────────────────────────────

export function useRemoveFromCart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      if (!user) {
        // Guest: update localStorage
        writeLocalCart(readLocalCart().filter((i) => i.book_id !== bookId));
        return;
      }
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('book_id', bookId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Removed from cart');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Clear cart ───────────────────────────────────────────────────────────────

export function useClearCart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      clearLocalCart();
      if (!user) return;
      await supabase.from('cart_items').delete().eq('user_id', user.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}

// ─── Merge guest cart into DB on login ────────────────────────────────────────

export async function mergeGuestCart(userId: string): Promise<void> {
  const guestItems = readLocalCart();
  if (guestItems.length === 0) return;

  const rows = guestItems.map((item) => ({
    user_id:  userId,
    book_id:  item.book_id,
    added_at: item.added_at,
  }));

  const { error } = await supabase
    .from('cart_items')
    .upsert(rows, { onConflict: 'user_id,book_id' });

  if (!error) clearLocalCart();
}

// ─── Convenience hook for total count (used by Navigation) ────────────────────

export function useCartCount(): number {
  const { data } = useCart();
  return data?.length ?? 0;
}
