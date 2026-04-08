import { useEffect } from "react";

/**
 * Hook to track page load time and interactions.
 * Reports to console in dev and can be integrated with GA/Sentry in prod.
 */
export const usePageTracking = (pageName: string) => {
  useEffect(() => {
    const startTime = performance.now();
    console.log(`[Performance] Navigation to ${pageName} started.`);

    return () => {
      const duration = performance.now() - startTime;
      console.log(`[Performance] User spent ${Math.round(duration)}ms on ${pageName}.`);
      
      // Potential GA4 or PostHog event track
      // analytics.track('page_view_duration', { page: pageName, duration });
    };
  }, [pageName]);
};

/**
 * Hook to monitor core web vitals
 */
export const useWebVitals = () => {
  useEffect(() => {
    // This could integrate with 'web-vitals' library later
    if ('performance' in window && 'getEntriesByType' in performance) {
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach((entry) => {
        console.log(`[Performance] ${entry.name}: ${Math.round(entry.startTime)}ms`);
      });
    }
  }, []);
};
