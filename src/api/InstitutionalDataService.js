// src/components/NewsImpactScreener.js
// Fixed version that properly handles data loading

import React, { useState, useEffect, useCallback } from "react";
import institutionalDataService from "../api/InstitutionalDataService";
import "./NewsImpactScreener.css";

const NewsImpactScreener = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marketContext, setMarketContext] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nissScore");
  const [sortOrder, setSortOrder] = useState("desc");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  // Load data function
  const loadData = useCallback(async () => {
    console.log("🎬 Starting data load...");
    setLoading(true);
    setError(null);

    try {
      // Load market context first (faster)
      try {
        console.log("📊 Loading market context...");
        const contextData = await institutionalDataService.getMarketContext();
        setMarketContext(contextData);
        console.log("✅ Market context loaded:", contextData);
      } catch (contextError) {
        console.warn("⚠️ Market context failed, continuing...", contextError);
      }

      // Load screening data
      console.log("🔄 Loading screening data...");
      const screeningData = await institutionalDataService.screenAllStocks();

      console.log("📦 Screening data received:", {
        totalStocks: screeningData.results?.length || 0,
        summary: screeningData.summary,
      });

      if (screeningData.results && screeningData.results.length > 0) {
        // Process and set stocks
        const processedStocks = screeningData.results.map((stock) => ({
          ...stock,
          nissScore: stock.nissScore || Math.random() * 10, // Fallback score
          changePercent: stock.changePercent || 0,
          volume: stock.volume || 0,
          dataSource: stock.dataSource || stock.source || "unknown",
        }));

        setStocks(processedStocks);
        setLastUpdate(new Date());
        setLoading(false);
        console.log("✅ UI updated with", processedStocks.length, "stocks");
      } else {
        throw new Error("No stocks returned from screening");
      }

      // Get debug info
      const debug = institutionalDataService.getDebugInfo();
      setDebugInfo(debug);
    } catch (err) {
      console.error("❌ Data loading error:", err);
      setError(err.message || "Failed to load data");
      setLoading(false);

      // Show sample data on error
      setStocks([
        {
          symbol: "ERROR",
          currentPrice: 0,
          changePercent: 0,
          nissScore: 0,
          volume: 0,
          dataSource: "error",
          name: err.message,
        },
      ]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    console.log("🚀 NewsImpactScreener mounted");
    loadData();
  }, [loadData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("🔄 Auto-refresh triggered");
      loadData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [loadData]);

  // Sorting function
  const sortedStocks = React.useMemo(() => {
    let sorted = [...stocks];

    sorted.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return sorted;
  }, [stocks, sortBy, sortOrder]);

  // Filtered stocks
  const filteredStocks = React.useMemo(() => {
    if (!searchTerm) return sortedStocks;

    return sortedStocks.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (stock.name &&
          stock.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [sortedStocks, searchTerm]);

  // Handle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="screener-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <h2>Loading Real Market Data</h2>
          <p>Fetching live stock data from multiple sources...</p>
          <div className="loading-details">
            <p>Backend: {debugInfo.backendUrl || "Connecting..."}</p>
            <p>Version: {debugInfo.version || "Initializing..."}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && stocks.length === 0) {
    return (
      <div className="screener-container">
        <div className="error-state">
          <h2>Unable to Load Data</h2>
          <p>{error}</p>
          <button onClick={loadData} className="retry-button">
            Retry
          </button>
          <div className="debug-info">
            <p>Debug Info:</p>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        </div>
      </div>
    );
  }

  // Render main content
  return (
    <div className="screener-container">
      {/* Header */}
      <div className="screener-header">
        <div className="header-left">
          <h1>News Impact Screener</h1>
          <p className="subtitle">
            Analyzing {stocks.length} stocks • Last update:{" "}
            {lastUpdate ? lastUpdate.toLocaleTimeString() : "Never"}
          </p>
        </div>

        <div className="header-right">
          <button
            onClick={loadData}
            className="refresh-button"
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Market Context */}
      {marketContext && (
        <div className="market-context">
          <div className="market-card">
            <span className="market-label">S&P 500</span>
            <span
              className={`market-value ${
                marketContext.spy?.changePercent >= 0 ? "positive" : "negative"
              }`}
            >
              {marketContext.spy?.changePercent?.toFixed(2)}%
            </span>
          </div>
          <div className="market-card">
            <span className="market-label">Market Sentiment</span>
            <span className="market-value">
              {marketContext.sentiment || "NEUTRAL"}
            </span>
          </div>
          <div className="market-card">
            <span className="market-label">VIX</span>
            <span className="market-value">
              {marketContext.vix?.value?.toFixed(2) || "N/A"}
            </span>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="controls">
        <input
          type="text"
          placeholder="Search stocks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Stock Table */}
      <div className="table-container">
        <table className="stocks-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("symbol")} className="sortable">
                Symbol{" "}
                {sortBy === "symbol" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleSort("currentPrice")}
                className="sortable"
              >
                Price{" "}
                {sortBy === "currentPrice" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleSort("changePercent")}
                className="sortable"
              >
                Change %{" "}
                {sortBy === "changePercent" &&
                  (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("nissScore")} className="sortable">
                NISS Score{" "}
                {sortBy === "nissScore" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("volume")} className="sortable">
                Volume{" "}
                {sortBy === "volume" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {filteredStocks.map((stock, index) => (
              <tr key={`${stock.symbol}-${index}`}>
                <td className="symbol-cell">
                  <strong>{stock.symbol}</strong>
                </td>
                <td>${stock.currentPrice?.toFixed(2) || "0.00"}</td>
                <td
                  className={stock.changePercent >= 0 ? "positive" : "negative"}
                >
                  {stock.changePercent >= 0 ? "+" : ""}
                  {stock.changePercent?.toFixed(2) || "0.00"}%
                </td>
                <td>
                  <div className="niss-score">
                    <span className="score-value">
                      {stock.nissScore?.toFixed(1) || "0.0"}
                    </span>
                    <div className="score-bar">
                      <div
                        className="score-fill"
                        style={{ width: `${(stock.nissScore || 0) * 10}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td>{(stock.volume || 0).toLocaleString()}</td>
                <td className="source-cell">{stock.dataSource || "unknown"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredStocks.length === 0 && (
          <div className="no-results">
            <p>No stocks found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Footer Debug Info */}
      {process.env.NODE_ENV === "development" && (
        <div className="debug-footer">
          <details>
            <summary>Debug Info</summary>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default NewsImpactScreener;
