// src/index.js - PRODUCTION VERSION - StrictMode re-enabled safely
// Uses ErrorBoundary to catch any issues while keeping StrictMode benefits

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import ErrorBoundary from "./components/ErrorBoundary";

// Enhanced render counter for debugging
window.renderCount = 0;
window.appStartTime = Date.now();

// Development logging
if (process.env.NODE_ENV === "development") {
  console.log("🚀 News Impact Screener v3.1.5 starting...");
  console.log("📅 Start time:", new Date().toISOString());
  console.log("🌐 Environment:", process.env.NODE_ENV);
  console.log(
    "🔗 Backend URL:",
    process.env.REACT_APP_BACKEND_URL || "Not configured"
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));

// ✅ STRICTMODE RE-ENABLED with ErrorBoundary protection
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Enhanced performance monitoring
if (process.env.NODE_ENV === "development") {
  // Log performance metrics
  reportWebVitals((metric) => {
    console.log(`📊 Performance Metric - ${metric.name}:`, metric.value);

    // Store metrics for analysis
    try {
      const metrics = JSON.parse(
        localStorage.getItem("performanceMetrics") || "[]"
      );
      metrics.push({
        ...metric,
        timestamp: Date.now(),
        url: window.location.href,
      });

      // Keep only last 50 metrics
      const recentMetrics = metrics.slice(-50);
      localStorage.setItem("performanceMetrics", JSON.stringify(recentMetrics));
    } catch (error) {
      console.warn("Performance metric storage failed:", error);
    }
  });

  // Monitor for potential infinite loops
  setInterval(() => {
    const currentRenderCount = window.renderCount || 0;
    const timeElapsed = Date.now() - window.appStartTime;
    const rendersPerSecond = currentRenderCount / (timeElapsed / 1000);

    if (rendersPerSecond > 10) {
      console.warn(
        `⚠️ HIGH RENDER RATE: ${rendersPerSecond.toFixed(1)} renders/sec`
      );
      console.warn(
        `📊 Total renders: ${currentRenderCount} in ${(
          timeElapsed / 1000
        ).toFixed(1)}s`
      );
    }

    // Alert for dangerous render counts
    if (currentRenderCount > 200) {
      console.error(`🚨 DANGEROUS RENDER COUNT: ${currentRenderCount}`);
      console.error(
        "This may indicate an infinite loop. Check component dependencies."
      );
    }
  }, 5000); // Check every 5 seconds

  // Log app initialization completion
  window.addEventListener("load", () => {
    const initTime = Date.now() - window.appStartTime;
    console.log(`✅ App fully loaded in ${initTime}ms`);
    console.log(`📈 Initial render count: ${window.renderCount || 0}`);
  });
}
