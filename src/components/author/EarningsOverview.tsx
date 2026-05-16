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
      title: 'Total Earnings',
      value: `₹${stats.totalEarnings.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Total Sales',
      value: stats.totalSales.toString(),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Books Published',
      value: stats.topBook ? '1+' : '0',
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Top Performer',
      value: stats.topBook?.title?.slice(0, 15) || 'N/A',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10',
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
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-2xl font-semibold text-foreground truncate">{stat.value}</p>
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
