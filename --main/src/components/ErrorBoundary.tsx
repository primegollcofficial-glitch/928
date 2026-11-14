import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Changing this value resets the boundary, e.g. on page navigation. */
  resetKey?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Keeps one broken screen from taking down the whole site. If a page throws,
 * the visitor sees a friendly recovery panel instead of a blank white page.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: Error) {
    // Keep the details in the console for debugging without exposing them to visitors.
    console.error('Page failed to render:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 py-24">
        <div className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-[#dc2626]">
            sentiment_dissatisfied
          </span>
          <h1 className="mt-4 font-['Space_Grotesk'] text-2xl font-bold text-[#18181b]">
            This page hit a snag
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#52525b] font-['Plus_Jakarta_Sans']">
            The rest of the site is still available. Try reloading the page, or
            head back to the home screen.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#dc2626] hover:bg-[#b91c1c] px-6 py-3 text-xs font-['Space_Grotesk'] uppercase tracking-widest font-bold text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">refresh</span>
              Reload page
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white hover:bg-red-50 px-6 py-3 text-xs font-['Space_Grotesk'] uppercase tracking-widest font-bold text-[#dc2626] transition-colors"
            >
              Back to home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
