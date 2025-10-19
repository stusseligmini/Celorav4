'use client';

import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class SolanaErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    console.error('Solana component error:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback component if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} reset={this.resetError} />;
      }

      // Default error UI
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          <div className="flex items-center gap-3 mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-lg font-semibold text-red-800">Solana Integration Error</h2>
          </div>
          
          <p className="text-red-700 mb-4">
            Something went wrong with the Solana integration. This could be due to network issues, 
            authentication problems, or temporary service unavailability.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={this.resetError}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Reload Page
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4">
              <summary className="cursor-pointer text-red-800 font-medium">
                Development Details
              </summary>
              <pre className="mt-2 p-3 bg-red-100 rounded text-xs text-red-800 overflow-auto">
                {this.state.error.toString()}
                {this.state.errorInfo && (
                  <>
                    {'\n\nComponent Stack:'}
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading state component for Solana components
export const SolanaLoadingState: React.FC<{ message?: string }> = ({ 
  message = "Loading Solana data..." 
}) => (
  <div className="flex items-center justify-center p-8">
    <div className="flex items-center gap-3">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <span className="text-gray-600">{message}</span>
    </div>
  </div>
);

// Error state component for Solana operations
export const SolanaErrorState: React.FC<{ 
  error: string; 
  onRetry?: () => void;
  showDetails?: boolean;
}> = ({ error, onRetry, showDetails = false }) => (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-2">
    <div className="flex items-center gap-2 mb-2">
      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <span className="text-yellow-800 font-medium">Solana Operation Failed</span>
    </div>
    
    <p className="text-yellow-700 text-sm mb-3">
      {error || 'An unexpected error occurred with the Solana integration.'}
    </p>
    
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
      >
        Retry
      </button>
    )}
    
    {showDetails && process.env.NODE_ENV === 'development' && (
      <details className="mt-2">
        <summary className="cursor-pointer text-yellow-800 text-xs">Technical Details</summary>
        <pre className="mt-1 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
          {error}
        </pre>
      </details>
    )}
  </div>
);

export default SolanaErrorBoundary;