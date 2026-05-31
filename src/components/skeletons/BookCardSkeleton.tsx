import Skeleton from '@/components/ui/Skeleton';

const BookCardSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {/* Cover */}
    <Skeleton width={140} height={200} borderRadius="8px" />

    {/* Author row */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Skeleton width={24} height={24} borderRadius="50%" />
      <Skeleton width={120} height={12} />
    </div>

    {/* Price line */}
    <Skeleton width={80} height={12} />
  </div>
);

export default BookCardSkeleton;
