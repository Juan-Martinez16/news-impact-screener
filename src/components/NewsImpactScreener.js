// src/components/NewsImpactScreener.js - v4.1.0-fixed
// UPDATED - Added error boundaries and improved tab switching

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
import ErrorBoundary from "./ErrorBoundary"; // NEW: Error boundary component

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
    } catch (err) {
      console.error("❌ Error loading watchlist:", err);
      return [];
    }
  });

  // ============================================
  // COMPREHENSIVE DATA LOADING
  // ============================================

  const loadComprehensiveData = useCallback(async () => {
    if (loadingRef.current) {
      console.log("⚠️ Data load already in progress, skipping...");
      return;
    }

    console.log("📊 Starting comprehensive data load...");
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Test backend connection first
      console.log("🔍 Testing backend connection...");
      const connectionTest = await InstitutionalDataService.testConnection();
      console.log("✅ Backend connection successful");

      setServiceStatus({
        connected: true,
        version: connectionTest.version || "4.0.0",
        lastCheck: new Date().toISOString(),
        backendUrl: InstitutionalDataService.backendBaseUrl,
        error: null,
      });

      // Load market context
      console.log("📈 Loading market context...");
      const marketData = await InstitutionalDataService.getMarketContext();
      setMarketContext({
        ...marketData,
        lastUpdate: new Date().toISOString(),
      });
      console.log("✅ Market context loaded");

      // Perform stock screening
      console.log("🔍 Starting stock screening...");
      const screeningData = await InstitutionalDataService.performScreening({
        limit: 50,
        minNissScore: 5.0,
        includeAll: true,
      });

      if (screeningData && Array.isArray(screeningData.stocks)) {
        setScreeningResults(screeningData.stocks);
        console.log(
          `✅ Screening completed: ${screeningData.stocks.length} stocks loaded`
        );

        // Log summary stats
        const summaryStats = {
          total: screeningData.stocks.length,
          bullish: screeningData.stocks.filter((s) => s.sentiment === "BULLISH")
            .length,
          bearish: screeningData.stocks.filter((s) => s.sentiment === "BEARISH")
            .length,
          highConfidence: screeningData.stocks.filter(
            (s) => (s.nissScore || 0) >= 7
          ).length,
          successRate: screeningData.summary?.successRate || 0,
        };

        console.log(
          "📊 Summary:",
          summaryStats.total,
          "processed,",
          summaryStats.successRate,
          "% success rate"
        );
      } else {
        throw new Error("Invalid screening data received");
      }
    } catch (err) {
      console.error("❌ Comprehensive data load failed:", err);
      setError(`Data loading failed: ${err.message}`);
      setServiceStatus((prev) => ({
        ...prev,
        connected: false,
        error: err.message,
      }));
    } finally {
      setLoading(false);
      loadingRef.current = false;
      console.log("🏁 Comprehensive data load completed");
    }
  }, []);

  // ============================================
  // COMPONENT LIFECYCLE
  // ============================================

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      console.log("🎬 Component mounted, starting initial data load");

      // Delay initial load slightly to ensure DOM is ready
      setTimeout(() => {
        loadComprehensiveData();
        initialLoadDone.current = true;
      }, 100);
    }

    return () => {
      console.log("🧹 Component unmounting");
      mountedRef.current = false;
    };
  }, [loadComprehensiveData]);

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleRefresh = useCallback(() => {
    console.log("🔄 Manual refresh triggered");
    loadComprehensiveData();
  }, [loadComprehensiveData]);

  const handleTabChange = useCallback(
    (newTab) => {
      console.log(`🔄 Tab changing from '${activeTab}' to '${newTab}'`);
      setActiveTab(newTab);
      setError(null); // Clear any tab-specific errors
    },
    [activeTab]
  );

  const handleSelectStock = useCallback((stock) => {
    console.log("📊 Stock selected:", stock?.symbol);
    setSelectedStock(stock);
  }, []);

  const handleToggleWatchlist = useCallback((stock) => {
    if (!stock?.symbol) return;

    console.log("📋 Toggling watchlist for:", stock.symbol);
    setWatchlist((prev) => {
      const isInWatchlist = prev.some((item) => item.symbol === stock.symbol);
      let newWatchlist;

      if (isInWatchlist) {
        newWatchlist = prev.filter((item) => item.symbol !== stock.symbol);
        console.log("➖ Removed from watchlist:", stock.symbol);
      } else {
        newWatchlist = [
          ...prev,
          { ...stock, addedAt: new Date().toISOString() },
        ];
        console.log("➕ Added to watchlist:", stock.symbol);
      }

      // Save to localStorage
      try {
        localStorage.setItem(
          "institutionalWatchlist",
          JSON.stringify(newWatchlist)
        );
      } catch (err) {
        console.error("❌ Error saving watchlist:", err);
      }

      return newWatchlist;
    });
  }, []);

  // Handle component errors
  const handleComponentError = useCallback((error, errorInfo) => {
    console.error("❌ Component error captured:", error, errorInfo);
    // Could send to error tracking service here
  }, []);

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderConnectionStatus = () => {
    const { connected, version, backendUrl } = serviceStatus;

    return (
      <div className="flex items-center space-x-2 text-sm">
        {connected ? (
          <>
            <Wifi className="w-4 h-4 text-green-600" />
            <span className="text-green-600">Connected v{version}</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-red-600" />
            <span className="text-red-600">Disconnected</span>
          </>
        )}
        <span className="text-gray-500">({backendUrl})</span>
      </div>
    );
  };

  const renderTabNavigation = () => {
    const tabs = [
      { id: "screener", name: "Stock Screener", icon: "🔍" },
      { id: "catalyst", name: "Catalyst Analysis", icon: "🎯" },
      { id: "performance", name: "Performance Tracking", icon: "📊" },
    ];

    return (
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            disabled={loading}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
            } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </button>
        ))}
      </div>
    );
  };

  const renderActiveTab = () => {
    const commonProps = {
      screeningResults,
      onSelectStock: handleSelectStock,
      watchlist,
      onToggleWatchlist: handleToggleWatchlist,
      loading,
      error,
      marketContext,
    };

    switch (activeTab) {
      case "screener":
        return (
          <ErrorBoundary
            componentName="Stock Screener"
            onError={handleComponentError}
          >
            <StockScreener {...commonProps} />
          </ErrorBoundary>
        );

      case "catalyst":
        return (
          <ErrorBoundary
            componentName="Catalyst Analysis"
            onError={handleComponentError}
          >
            <CatalystAnalysisTab {...commonProps} />
          </ErrorBoundary>
        );

      case "performance":
        return (
          <ErrorBoundary
            componentName="Performance Tracking"
            onError={handleComponentError}
          >
            <PerformanceTrackingTab {...commonProps} />
          </ErrorBoundary>
        );

      default:
        return (
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-gray-600">Unknown tab: {activeTab}</p>
          </div>
        );
    }
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              News Impact Screener
            </h1>
            <p className="text-gray-600">
              Enhanced 6-component NISS analysis with institutional-grade data
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {renderConnectionStatus()}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span>{loading ? "Loading..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        {screeningResults.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {screeningResults.length}
              </div>
              <div className="text-sm text-gray-600">Stocks Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {
                  screeningResults.filter((s) => s.sentiment === "BULLISH")
                    .length
                }
              </div>
              <div className="text-sm text-gray-600">Bullish Signals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {
                  screeningResults.filter((s) => s.sentiment === "BEARISH")
                    .length
                }
              </div>
              <div className="text-sm text-gray-600">Bearish Signals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {screeningResults.filter((s) => (s.nissScore || 0) >= 7).length}
              </div>
              <div className="text-sm text-gray-600">High Confidence</div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {renderTabNavigation()}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-red-800 font-medium">Error</h3>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Active Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-96">
        {renderActiveTab()}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <div>
                <h3 className="font-medium text-gray-900">Loading Data</h3>
                <p className="text-sm text-gray-600">
                  Analyzing stocks and market conditions...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsImpactScreener;
