import React, { Component, ErrorInfo, ReactNode } from "react";
import * as Sentry from "@sentry/react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  name: string;
}

interface State {
  hasError: boolean;
}

/**
 * Global Error Boundary with Sentry integration.
 * Wraps components to catch JavaScript errors and report them.
 */
class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.name}:`, error, errorInfo);
    
    // Log to Sentry
    Sentry.withScope((scope) => {
      scope.setTag("component", this.props.name);
      Sentry.captureException(error);
    });
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center flex flex-col items-center justify-center min-h-[300px] border border-red-100 rounded-lg bg-red-50">
          <h2 className="text-2xl font-serif text-red-900 mb-4">Something went wrong</h2>
          <p className="text-red-700 max-w-md mx-auto mb-6">
            We've been notified and are looking into it. Please try refreshing the page.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
