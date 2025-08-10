// src/App.js - PRODUCTION READY VERSION
// Clean, optimized version for production deployment

import React from "react";
import "./App.css";
import NewsImpactScreener from "./components/NewsImpactScreener";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  // Environment validation on startup
  React.useEffect(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL;
    const version = process.env.REACT_APP_VERSION;

    console.log("🚀 News Impact Screener v" + (version || "4.0.0"));
    console.log("🔗 Backend URL:", backendUrl || "NOT CONFIGURED");

    if (!backendUrl) {
      console.error("❌ REACT_APP_BACKEND_URL not configured in environment");
      console.log(
        "💡 Expected: REACT_APP_BACKEND_URL=https://news-impact-screener-backend.onrender.com"
      );
    } else {
      console.log("✅ Backend URL configured correctly");
    }
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
