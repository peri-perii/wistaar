import Skeleton from '@/components/ui/Skeleton';
import Navigation from '@/components/Navigation';

const BookDetailSkeleton = () => (
  <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
    <Navigation />

    <main style={{ paddingTop: 96, paddingBottom: 64 }}>
      {/* Back link */}
      <div style={{ maxWidth: 960, margin: '0 auto 32px', padding: '0 24px' }}>
        <Skeleton width={120} height={14} />
      </div>

      {/* Hero grid */}
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)',
          gap: 48,
          alignItems: 'start',
        }}
      >
        {/* Cover */}
        <Skeleton
          width="100%"
          height={320}
          borderRadius="12px"
          style={{ maxWidth: 220 }}
        />

        {/* Right: info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Badge row */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Skeleton width={60} height={22} borderRadius="999px" />
            <Skeleton width={80} height={22} borderRadius="999px" />
          </div>

          {/* Title */}
          <Skeleton width={280} height={32} />
          <Skeleton width={160} height={18} />

          {/* Metadata bar */}
          <div style={{ display: 'flex', gap: 24, paddingTop: 8, paddingBottom: 8 }}>
            <Skeleton width={60} height={14} />
            <Skeleton width={90} height={14} />
            <Skeleton width={80} height={14} />
          </div>

          {/* Description lines */}
          <Skeleton width="100%" height={14} />
          <Skeleton width="90%" height={14} />
          <Skeleton width="75%" height={14} />

          {/* CTA button */}
          <Skeleton width={160} height={44} borderRadius="8px" />
        </div>
      </div>
    </main>
  </div>
);

export default BookDetailSkeleton;
