import React from "react";
import "./App.css"; // ← This line is critical
import NewsImpactScreener from "./components/NewsImpactScreener";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <NewsImpactScreener />
      </div>
    </ErrorBoundary>
  );
}

export default App;
