import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Purchase {
  id: string;
  book_id: string;
  amount: number;
  payment_status: string;
  purchased_at: string;
}

export function usePurchases() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["purchases", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Purchase[]> => {
      const { data, error } = await supabase
        .from("book_purchases")
        .select("id, book_id, amount, payment_status, purchased_at")
        .eq("user_id", user!.id)
        .eq("payment_status", "completed");

      if (error) throw error;
      return (data || []) as Purchase[];
    },
  });
}

export function useHasPurchased(bookId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["has-purchased", user?.id, bookId],
    enabled: !!user && !!bookId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_purchases")
        .select("id")
        .eq("user_id", user!.id)
        .eq("book_id", bookId!)
        .eq("payment_status", "completed")
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
  });
}

export function useInitiatePayment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      bookTitle,
      amount,
    }: {
      bookId: string;
      bookTitle: string;
      amount: number;
    }) => {
      if (!user) throw new Error("Please log in to purchase");

      // Mock payment: directly insert a completed purchase
      const { error } = await supabase
        .from("book_purchases")
        .upsert(
          {
            user_id: user.id,
            book_id: bookId,
            amount,
            payment_status: "completed",
            transaction_id: `MOCK_${Date.now()}`,
            payu_txnid: `MOCK_${Date.now()}`,
          },
          { onConflict: "user_id,book_id" }
        );

      if (error) throw error;

      // In-app notification for successful purchase
      await supabase.from("book_purchases")
        .select("id")
        .eq("user_id", user.id)
        .eq("book_id", bookId)
        .maybeSingle(); // just to confirm it exists

      await supabase.from("notifications" as any).insert({
        user_id: user.id,
        title: `📖 "${bookTitle}" is now in your library!`,
        message: `You've successfully purchased "${bookTitle}". Happy reading!`,
        type: "book_purchased",
      } as any);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["has-purchased"] });
    },
  });
}
