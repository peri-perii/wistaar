import { Skeleton } from "@/components/ui/skeleton";

export const HeroSkeleton = () => (
  <section className="pt-32 pb-24 lg:pt-44 lg:pb-36">
    <div className="container-editorial">
      <div className="max-w-4xl mx-auto text-center">
        {/* Tagline */}
        <div className="flex justify-center mb-8">
          <Skeleton className="h-10 w-48 rounded-full" />
        </div>
        
        {/* Headline */}
        <Skeleton className="h-16 lg:h-24 w-full max-w-3xl mx-auto mb-4" />
        <Skeleton className="h-16 lg:h-24 w-3/4 mx-auto mb-8" />
        
        {/* Subheadline */}
        <Skeleton className="h-6 w-full max-w-2xl mx-auto mb-2" />
        <Skeleton className="h-6 w-2/3 mx-auto mb-12" />
        
        {/* CTAs */}
        <div className="flex justify-center gap-4">
          <Skeleton className="h-14 w-40 rounded-lg" />
          <Skeleton className="h-14 w-40 rounded-lg" />
        </div>
      </div>
    </div>
  </section>
);

export const BookCardSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="aspect-[2/3] w-full rounded-sm" />
    <Skeleton className="h-5 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

export const BookGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
    {Array.from({ length: count }).map((_, i) => (
      <BookCardSkeleton key={i} />
    ))}
  </div>
);

export const PremiumCardSkeleton = () => (
  <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
    <Skeleton className="aspect-[3/2] w-full" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="pt-4 border-t border-border/50">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  </div>
);

export const SectionSkeleton = () => (
  <section className="section-spacing">
    <div className="container-editorial">
      {/* Header */}
      <div className="mb-14">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      
      {/* Grid */}
      <BookGridSkeleton />
    </div>
  </section>
);

export const NavigationSkeleton = () => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
    <div className="container-editorial">
      <div className="flex items-center justify-between h-16 lg:h-18">
        <Skeleton className="h-8 w-32" />
        <div className="hidden md:flex items-center gap-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  </header>
);

export const FeaturesSkeleton = () => (
  <section className="section-spacing bg-foreground">
    <div className="container-editorial">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <Skeleton className="h-10 w-48 mx-auto mb-6 bg-background/10" />
        <Skeleton className="h-10 w-96 max-w-full mx-auto mb-4 bg-background/10" />
        <Skeleton className="h-5 w-80 max-w-full mx-auto bg-background/10" />
      </div>
      
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 rounded-xl bg-background/5 text-center">
            <Skeleton className="w-14 h-14 rounded-xl mx-auto mb-5 bg-background/10" />
            <Skeleton className="h-5 w-24 mx-auto mb-2 bg-background/10" />
            <Skeleton className="h-4 w-32 mx-auto bg-background/10" />
          </div>
        ))}
      </div>
    </div>
  </section>
);

const PageSkeleton = () => (
  <div className="min-h-screen bg-background">
    <NavigationSkeleton />
    <main>
      <HeroSkeleton />
      <SectionSkeleton />
      <SectionSkeleton />
      <FeaturesSkeleton />
    </main>
  </div>
);

export default PageSkeleton;
