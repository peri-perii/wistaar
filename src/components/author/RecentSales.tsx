import { useEffect, useState } from 'react';
import { Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RecentSale {
  id: string;
  bookTitle: string;
  amount: number;
  purchasedAt: string;
  bookId: string;
}

export default function RecentSales() {
  const { user } = useAuth();
  const [sales, setSales] = useState<RecentSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchRecentSales = async () => {
      try {
        setIsLoading(true);
        
        // Get author's approved books
        const { data: books } = await supabase
          .from('book_submissions')
          .select('id, title')
          .eq('author_id', user.id)
          .eq('status', 'approved');

        if (!books || books.length === 0) {
          setSales([]);
          setIsLoading(false);
          return;
        }

        const bookIds = books.map(b => b.id);

        // Get recent purchases for these books
        const { data: purchases } = await supabase
          .from('book_purchases')
          .select('id, book_id, amount, purchased_at')
          .in('book_id', bookIds)
          .eq('payment_status', 'completed')
          .order('purchased_at', { ascending: false })
          .limit(10);

        if (purchases) {
          const recentSales = purchases.map(p => {
            const book = books.find(b => b.id === p.book_id);
            return {
              id: p.id,
              bookTitle: book?.title || 'Unknown Book',
              amount: p.amount,
              purchasedAt: p.purchased_at,
              bookId: p.book_id,
            };
          });
          setSales(recentSales);
        }
      } catch (error) {
        console.error('Failed to fetch recent sales:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentSales();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('recent_sales')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'book_purchases',
        },
        () => {
          fetchRecentSales();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Recent Sales
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No sales yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sales.map(sale => (
              <div
                key={sale.id}
                className="flex items-center justify-between p-3 bg-accent/5 rounded-lg hover:bg-accent/10 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{sale.bookTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(sale.purchasedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  +₹{sale.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
