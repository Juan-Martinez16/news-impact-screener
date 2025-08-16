// src/components/ErrorBoundary.js - NEW COMPONENT
// Error boundary to catch JavaScript errors in tab components

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      componentName: props.componentName || "Component",
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error(`❌ Error in ${this.state.componentName}:`, error);
    console.error("Error details:", errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // Optional: Report to error tracking service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-96 flex items-center justify-center bg-red-50 border-2 border-red-200 rounded-lg">
          <div className="text-center p-8 max-w-md">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />

            <h2 className="text-xl font-semibold text-red-900 mb-2">
              {this.state.componentName} Error
            </h2>

            <p className="text-red-700 mb-4">
              Something went wrong while loading this tab. This is usually
              caused by data loading issues.
            </p>

            {/* Error details for development */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="bg-red-100 border border-red-300 rounded p-3 mb-4 text-left">
                <p className="text-xs font-mono text-red-800 break-all">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-700 cursor-pointer">
                      Stack trace
                    </summary>
                    <pre className="text-xs text-red-600 mt-1 overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>

              <div className="text-xs text-red-600 mt-2">
                If this persists, try refreshing the page or switching to
                another tab first.
              </div>
            </div>
          </div>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
