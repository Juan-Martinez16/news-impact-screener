// src/components/NewsImpactScreener.js - FIXED VERSION v4.0.3
// COMPLETE REPLACEMENT - This fixes the data loading and state management

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";

// Only import the icons we actually use
import { RefreshCw, AlertCircle, Download } from "lucide-react";

// Import existing tab components
import StockScreener from "./StockScreener";
import CatalystAnalysisTab from "./CatalystAnalysisTab";
import PerformanceTrackingTab from "./PerformanceTrackingTab";

// Import Phase 1 engines - only what we use
import InstitutionalDataService from "../api/InstitutionalDataService";

// Import Phase 2 modular components
import HeaderComponent from "./enhanced/HeaderComponent";
import TabNavigation from "./enhanced/TabNavigation";

const NewsImpactScreener = () => {
  console.log("🚀 NewsImpactScreener v4.0.3-data-fixed starting...");

  // Refs to prevent duplicate operations
  const loadingRef = useRef(false);
  const mountedRef = useRef(false);
  const initialLoadDone = useRef(false);

  // ============================================
  // CORE STATE MANAGEMENT (FIXED)
  // ============================================

  const [activeTab, setActiveTab] = useState("screener");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [screeningResults, setScreeningResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);

  // Backend service status
  const [realServiceStatus, setRealServiceStatus] = useState({
    overall: "CHECKING",
    version: "unknown",
    apis: {},
    uptime: "unknown",
    error: null,
  });

  // Market context - real data only
  const [marketContext, setMarketContext] = useState({
    volatility: "NORMAL",
    trend: "NEUTRAL",
    breadth: "MIXED",
    spyChange: 0,
    vix: 20,
    lastUpdate: new Date(),
    dataSource: "LOADING",
  });

  // Watchlist - persisted in localStorage
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem("institutionalWatchlist");
      const parsed = saved ? JSON.parse(saved) : [];
      console.log("📋 Loaded watchlist:", parsed.length, "items");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("⚠️ Invalid watchlist data, starting fresh");
      return [];
    }
  });

  // ============================================
  // DERIVED STATE (PERFORMANCE OPTIMIZED)
  // ============================================

  const dashboardMetrics = useMemo(() => {
    if (!Array.isArray(screeningResults) || screeningResults.length === 0) {
      return {
        total: 0,
        bullish: 0,
        bearish: 0,
        highConfidence: 0,
        activeSignals: 0,
        avgNissScore: 0,
      };
    }

    const total = screeningResults.length;
    const bullish = screeningResults.filter((stock) => {
      const change = stock.changePercent || stock.change || 0;
      return change > 0;
    }).length;

    const bearish = screeningResults.filter((stock) => {
      const change = stock.changePercent || stock.change || 0;
      return change < 0;
    }).length;

    const highConfidence = screeningResults.filter(
      (stock) => stock.confidence === "HIGH"
    ).length;

    const activeSignals = screeningResults.filter(
      (stock) => (stock.nissScore || 0) >= 6
    ).length;

    const avgNissScore =
      total > 0
        ? screeningResults.reduce(
            (sum, stock) => sum + Math.abs(stock.nissScore || 0),
            0
          ) / total
        : 0;

    return {
      total,
      bullish,
      bearish,
      highConfidence,
      activeSignals,
      avgNissScore,
    };
  }, [screeningResults]);

  // ============================================
  // FIXED DATA LOADING FUNCTION
  // ============================================

  const loadRealData = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (loadingRef.current) {
      console.log("⏭️ Already loading, skipping duplicate request");
      return;
    }

    // Prevent multiple initial loads
    if (initialLoadDone.current) {
      console.log("⏭️ Initial load already completed, skipping");
      return;
    }

    console.log("📊 Loading real data from backend...");

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Step 1: Check backend health
      console.log("🔍 Checking backend health...");
      const healthStatus = await InstitutionalDataService.getHealthReport();
      setRealServiceStatus(healthStatus);

      if (healthStatus.overall !== "HEALTHY") {
        throw new Error(
          `Backend service is ${healthStatus.overall}: ${
            healthStatus.error || "API unavailable"
          }`
        );
      }

      console.log("✅ Backend health check passed");

      // Step 2: Load market context
      console.log("📈 Loading market context...");
      const realMarketContext =
        await InstitutionalDataService.getMarketContext();
      setMarketContext(realMarketContext);
      console.log("✅ Market context loaded");

      // Step 3: Perform stock screening - FIXED DATA EXTRACTION
      console.log("🔍 Starting stock screening...");
      const realScreeningResults =
        await InstitutionalDataService.screenAllStocks({
          nissThreshold: 0,
          minConfidence: "LOW",
          maxResults: 50,
        });

      console.log(`✅ Real data loaded: ${realScreeningResults.length} stocks`);

      // CRITICAL FIX: Validate data before setting state
      if (
        Array.isArray(realScreeningResults) &&
        realScreeningResults.length > 0
      ) {
        setScreeningResults(realScreeningResults);
        console.log(
          `📊 State updated with ${realScreeningResults.length} stocks`
        );

        // Log sample data for debugging
        console.log("🔍 Sample stock data:", realScreeningResults.slice(0, 2));
      } else {
        console.warn("⚠️ No valid stocks returned from backend");
        setScreeningResults([]);
        setError(
          "No stock data available from backend. Please check API connections."
        );
      }

      // Mark initial load as complete
      initialLoadDone.current = true;
    } catch (error) {
      console.error("❌ Failed to load REAL data:", error.message);
      setError(`Unable to load real market data: ${error.message}`);
      setScreeningResults([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []); // No dependencies to prevent infinite loops

  // ============================================
  // COMPONENT LIFECYCLE EFFECTS
  // ============================================

  // Mount effect - load data once on component mount
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      console.log("🎬 Component mounted, starting initial data load");
      loadRealData();
    }

    // Cleanup on unmount
    return () => {
      console.log("🧹 Component unmounting, cleaning up refs");
      loadingRef.current = false;
      mountedRef.current = false;
    };
  }, []); // Only run on mount/unmount

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
        // Remove from watchlist
        newWatchlist = prevWatchlist.filter(
          (item) => item.symbol !== stock.symbol
        );
        console.log(`➖ Removed ${stock.symbol} from watchlist`);
      } else {
        // Add to watchlist
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
  // RENDER UTILITIES
  // ============================================

  const renderCurrentTab = () => {
    const commonProps = {
      screeningResults, // FIXED: Pass correct prop name
      selectedStock,
      onSelectStock: setSelectedStock,
      watchlist,
      onToggleWatchlist: toggleWatchlist,
      loading,
      error,
      marketContext,
      realServiceStatus,
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

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Component */}
      <HeaderComponent
        summaryStats={dashboardMetrics} // FIXED: Changed from dashboardMetrics to summaryStats
        serviceStatus={{
          backendHealth: realServiceStatus.overall === "HEALTHY",
          version: realServiceStatus.version,
          totalSymbols: screeningResults.length,
          cacheSize: 0,
        }}
        marketContext={marketContext}
        onRefresh={() => {
          console.log("🔄 Manual refresh requested");
          initialLoadDone.current = false; // Reset to allow reload
          loadRealData();
        }}
        loading={loading}
        onSettingsChange={() => {}} // Add empty handler
        onExport={() => {
          // Export functionality
          const dataStr = JSON.stringify(screeningResults, null, 2);
          const dataBlob = new Blob([dataStr], { type: "application/json" });
          const url = URL.createObjectURL(dataBlob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `screening-results-${
            new Date().toISOString().split("T")[0]
          }.json`;
          link.click();
          URL.revokeObjectURL(url);
        }}
      />

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Navigation */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          summaryStats={dashboardMetrics} // FIXED: Changed from dashboardMetrics to summaryStats
          loading={loading}
        />

        {/* Global Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h3 className="text-red-800 font-medium">Error Loading Data</h3>
            </div>
            <p className="text-red-700 mt-2">{error}</p>
            <button
              onClick={() => {
                setError(null);
                initialLoadDone.current = false;
                loadRealData();
              }}
              className="mt-3 flex items-center space-x-1 text-red-600 hover:text-red-800"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Debug Panel (Development Only) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-blue-800 font-medium mb-2">Debug Info</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Backend Status: {realServiceStatus.overall}</p>
              <p>• Backend Version: {realServiceStatus.version}</p>
              <p>• Screening Results: {screeningResults.length} stocks</p>
              <p>• Market Context: {marketContext.dataSource}</p>
              <p>• Loading State: {loading ? "Active" : "Idle"}</p>
              <p>
                • Initial Load Done: {initialLoadDone.current ? "Yes" : "No"}
              </p>
            </div>
          </div>
        )}

        {/* Active Tab Content */}
        <div className="space-y-6">{renderCurrentTab()}</div>

        {/* Footer Actions */}
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                initialLoadDone.current = false;
                loadRealData();
              }}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span>Refresh Data</span>
            </button>

            {screeningResults.length > 0 && (
              <button
                onClick={() => {
                  // Export functionality
                  const dataStr = JSON.stringify(screeningResults, null, 2);
                  const dataBlob = new Blob([dataStr], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `screening-results-${
                    new Date().toISOString().split("T")[0]
                  }.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                <Download className="w-4 h-4" />
                <span>Export Data</span>
              </button>
            )}
          </div>

          <div className="text-sm text-gray-500">
            Last updated:{" "}
            {marketContext.lastUpdate
              ? new Date(marketContext.lastUpdate).toLocaleTimeString()
              : "Never"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsImpactScreener;
