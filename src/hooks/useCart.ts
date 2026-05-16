import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  book_id: string;
  added_at: string;
}

export function useCart() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["cart", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CartItem[]> => {
      const { data, error } = await supabase
        .from("cart_items")
        .select("id, book_id, added_at")
        .eq("user_id", user!.id)
        .order("added_at", { ascending: false });

      if (error) throw error;
      return (data || []) as CartItem[];
    },
  });
}

export function useAddToCart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      if (!user) throw new Error("Please log in");

      const { error } = await supabase.from("cart_items").upsert(
        { user_id: user.id, book_id: bookId },
        { onConflict: "user_id,book_id" }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart!");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
}

export function useRemoveFromCart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      if (!user) throw new Error("Please log in");

      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id)
        .eq("book_id", bookId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Removed from cart");
    },
  });
}
