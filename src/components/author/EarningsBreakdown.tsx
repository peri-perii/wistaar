import { BarChart3, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookEarnings } from '@/hooks/useAuthorEarnings';

interface EarningsBreakdownProps {
  bookEarnings: BookEarnings[];
  isLoading: boolean;
}

export default function EarningsBreakdown({ bookEarnings, isLoading }: EarningsBreakdownProps) {
  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Earnings by Book
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (bookEarnings.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Earnings by Book
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingDown className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-2">No approved books yet</p>
            <p className="text-sm text-muted-foreground">Submit and get your books approved to start earning</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Earnings by Book
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Book Title</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Avg Sale Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookEarnings.map((book) => (
              <TableRow key={book.id} className="hover:bg-accent/5">
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground truncate max-w-xs">{book.title}</p>
                    <p className="text-xs text-muted-foreground">{book.genre}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium">₹{book.price.toFixed(2)}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-medium ${book.salesCount > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {book.salesCount}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-semibold text-green-600">
                    ₹{book.totalRevenue.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-muted-foreground">
                    {book.salesCount > 0 
                      ? `₹${(book.totalRevenue / book.salesCount).toFixed(2)}`
                      : '—'
                    }
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Summary Row */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total</p>
              <p className="text-lg font-semibold text-foreground">
                {bookEarnings.length} book{bookEarnings.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Combined Revenue</p>
              <p className="text-lg font-semibold text-green-600">
                ₹{bookEarnings.reduce((sum, b) => sum + b.totalRevenue, 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
