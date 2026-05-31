import Skeleton from '@/components/ui/Skeleton';
import Navigation from '@/components/Navigation';
import BookCardSkeleton from './BookCardSkeleton';

const LibrarySkeleton = () => (
  <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
    <Navigation />

    <main style={{ paddingTop: 96, paddingBottom: 64 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Skeleton width={180} height={36} style={{ marginBottom: 10 }} />
          <Skeleton width={280} height={16} />
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width={120} height={72} borderRadius="10px" />
          ))}
        </div>

        {/* Search + filter row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          <Skeleton width="100%" height={44} borderRadius="8px" />
          <Skeleton width={160} height={44} borderRadius="8px" style={{ flexShrink: 0 }} />
        </div>

        {/* Books grid – same layout as Library (3 col) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 24,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  </div>
);

export default LibrarySkeleton;
