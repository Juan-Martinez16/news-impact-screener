// src/components/ErrorBoundary.js - Production Error Handler
// Creates safety net for entire application

import React from "react";
import { AlertCircle, RefreshCw, Home, Bug } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error("🚨 ErrorBoundary caught an error:", error);
    console.error("📍 Error Info:", errorInfo);

    // Store error details in state
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // Log to localStorage for debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        errorBoundary: "NewsImpactScreener",
        userAgent: navigator.userAgent,
        url: window.location.href,
        errorId: this.state.errorId,
      };

      const existingLogs = JSON.parse(
        localStorage.getItem("errorLogs") || "[]"
      );
      existingLogs.push(errorLog);

      // Keep only last 10 errors
      const recentLogs = existingLogs.slice(-10);
      localStorage.setItem("errorLogs", JSON.stringify(recentLogs));

      console.log("💾 Error logged to localStorage:", errorLog);
    } catch (logError) {
      console.warn("Failed to log error to localStorage:", logError);
    }

    // Report to external service (if configured)
    this.reportError(error, errorInfo);
  }

  reportError = (error, errorInfo) => {
    // Future: Report to error tracking service
    if (process.env.REACT_APP_ERROR_REPORTING_URL) {
      try {
        fetch(process.env.REACT_APP_ERROR_REPORTING_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: error.toString(),
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            errorId: this.state.errorId,
          }),
        }).catch((err) => console.warn("Error reporting failed:", err));
      } catch (reportingError) {
        console.warn("Error reporting service failed:", reportingError);
      }
    }
  };

  handleRetry = () => {
    console.log("🔄 User requested error recovery");

    // Clear error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });

    // Clear any cached data that might be causing issues
    try {
      // Clear API cache if it exists
      if (window.InstitutionalDataService) {
        window.InstitutionalDataService.cache?.clear();
      }

      console.log("🧹 Cleared cache for error recovery");
    } catch (cacheError) {
      console.warn("Cache clearing failed:", cacheError);
    }
  };

  handleReportBug = () => {
    console.log("🐛 User reporting bug");

    try {
      const bugReport = {
        errorId: this.state.errorId,
        error: this.state.error?.toString(),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        componentStack: this.state.errorInfo?.componentStack,
      };

      // Copy to clipboard for easy reporting
      navigator.clipboard
        .writeText(JSON.stringify(bugReport, null, 2))
        .then(() => {
          alert(
            "Bug report copied to clipboard! Please paste this in your GitHub issue."
          );
        })
        .catch(() => {
          // Fallback: Show in console
          console.log("📋 Bug Report (copy this):", bugReport);
          alert(
            "Bug report logged to console. Please copy and paste into GitHub issue."
          );
        });
    } catch (reportError) {
      console.error("Bug reporting failed:", reportError);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 rounded-full p-4">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h1>

            <p className="text-gray-600 mb-6">
              The News Impact Screener encountered an unexpected error. This has
              been logged automatically for investigation.
            </p>

            {/* Error ID */}
            <div className="bg-gray-100 rounded-lg p-3 mb-6">
              <div className="text-sm text-gray-500">Error ID</div>
              <div className="font-mono text-sm text-gray-800">
                {this.state.errorId}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-medium"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-200 text-gray-800 px-4 py-3 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center font-medium"
              >
                <Home className="w-4 h-4 mr-2" />
                Reload Application
              </button>

              <button
                onClick={this.handleReportBug}
                className="w-full bg-orange-100 text-orange-800 px-4 py-2 rounded-lg hover:bg-orange-200 transition-colors flex items-center justify-center text-sm"
              >
                <Bug className="w-4 h-4 mr-2" />
                Report Bug
              </button>
            </div>

            {/* Development Error Details */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 font-medium">
                  🔍 Error Details (Development Only)
                </summary>
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200 text-xs">
                  <div className="font-semibold text-red-800 mb-2">
                    Error Message:
                  </div>
                  <div className="text-red-700 mb-3 font-mono bg-white p-2 rounded border">
                    {this.state.error.toString()}
                  </div>

                  {this.state.error.stack && (
                    <>
                      <div className="font-semibold text-red-800 mb-2">
                        Stack Trace:
                      </div>
                      <div className="text-red-700 mb-3 font-mono bg-white p-2 rounded border whitespace-pre-wrap text-xs max-h-32 overflow-y-auto">
                        {this.state.error.stack}
                      </div>
                    </>
                  )}

                  <div className="font-semibold text-red-800 mb-2">
                    Component Stack:
                  </div>
                  <div className="text-red-700 font-mono bg-white p-2 rounded border whitespace-pre-wrap text-xs max-h-32 overflow-y-auto">
                    {this.state.errorInfo?.componentStack}
                  </div>
                </div>
              </details>
            )}

            {/* Tips for users */}
            <div className="mt-6 text-left">
              <div className="text-sm font-medium text-gray-900 mb-2">
                💡 Troubleshooting Tips:
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Try refreshing the page first</li>
                <li>• Clear your browser cache if issues persist</li>
                <li>• Check your internet connection</li>
                <li>• Disable browser extensions temporarily</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
