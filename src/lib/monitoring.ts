import * as Sentry from "@sentry/react";

/**
 * Initializes Sentry for error tracking and performance monitoring.
 * In a real production environment, SENTRY_DSN should be provided in .env.
 */
export const initMonitoring = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn("Sentry DSN not found. Monitoring is disabled in this session.");
    return;
  }

  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, 
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
  });
};

/**
 * Custom hook to track component performance
 */
export const useTrackLatency = (componentName: string) => {
  // Logic to track mount/unmount times or specific interactions
  // This can be expanded to send data to a custom analytics endpoint
};
