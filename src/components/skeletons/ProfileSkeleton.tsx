import Skeleton from '@/components/ui/Skeleton';
import Navigation from '@/components/Navigation';

const ProfileSkeleton = () => (
  <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
    <Navigation />

    <main style={{ paddingTop: 96, paddingBottom: 64 }}>
      <div style={{ maxWidth: 672, margin: '0 auto', padding: '0 24px' }}>

        {/* Page title */}
        <div style={{ marginBottom: 32 }}>
          <Skeleton width={200} height={32} style={{ marginBottom: 8 }} />
          <Skeleton width={280} height={14} />
        </div>

        {/* User hero card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: 20,
            borderRadius: 12,
            background: '#111111',
            marginBottom: 24,
          }}
        >
          <Skeleton width={64} height={64} borderRadius="50%" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width={140} height={18} />
            <Skeleton width={180} height={13} />
          </div>
        </div>

        {/* Wisties balance card */}
        <Skeleton width="100%" height={88} borderRadius="12px" style={{ marginBottom: 24 }} />

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <Skeleton width="50%" height={40} borderRadius="6px" />
          <Skeleton width="50%" height={40} borderRadius="6px" />
        </div>

        {/* Form card */}
        <Skeleton width="100%" height={220} borderRadius="12px" style={{ marginBottom: 16 }} />

        {/* Security card */}
        <Skeleton width="100%" height={120} borderRadius="12px" />
      </div>
    </main>
  </div>
);

export default ProfileSkeleton;
