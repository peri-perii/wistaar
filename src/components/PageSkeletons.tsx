import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const skeletonTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2, ease: "easeOut" as const }
};

export const ExploreSkeleton = () => (
  <motion.div {...skeletonTransition} className="min-h-screen bg-background">
    {/* Header */}
    <header className="border-b border-border bg-background sticky top-0 z-40">
      <div className="container-editorial py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
    </header>

    <main className="container-editorial py-8 lg:py-12">
      {/* Search */}
      <div className="space-y-6 mb-10">
        <Skeleton className="h-12 w-full rounded-lg" />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-40 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Results count */}
      <Skeleton className="h-4 w-32 mb-8" />

      {/* Books Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 lg:gap-8">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[2/3] w-full rounded-md" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </main>
  </motion.div>
);

export const LibrarySkeleton = () => (
  <motion.div {...skeletonTransition} className="min-h-screen bg-background">
    {/* Navigation */}
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
      <div className="container-editorial">
        <div className="flex items-center justify-between h-16 lg:h-18">
          <Skeleton className="h-7 w-28" />
          <div className="hidden md:flex items-center gap-6">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    </header>

    <main className="pt-24 pb-16">
      <div className="container-editorial">
        {/* Header */}
        <div className="mb-12">
          <Skeleton className="h-12 w-48 mb-4" />
          <Skeleton className="h-5 w-72" />
        </div>

        {/* Section title */}
        <Skeleton className="h-6 w-40 mb-6" />

        {/* Books Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-lg border border-border overflow-hidden">
              <Skeleton className="aspect-[16/9]" />
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-28 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1 rounded-lg" />
                  <Skeleton className="h-9 w-20 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  </motion.div>
);

export const BookDetailSkeleton = () => (
  <motion.div {...skeletonTransition} className="min-h-screen bg-background">
    {/* Header */}
    <header className="border-b border-border bg-background sticky top-0 z-40">
      <div className="container-editorial py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
    </header>

    <main className="container-editorial py-8 lg:py-16">
      <div className="grid lg:grid-cols-3 gap-12">
        {/* Book cover */}
        <Skeleton className="aspect-[2/3] w-full max-w-sm mx-auto rounded-lg" />
        
        {/* Book info */}
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-3">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="space-y-3 py-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-12 w-36 rounded-lg" />
            <Skeleton className="h-12 w-36 rounded-lg" />
          </div>
        </div>
      </div>
    </main>
  </motion.div>
);

// Generic Loading Spinner with fade-in
export const LoadingSpinner = () => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
    className="min-h-screen flex items-center justify-center bg-background"
  >
    <div className="relative">
      <div className="w-6 h-6 border-2 border-muted rounded-full" />
      <div className="absolute inset-0 w-6 h-6 border-2 border-transparent border-t-foreground/70 rounded-full animate-spin" />
    </div>
  </motion.div>
);
