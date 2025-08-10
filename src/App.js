// src/App.js - PRODUCTION READY VERSION
// Clean implementation with proper environment validation

import React from "react";
import "./App.css";
import NewsImpactScreener from "./components/NewsImpactScreener";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  // Environment validation on startup
  React.useEffect(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL;
    const version = process.env.REACT_APP_VERSION;
    const environment = process.env.REACT_APP_ENVIRONMENT;

    console.log("🚀 News Impact Screener v" + (version || "4.0.0-production"));
    console.log("🌍 Environment:", environment || "development");
    console.log("🔗 Backend URL:", backendUrl || "NOT CONFIGURED");

    if (!backendUrl) {
      console.error("❌ REACT_APP_BACKEND_URL not configured in environment");
      console.log(
        "💡 Expected: REACT_APP_BACKEND_URL=https://news-impact-screener-backend.onrender.com"
      );
    } else {
      console.log("✅ Backend URL configured correctly");
    }

    // Log all React environment variables for debugging
    const reactEnvVars = Object.keys(process.env).filter((key) =>
      key.startsWith("REACT_APP_")
    );
    console.log("📋 React Environment Variables:", reactEnvVars.length);
    reactEnvVars.forEach((key) => {
      console.log(`   ${key}: ${process.env[key]}`);
    });
  }, []);

  return (
    <ErrorBoundary>
      <div className="App">
        <NewsImpactScreener />
      </div>
    </ErrorBoundary>
  );
}

export default App;
