// src/App.js - COMPLETE UPDATED VERSION
// This is the complete file - replace your entire App.js with this

import React from "react";
import NewsImpactScreener from "./components/NewsImpactScreener";
import "./App.css";

function App() {
  console.log("✅ News Impact Screener started successfully!");

  return (
    <div className="App">
      <NewsImpactScreener />
    </div>
  );
}

export default App;
