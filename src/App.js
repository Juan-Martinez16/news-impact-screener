// src/App.js - FIXED VERSION with correct import case
// This fixes the case-sensitivity issue with the import

import React from "react";
import "./App.css";
import ConnectionTest from "./components/ConnectionTest"; // FIXED: Correct case
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  console.log("🔍 App.js loading with ConnectionTest for v4.0.0 verification");
  console.log("🔍 Backend URL:", process.env.REACT_APP_BACKEND_URL);
  console.log("🔍 Version:", process.env.REACT_APP_VERSION);

  return (
    <ErrorBoundary>
      <div className="App">
        <ConnectionTest />
      </div>
    </ErrorBoundary>
  );
}

export default App;
