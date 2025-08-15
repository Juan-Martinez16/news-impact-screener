// src/components/NewsImpactScreener.js - v4.1.0-fixed
// COMPLETE REPLACEMENT - Fixed data loading and error handling

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle,
  WifiOff,
  Wifi,
} from "lucide-react";

// Import existing components
import StockScreener from "./StockScreener";
import CatalystAnalysisTab from "./CatalystAnalysisTab";
import PerformanceTrackingTab from "./PerformanceTrackingTab";

// Import the fixed data service
import InstitutionalDataService from "../api/InstitutionalDataService";

const NewsImpactScreener = () => {
  console.log("🚀 NewsImpactScreener v4.1.0-fixed starting...");

  // Refs to prevent duplicate operations
  const loadingRef = useRef(false);
  const mountedRef = useRef(false);
  const initialLoadDone = useRef(false);

  // ============================================
  // CORE STATE MANAGEMENT
  // ============================================

  const [activeTab, setActiveTab] = useState("screener");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [screeningResults, setScreeningResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);

  // Service status tracking
  const [serviceStatus, setServiceStatus] = useState({
    connected: false,
    version: "unknown",
    lastCheck: null,
    backendUrl: InstitutionalDataService.backendBaseUrl,
    error: null,
  });

  // Market context with defaults
  const [marketContext, setMarketContext] = useState({
    volatility: "NORMAL",
    trend: "NEUTRAL",
    breadth: "MIXED",
    spyChange: 0,
    vix: 20,
    lastUpdate: new Date().toISOString(),
    dataSource: "LOADING",
  });

  // Watchlist management
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem("institutionalWatchlist");
      const parsed = saved ? JSON.parse(saved) : [];
      console.log("📋 Loaded watchlist:", parsed.length, "items");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("⚠️ Error loading watchlist:", error);
      return [];
    }
  });

  // ============================================
  // DATA LOADING FUNCTIONS
  // ============================================

  const loadRealData = useCallback(async () => {
    // Prevent duplicate loads
    if (loadingRef.current) {
      console.log("⚠️ Load already in progress, skipping...");
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log("📊 Starting comprehensive data load...");

      // Step 1: Test backend connection
      console.log("🔍 Testing backend connection...");
      const connectionTest = await InstitutionalDataService.testConnection();

      setServiceStatus({
        connected: connectionTest.success,
        version: connectionTest.version || "unknown",
        lastCheck: new Date().toISOString(),
        backendUrl: InstitutionalDataService.backendBaseUrl,
        error: connectionTest.error || null,
      });

      if (!connectionTest.success) {
        throw new Error(`Backend connection failed: ${connectionTest.error}`);
      }

      console.log("✅ Backend connection successful");

      // Step 2: Load market context
      console.log("📈 Loading market context...");
      try {
        const marketData = await InstitutionalDataService.getMarketContext();
        setMarketContext(marketData);
        console.log("✅ Market context loaded");
      } catch (marketError) {
        console.warn(
          "⚠️ Market context failed, using defaults:",
          marketError.message
        );
        // Keep default market context
      }

      // Step 3: Load stock screening data
      console.log("🔍 Starting stock screening...");
      const screeningData = await InstitutionalDataService.getStockScreening({
        forceRefresh: !initialLoadDone.current,
      });

      if (!screeningData) {
        throw new Error("No screening data received");
      }

      // Validate and process screening data
      const stocks = screeningData.stocks || screeningData.results || [];

      if (!Array.isArray(stocks)) {
        throw new Error("Invalid screening data format");
      }

      console.log(`✅ Screening completed: ${stocks.length} stocks loaded`);

      // Update state with results
      setScreeningResults(stocks);

      // Update service status with success
      setServiceStatus((prev) => ({
        ...prev,
        connected: true,
        lastCheck: new Date().toISOString(),
        error: null,
      }));

      // Show summary
      if (screeningData.summary) {
        console.log(
          `📊 Summary: ${screeningData.summary.totalProcessed} processed, ${screeningData.summary.successRate}% success rate`
        );
      }

      // Mark initial load as complete
      initialLoadDone.current = true;
    } catch (error) {
      console.error("❌ Failed to load data:", error.message);

      setError(error.message);
      setServiceStatus((prev) => ({
        ...prev,
        connected: false,
        error: error.message,
        lastCheck: new Date().toISOString(),
      }));

      // Clear results on error
      setScreeningResults([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // ============================================
  // COMPONENT LIFECYCLE
  // ============================================

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      console.log("🎬 Component mounted, starting initial data load");
      loadRealData();
    }

    return () => {
      console.log("🧹 Component unmounting");
      loadingRef.current = false;
      mountedRef.current = false;
    };
  }, [loadRealData]);

  // ============================================
  // WATCHLIST MANAGEMENT
  // ============================================

  const toggleWatchlist = useCallback((stock) => {
    if (!stock || !stock.symbol) {
      console.warn("⚠️ Invalid stock for watchlist:", stock);
      return;
    }

    setWatchlist((prevWatchlist) => {
      const isInWatchlist = prevWatchlist.some(
        (item) => item.symbol === stock.symbol
      );
      let newWatchlist;

      if (isInWatchlist) {
        newWatchlist = prevWatchlist.filter(
          (item) => item.symbol !== stock.symbol
        );
        console.log(`➖ Removed ${stock.symbol} from watchlist`);
      } else {
        const watchlistItem = {
          symbol: stock.symbol,
          addedAt: new Date().toISOString(),
          currentPrice: stock.currentPrice || 0,
          nissScore: stock.nissScore || 0,
          confidence: stock.confidence || "MEDIUM",
        };
        newWatchlist = [...prevWatchlist, watchlistItem];
        console.log(`➕ Added ${stock.symbol} to watchlist`);
      }

      // Persist to localStorage
      try {
        localStorage.setItem(
          "institutionalWatchlist",
          JSON.stringify(newWatchlist)
        );
      } catch (error) {
        console.warn("⚠️ Failed to save watchlist:", error);
      }

      return newWatchlist;
    });
  }, []);

  // ============================================
  // TAB NAVIGATION
  // ============================================

  const tabs = [
    { id: "screener", label: "Stock Screener", count: screeningResults.length },
    { id: "catalyst", label: "Catalyst Analysis", count: 0 },
    {
      id: "performance",
      label: "Performance Tracking",
      count: watchlist.length,
    },
  ];

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const refreshData = useCallback(() => {
    console.log("🔄 Manual refresh triggered");
    initialLoadDone.current = false; // Force fresh data
    InstitutionalDataService.clearCache();
    loadRealData();
  }, [loadRealData]);

  const retryConnection = useCallback(() => {
    console.log("🔄 Retrying connection...");
    setError(null);
    InstitutionalDataService.reset();
    refreshData();
  }, [refreshData]);

  // ============================================
  // DASHBOARD METRICS
  // ============================================

  const dashboardMetrics = {
    total: screeningResults.length,
    high: screeningResults.filter((s) => s.confidence === "HIGH").length,
    bullish: screeningResults.filter((s) => s.sentiment === "BULLISH").length,
    avgNiss:
      screeningResults.length > 0
        ? (
            screeningResults.reduce((sum, s) => sum + (s.nissScore || 0), 0) /
            screeningResults.length
          ).toFixed(1)
        : "0.0",
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderCurrentTab = () => {
    const commonProps = {
      screeningResults,
      selectedStock,
      onSelectStock: setSelectedStock,
      watchlist,
      onToggleWatchlist: toggleWatchlist,
      loading,
      error,
      marketContext,
      serviceStatus,
    };

    switch (activeTab) {
      case "screener":
        return <StockScreener {...commonProps} />;
      case "catalyst":
        return <CatalystAnalysisTab {...commonProps} />;
      case "performance":
        return <PerformanceTrackingTab {...commonProps} />;
      default:
        return <StockScreener {...commonProps} />;
    }
  };

  const StatusIndicator = ({ connected, version, url, error }) => (
    <div className="flex items-center space-x-2 text-sm">
      {connected ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <WifiOff className="w-4 h-4 text-red-500" />
      )}
      <span className={connected ? "text-green-700" : "text-red-700"}>
        Backend {connected ? "Connected" : "Disconnected"}
      </span>
      {version && version !== "unknown" && (
        <span className="text-gray-500">v{version}</span>
      )}
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  News Impact Screener
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Institutional-Grade Stock Analysis v4.1.0
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <StatusIndicator
                  connected={serviceStatus.connected}
                  version={serviceStatus.version}
                  url={serviceStatus.backendUrl}
                  error={serviceStatus.error}
                />

                <button
                  onClick={refreshData}
                  disabled={loading}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    loading
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                  />
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </div>
            </div>
          </div>

          {/* Metrics Bar */}
          <div className="px-6 py-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="text-sm">
                  <span className="text-gray-500">Total Stocks:</span>
                  <span className="ml-1 font-semibold text-gray-900">
                    {dashboardMetrics.total}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">High Confidence:</span>
                  <span className="ml-1 font-semibold text-green-600">
                    {dashboardMetrics.high}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Bullish:</span>
                  <span className="ml-1 font-semibold text-blue-600">
                    {dashboardMetrics.bullish}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Avg NISS:</span>
                  <span className="ml-1 font-semibold text-gray-900">
                    {dashboardMetrics.avgNiss}
                  </span>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                Market:{" "}
                <span className="font-medium">{marketContext.trend}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-800 font-medium">Connection Error</h3>
                <p className="text-red-700 mt-1 text-sm">{error}</p>
                <div className="mt-3 flex items-center space-x-3">
                  <button
                    onClick={retryConnection}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Retry Connection
                  </button>
                  <button
                    onClick={() =>
                      window.open(serviceStatus.backendUrl, "_blank")
                    }
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Test Backend Directly
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === "development" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-blue-800 font-medium mb-2">Debug Info</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Backend URL: {serviceStatus.backendUrl}</p>
              <p>
                • Service Status:{" "}
                {serviceStatus.connected ? "Connected" : "Disconnected"}
              </p>
              <p>• Backend Version: {serviceStatus.version}</p>
              <p>• Screening Results: {screeningResults.length} stocks</p>
              <p>• Loading State: {loading ? "Active" : "Idle"}</p>
              <p>
                • Initial Load Done: {initialLoadDone.current ? "Yes" : "No"}
              </p>
              <p>• Last Check: {serviceStatus.lastCheck || "Never"}</p>
            </div>
            <div className="mt-2 flex space-x-2">
              <button
                onClick={() =>
                  console.log(
                    "Service Status:",
                    InstitutionalDataService.getServiceStatus()
                  )
                }
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Log Service Status
              </button>
              <button
                onClick={() =>
                  InstitutionalDataService.debugScreeningResponse()
                }
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Debug Screening
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">{renderCurrentTab()}</div>
      </div>
    </div>
  );
};

export default NewsImpactScreener;
