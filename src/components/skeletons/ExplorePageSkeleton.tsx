import Skeleton from '@/components/ui/Skeleton';
import BookCardSkeleton from './BookCardSkeleton';

const ExplorePageSkeleton = () => (
  <div
    style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      padding: '80px 24px 40px',
    }}
  >
    {/* Header bar skeleton */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
      <Skeleton width={24} height={24} borderRadius="4px" />
      <Skeleton width={100} height={24} />
    </div>

    {/* Search bar */}
    <Skeleton width="100%" height={44} borderRadius="8px" style={{ marginBottom: 20 }} />

    {/* Filter pill row */}
    <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
      {[100, 90, 110, 80].map((w, i) => (
        <Skeleton key={i} width={w} height={32} borderRadius="999px" />
      ))}
    </div>

    {/* Result count line */}
    <Skeleton width={120} height={13} style={{ marginBottom: 28 }} />

    {/* Books grid — 2 cols mobile → 4 cols desktop */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 24,
      }}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export default ExplorePageSkeleton;
