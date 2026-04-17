'use client';

import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}]`, error);
  }

  reset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div className="bg-canvas/40 border border-divider/50 rounded-[12px] p-[24px] flex flex-col items-center text-center my-[16px]">
          <p className="font-sans font-semibold text-[14px] text-ink">
            Something went wrong loading this section.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-[12px] font-sans text-[13px] text-accent underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
