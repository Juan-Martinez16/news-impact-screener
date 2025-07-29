// src/utils/performanceMonitor.js - PRODUCTION PERFORMANCE MONITORING

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.isEnabled =
      process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING === "true";
    this.sessionId = this.generateSessionId();

    if (this.isEnabled) {
      this.initializeMonitoring();
    }
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  initializeMonitoring() {
    // Monitor page load performance
    this.trackPageLoad();

    // Monitor API call performance
    this.trackAPIPerformance();

    // Monitor component render performance
    this.trackRenderPerformance();

    // Monitor memory usage
    this.trackMemoryUsage();

    // Set up periodic reporting
    this.setupPeriodicReporting();

    console.log("📊 Performance monitoring initialized");
  }

  // Track page load metrics
  trackPageLoad() {
    if (typeof window !== "undefined" && window.performance) {
      window.addEventListener("load", () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType("navigation")[0];

          if (navigation) {
            this.recordMetric("page_load", {
              domContentLoaded:
                navigation.domContentLoadedEventEnd -
                navigation.domContentLoadedEventStart,
              loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
              totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
              dnsLookup:
                navigation.domainLookupEnd - navigation.domainLookupStart,
              tcpConnection: navigation.connectEnd - navigation.connectStart,
              serverResponse: navigation.responseEnd - navigation.requestStart,
              timestamp: Date.now(),
            });

            console.log("📊 Page load metrics recorded");
          }
        }, 0);
      });
    }
  }

  // Track API call performance
  trackAPIPerformance() {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];

      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        this.recordMetric("api_call", {
          url: typeof url === "string" ? url : url.url,
          method: args[1]?.method || "GET",
          status: response.status,
          duration,
          success: response.ok,
          timestamp: Date.now(),
        });

        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        this.recordMetric("api_call", {
          url: typeof url === "string" ? url : url.url,
          method: args[1]?.method || "GET",
          status: 0,
          duration,
          success: false,
          error: error.message,
          timestamp: Date.now(),
        });

        throw error;
      }
    };
  }

  // Track component render performance
  trackRenderPerformance() {
    if (
      typeof window !== "undefined" &&
      window.performance &&
      window.performance.measure
    ) {
      // This would integrate with React DevTools or custom render tracking
      // For now, we'll track general rendering metrics

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === "measure" && entry.name.includes("React")) {
            this.recordMetric("react_render", {
              name: entry.name,
              duration: entry.duration,
              timestamp: Date.now(),
            });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ["measure"] });
      } catch (error) {
        console.warn("Performance observer not supported:", error);
      }
    }
  }

  // Track memory usage
  trackMemoryUsage() {
    if (window.performance && window.performance.memory) {
      setInterval(() => {
        const memory = window.performance.memory;

        this.recordMetric("memory_usage", {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
          timestamp: Date.now(),
        });
      }, 30000); // Every 30 seconds
    }
  }

  // Set up periodic reporting
  setupPeriodicReporting() {
    // Report metrics every 5 minutes
    setInterval(() => {
      this.generateReport();
    }, 5 * 60 * 1000);

    // Report on page unload
    window.addEventListener("beforeunload", () => {
      this.generateReport(true);
    });
  }

  // Record a performance metric
  recordMetric(type, data) {
    if (!this.isEnabled) return;

    if (!this.metrics.has(type)) {
      this.metrics.set(type, []);
    }

    const metrics = this.metrics.get(type);
    metrics.push({
      ...data,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      timestamp: data.timestamp || Date.now(),
    });

    // Keep only last 100 entries per type to manage memory
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }

    // Log significant performance issues
    this.checkForPerformanceIssues(type, data);
  }

  // Check for performance issues and log warnings
  checkForPerformanceIssues(type, data) {
    switch (type) {
      case "api_call":
        if (data.duration > 10000) {
          // > 10 seconds
          console.warn(
            "🐌 Slow API call detected:",
            data.url,
            `${data.duration}ms`
          );
        }
        if (!data.success) {
          console.warn("❌ API call failed:", data.url, data.error);
        }
        break;

      case "page_load":
        if (data.totalLoadTime > 5000) {
          // > 5 seconds
          console.warn(
            "🐌 Slow page load detected:",
            `${data.totalLoadTime}ms`
          );
        }
        break;

      case "memory_usage":
        if (data.usagePercent > 90) {
          // > 90% memory usage
          console.warn(
            "🧠 High memory usage detected:",
            `${data.usagePercent.toFixed(1)}%`
          );
        }
        break;

      case "react_render":
        if (data.duration > 16) {
          // > 16ms (60fps threshold)
          console.warn(
            "🐌 Slow React render detected:",
            data.name,
            `${data.duration}ms`
          );
        }
        break;
    }
  }

  // Generate performance report
  generateReport(isFinal = false) {
    if (!this.isEnabled || this.metrics.size === 0) return;

    const report = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      isFinal,
      summary: this.generateSummary(),
      metrics: Object.fromEntries(this.metrics),
      environment: {
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        connection: navigator.connection
          ? {
              effectiveType: navigator.connection.effectiveType,
              downlink: navigator.connection.downlink,
              rtt: navigator.connection.rtt,
            }
          : null,
        deviceMemory: navigator.deviceMemory || null,
        hardwareConcurrency: navigator.hardwareConcurrency || null,
      },
    };

    // Log report summary
    console.log("📊 Performance Report:", report.summary);

    // In production, you would send this to your analytics service
    if (process.env.NODE_ENV === "production") {
      this.sendReportToAnalytics(report);
    }

    return report;
  }

  // Generate performance summary
  generateSummary() {
    const summary = {
      totalMetrics: 0,
      averageApiResponseTime: 0,
      failedApiCalls: 0,
      averageMemoryUsage: 0,
      slowRenders: 0,
      pageLoadTime: 0,
    };

    // API call metrics
    const apiCalls = this.metrics.get("api_call") || [];
    if (apiCalls.length > 0) {
      summary.totalMetrics += apiCalls.length;
      summary.averageApiResponseTime =
        apiCalls.reduce((sum, call) => sum + call.duration, 0) /
        apiCalls.length;
      summary.failedApiCalls = apiCalls.filter((call) => !call.success).length;
    }

    // Memory usage metrics
    const memoryMetrics = this.metrics.get("memory_usage") || [];
    if (memoryMetrics.length > 0) {
      summary.averageMemoryUsage =
        memoryMetrics.reduce((sum, metric) => sum + metric.usagePercent, 0) /
        memoryMetrics.length;
    }

    // Render metrics
    const renderMetrics = this.metrics.get("react_render") || [];
    if (renderMetrics.length > 0) {
      summary.slowRenders = renderMetrics.filter(
        (render) => render.duration > 16
      ).length;
    }

    // Page load metrics
    const pageLoadMetrics = this.metrics.get("page_load") || [];
    if (pageLoadMetrics.length > 0) {
      summary.pageLoadTime =
        pageLoadMetrics[pageLoadMetrics.length - 1].totalLoadTime;
    }

    return summary;
  }

  // Send report to analytics service (placeholder)
  async sendReportToAnalytics(report) {
    try {
      // In production, replace with your analytics endpoint
      const analyticsEndpoint = process.env.REACT_APP_ANALYTICS_ENDPOINT;

      if (analyticsEndpoint) {
        await fetch(analyticsEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(report),
        });

        console.log("📊 Performance report sent to analytics");
      }
    } catch (error) {
      console.warn("Failed to send performance report:", error);
    }
  }

  // Public methods for manual tracking
  startTimer(name) {
    const startTime = performance.now();
    return {
      end: () => {
        const duration = performance.now() - startTime;
        this.recordMetric("custom_timer", {
          name,
          duration,
          timestamp: Date.now(),
        });
        return duration;
      },
    };
  }

  trackUserAction(action, metadata = {}) {
    this.recordMetric("user_action", {
      action,
      ...metadata,
      timestamp: Date.now(),
    });
  }

  trackError(error, context = {}) {
    this.recordMetric("error", {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
    });
  }

  // Get current performance status
  getPerformanceStatus() {
    const summary = this.generateSummary();

    return {
      status: this.determineOverallStatus(summary),
      summary,
      recommendations: this.generateRecommendations(summary),
    };
  }

  determineOverallStatus(summary) {
    let score = 100;

    // Deduct points for performance issues
    if (summary.averageApiResponseTime > 5000) score -= 20;
    if (summary.failedApiCalls > 0) score -= 10;
    if (summary.averageMemoryUsage > 80) score -= 15;
    if (summary.slowRenders > 5) score -= 10;
    if (summary.pageLoadTime > 3000) score -= 15;

    if (score >= 90) return "excellent";
    if (score >= 70) return "good";
    if (score >= 50) return "fair";
    return "poor";
  }

  generateRecommendations(summary) {
    const recommendations = [];

    if (summary.averageApiResponseTime > 5000) {
      recommendations.push(
        "Consider optimizing API calls or implementing request caching"
      );
    }

    if (summary.failedApiCalls > 0) {
      recommendations.push("Investigate and fix failing API calls");
    }

    if (summary.averageMemoryUsage > 80) {
      recommendations.push(
        "Monitor memory usage and implement cleanup strategies"
      );
    }

    if (summary.slowRenders > 5) {
      recommendations.push(
        "Optimize React components and consider using React.memo"
      );
    }

    if (summary.pageLoadTime > 3000) {
      recommendations.push("Optimize bundle size and implement code splitting");
    }

    return recommendations;
  }

  // Clear all metrics (useful for testing)
  clearMetrics() {
    this.metrics.clear();
    console.log("📊 Performance metrics cleared");
  }

  // Enable/disable monitoring
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(
      `📊 Performance monitoring ${enabled ? "enabled" : "disabled"}`
    );
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export for use in components
export default performanceMonitor;

// Utility functions for easy integration
export const trackApiCall = (url, method, duration, success, error = null) => {
  performanceMonitor.recordMetric("api_call", {
    url,
    method,
    duration,
    success,
    error,
    timestamp: Date.now(),
  });
};

export const trackComponentRender = (componentName, duration) => {
  performanceMonitor.recordMetric("component_render", {
    componentName,
    duration,
    timestamp: Date.now(),
  });
};

export const trackUserInteraction = (action, element, metadata = {}) => {
  performanceMonitor.trackUserAction("user_interaction", {
    action,
    element,
    ...metadata,
  });
};

export const trackScreeningPerformance = (symbolCount, duration, success) => {
  performanceMonitor.recordMetric("screening_performance", {
    symbolCount,
    duration,
    success,
    timestamp: Date.now(),
  });
};

export const trackNISSCalculation = (symbol, duration, score, confidence) => {
  performanceMonitor.recordMetric("niss_calculation", {
    symbol,
    duration,
    score,
    confidence,
    timestamp: Date.now(),
  });
};

// React Hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    startTimer: performanceMonitor.startTimer.bind(performanceMonitor),
    trackUserAction:
      performanceMonitor.trackUserAction.bind(performanceMonitor),
    trackError: performanceMonitor.trackError.bind(performanceMonitor),
    getPerformanceStatus:
      performanceMonitor.getPerformanceStatus.bind(performanceMonitor),
  };
};
