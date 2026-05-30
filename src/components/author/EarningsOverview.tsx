import { TrendingUp, BookOpen, ShoppingCart, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EarningsStats } from '@/hooks/useAuthorEarnings';

interface EarningsOverviewProps {
  stats: EarningsStats;
  isLoading: boolean;
}

export default function EarningsOverview({ stats, isLoading }: EarningsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  const stats_data = [
    {
      title: 'Gross Book Sales',
      value: `₹${stats.totalEarnings.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      subtext: '100% of gross purchases',
    },
    {
      title: 'Author Net Royalties',
      value: `₹${(stats.totalEarnings * 0.65).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
      subtext: `₹${stats.totalEarnings.toFixed(2)} × 65% royalty split`,
    },
    {
      title: 'Copies Sold',
      value: stats.totalSales.toString(),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
      subtext: 'All-time copies purchased',
    },
    {
      title: 'Top Performer',
      value: stats.topBook?.title?.slice(0, 15) || 'N/A',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10',
      subtext: stats.topBook ? `Genre: ${stats.topBook.genre}` : 'No sales yet',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats_data.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="hover:border-accent/30 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-2xl font-semibold text-foreground truncate mb-1">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground/80 truncate font-mono">{stat.subtext}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg ml-2 flex-shrink-0`}>
                  <Icon className={`${stat.color} h-5 w-5`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
