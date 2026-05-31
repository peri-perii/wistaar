import Skeleton from '@/components/ui/Skeleton';
import Navigation from '@/components/Navigation';
import BookCardSkeleton from './BookCardSkeleton';

const AuthorPageSkeleton = () => (
  <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
    <Navigation />

    <main style={{ paddingTop: 96, paddingBottom: 80, padding: '96px 24px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Profile header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 24,
            marginBottom: 40,
            paddingBottom: 32,
            borderBottom: '1px solid #1e1e1e',
            flexWrap: 'wrap',
          }}
        >
          {/* Avatar */}
          <Skeleton width={80} height={80} borderRadius="50%" />

          {/* Text block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            <Skeleton width={200} height={28} />
            <Skeleton width={120} height={14} />
            <Skeleton width={320} height={14} />
            <Skeleton width={260} height={14} />

            {/* Follower/book count pills */}
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <Skeleton width={80} height={14} />
              <Skeleton width={100} height={14} />
            </div>
          </div>

          {/* Follow button */}
          <Skeleton width={128} height={40} borderRadius="8px" style={{ flexShrink: 0 }} />
        </div>

        {/* Stats boxes row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 40, flexWrap: 'wrap' }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width={90} height={64} borderRadius="10px" />
          ))}
        </div>

        {/* Section heading */}
        <Skeleton width={180} height={24} style={{ marginBottom: 24 }} />

        {/* Books grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 24,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  </div>
);

export default AuthorPageSkeleton;
