// src/components/NewsImpactScreener.js - EMERGENCY LOOP FIX
// Fixed useEffect dependencies causing infinite loops

import React, { useState, useEffect, useCallback, useMemo } from "react";

// Lucide icons
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Bell,
  Activity,
  AlertCircle,
  Info,
  Shield,
  Target,
  BarChart3,
  Filter,
  Download,
  Eye,
} from "lucide-react";

// Import existing tab components
import StockScreener from "./StockScreener";
import CatalystAnalysisTab from "./CatalystAnalysisTab";
import PerformanceTrackingTab from "./PerformanceTrackingTab";

// Import Phase 1 engines
import NISSCalculationEngine from "../engine/NISSCalculationEngine";
import InstitutionalDataService from "../api/InstitutionalDataService";
import dataNormalizer from "../utils/DataNormalizer";

// Import Phase 2 modular components
import HeaderComponent from "./enhanced/HeaderComponent";
import TabNavigation from "./enhanced/TabNavigation";

const NewsImpactScreener = () => {
  console.log("🚀 NewsImpactScreener v3.1.5 - LOOP FIX");

  // ============================================
  // CORE STATE MANAGEMENT
  // ============================================

  const [activeTab, setActiveTab] = useState("screener");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [screeningResults, setScreeningResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);

  // Market context - stable initial state
  const [marketContext, setMarketContext] = useState({
    volatility: "NORMAL",
    trend: "NEUTRAL",
    breadth: "MIXED",
    spyChange: 0,
    vix: 20,
    lastUpdate: new Date(),
  });

  const [watchlist, setWatchlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("institutionalWatchlist") || "[]");
    } catch {
      return [];
    }
  });

  const [refreshInterval, setRefreshInterval] = useState(300000); // Static - no localStorage in useState

  // Filtering and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    nissRange: "all",
    confidence: "all",
    marketCap: "all",
    sector: "all",
    volume: "all",
    timeframe: "24h",
  });

  // Sorting state
  const [sortBy, setSortBy] = useState("nissScore");
  const [sortDirection, setSortDirection] = useState("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(25);

  // UI state
  const [refreshing, setRefreshing] = useState(false);
  const [exportInProgress, setExportInProgress] = useState(false);

  // Service status - initialized once
  const [realServiceStatus, setRealServiceStatus] = useState({
    backendHealth: false,
    version: "3.1.5",
    cacheSize: 0,
    lastHealthCheck: null,
  });

  // ============================================
  // STABLE COMPUTED VALUES (No function dependencies)
  // ============================================

  // Available sectors - static list (not computed from results)
  const availableSectors = useMemo(() => {
    return [
      "Technology",
      "Healthcare",
      "Financial Services",
      "Consumer Discretionary",
      "Communication Services",
      "Industrials",
      "Consumer Staples",
      "Energy",
      "Utilities",
      "Real Estate",
      "Materials",
    ];
  }, []); // STATIC - no dependencies

  // Summary stats - only depends on screeningResults
  const summaryStats = useMemo(() => {
    if (!screeningResults.length) {
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
    const bullish = screeningResults.filter(
      (stock) => (stock.nissScore || 0) > 0
    ).length;
    const bearish = screeningResults.filter(
      (stock) => (stock.nissScore || 0) < 0
    ).length;
    const highConfidence = screeningResults.filter(
      (stock) => stock.confidence === "HIGH"
    ).length;
    const activeSignals = screeningResults.filter(
      (stock) => Math.abs(stock.nissScore || 0) >= 60
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
  }, [screeningResults]); // ONLY screeningResults

  // ============================================
  // STABLE EVENT HANDLERS (NO CIRCULAR DEPENDENCIES)
  // ============================================

  // Generate mock data - STABLE FUNCTION
  const generateMockData = useCallback(() => {
    console.log("🎭 Generating mock data...");

    const symbols = [
      "AAPL",
      "MSFT",
      "GOOGL",
      "AMZN",
      "TSLA",
      "NVDA",
      "META",
      "NFLX",
    ];

    return symbols.map((symbol, index) => {
      const basePrice = 50 + Math.random() * 200;
      const nissScore = (Math.random() - 0.3) * 200; // Slight bullish bias

      return {
        symbol,
        company: `${symbol} Inc.`,
        currentPrice: basePrice,
        nissScore,
        confidence: ["HIGH", "MEDIUM", "LOW"][Math.floor(Math.random() * 3)],
        sector:
          availableSectors[Math.floor(Math.random() * availableSectors.length)],
        marketCap: (1 + Math.random() * 500) * 1e9,
        priceData: {
          change: (Math.random() - 0.5) * 10,
          changePercent: (Math.random() - 0.5) * 5,
          volume: Math.floor(1000000 + Math.random() * 50000000),
        },
        volumeData: {
          relativeVolume: 0.5 + Math.random() * 3,
          volume: Math.floor(1000000 + Math.random() * 50000000),
        },
        technicalData: {
          atr: basePrice * 0.025,
          rsi: 30 + Math.random() * 40,
        },
        latestNews: {
          headline: `Breaking news for ${symbol}`,
          timestamp: new Date().toISOString(),
          source: "Mock News",
        },
        nissComponents: {
          newsImpact: (Math.random() - 0.5) * 40,
          volumeAnalysis: (Math.random() - 0.5) * 30,
          optionsFlow: (Math.random() - 0.5) * 25,
          priceAction: (Math.random() - 0.5) * 35,
          momentum: (Math.random() - 0.5) * 30,
          relativeStrength: (Math.random() - 0.5) * 25,
        },
        lastUpdate: new Date().toISOString(),
      };
    });
  }, [availableSectors]); // ONLY depends on availableSectors

  // Initial load - STABLE FUNCTION, NO LOOP-CAUSING DEPENDENCIES
  const handleInitialLoad = useCallback(() => {
    console.log("📊 Initial load starting...");

    if (loading) {
      console.log("⏭️ Already loading, skipping...");
      return;
    }

    setLoading(true);
    setError(null);

    // Use setTimeout to prevent blocking and allow for cleanup
    const timeoutId = setTimeout(() => {
      try {
        const mockData = generateMockData();
        console.log(`✅ Mock data generated: ${mockData.length} stocks`);
        setScreeningResults(mockData);
      } catch (error) {
        console.error("❌ Initial load failed:", error);
        setError(`Failed to load data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, 100);

    // Cleanup function
    return () => clearTimeout(timeoutId);
  }, [loading, generateMockData]); // MINIMAL DEPENDENCIES

  // Refresh data - STABLE FUNCTION
  const handleRefreshData = useCallback(() => {
    console.log("🔄 Refresh starting...");

    if (loading || refreshing) {
      console.log("⏭️ Already refreshing, skipping...");
      return;
    }

    setRefreshing(true);
    setError(null);

    const timeoutId = setTimeout(() => {
      try {
        const refreshedData = generateMockData();
        console.log(`✅ Data refreshed: ${refreshedData.length} stocks`);
        setScreeningResults(refreshedData);
      } catch (error) {
        console.error("❌ Refresh failed:", error);
        setError(`Refresh failed: ${error.message}`);
      } finally {
        setRefreshing(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [loading, refreshing, generateMockData]); // MINIMAL DEPENDENCIES

  // Other handlers - ALL WITH EMPTY DEPENDENCIES TO PREVENT LOOPS
  const handleWatchlistToggle = useCallback((symbol) => {
    console.log(`⭐ Watchlist toggle: ${symbol}`);

    setWatchlist((prev) => {
      const isInWatchlist = prev.includes(symbol);
      const newWatchlist = isInWatchlist
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol];

      try {
        localStorage.setItem(
          "institutionalWatchlist",
          JSON.stringify(newWatchlist)
        );
      } catch (error) {
        console.error("Watchlist save failed:", error);
      }

      return newWatchlist;
    });
  }, []); // NO DEPENDENCIES

  const handleStockSelection = useCallback((stock) => {
    console.log(`🎯 Stock selected: ${stock?.symbol || "none"}`);
    setSelectedStock(stock);
  }, []); // NO DEPENDENCIES

  const handleExportData = useCallback(
    (format = "csv") => {
      console.log(`📁 Export: ${format}`);

      if (screeningResults.length === 0) {
        setError("No data to export");
        return;
      }

      setExportInProgress(true);

      setTimeout(() => {
        try {
          const exportData = screeningResults.map((stock) => ({
            Symbol: stock.symbol,
            Company: stock.company,
            Price: stock.currentPrice?.toFixed(2),
            "NISS Score": stock.nissScore?.toFixed(2),
            Confidence: stock.confidence,
            Sector: stock.sector,
          }));

          const csvContent = [
            Object.keys(exportData[0]).join(","),
            ...exportData.map((row) => Object.values(row).join(",")),
          ].join("\n");

          const blob = new Blob([csvContent], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `niss-data-${Date.now()}.csv`;
          link.click();
          URL.revokeObjectURL(url);

          console.log("✅ Export completed");
        } catch (error) {
          console.error("❌ Export failed:", error);
          setError("Export failed");
        } finally {
          setExportInProgress(false);
        }
      }, 100);
    },
    [screeningResults]
  ); // ONLY depends on screeningResults

  const handleSettingsChange = useCallback((setting, value) => {
    console.log(`⚙️ Settings: ${setting} = ${value}`);

    switch (setting) {
      case "refreshInterval":
        setRefreshInterval(parseInt(value));
        break;
      case "resultsPerPage":
        setResultsPerPage(parseInt(value));
        setCurrentPage(1);
        break;
      default:
        console.warn(`Unknown setting: ${setting}`);
    }
  }, []); // NO DEPENDENCIES

  const handleTabChange = useCallback((newTab) => {
    console.log(`🔄 Tab change: ${newTab}`);
    setActiveTab(newTab);
    setSelectedStock(null);
    setError(null);
  }, []); // NO DEPENDENCIES

  const handleClearError = useCallback(() => {
    console.log("🧹 Error cleared");
    setError(null);
  }, []); // NO DEPENDENCIES

  // Search handler
  const handleSearchChange = useCallback((newQuery) => {
    console.log(`🔍 Search: ${newQuery}`);
    setSearchQuery(newQuery);
    setCurrentPage(1);
  }, []); // NO DEPENDENCIES

  // Filter handler
  const handleFiltersChange = useCallback((newFilters) => {
    console.log("🔧 Filters changed:", newFilters);
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  }, []); // NO DEPENDENCIES

  // Sort handlers
  const handleSortChange = useCallback(
    (newSortBy) => {
      console.log(`📊 Sort: ${newSortBy}`);
      const newDirection =
        sortBy === newSortBy && sortDirection === "desc" ? "asc" : "desc";
      setSortBy(newSortBy);
      setSortDirection(newDirection);
      setCurrentPage(1);
    },
    [sortBy, sortDirection]
  ); // MINIMAL DEPENDENCIES

  const handleSortDirectionChange = useCallback((newDirection) => {
    console.log(`🔄 Sort direction: ${newDirection}`);
    setSortDirection(newDirection);
  }, []); // NO DEPENDENCIES

  // ============================================
  // FIXED EFFECTS (No circular dependencies)
  // ============================================

  // FIXED: Main initialization - ONLY runs once on mount
  useEffect(() => {
    console.log("📊 NewsImpactScreener initializing...");
    handleInitialLoad();
  }, []); // EMPTY DEPENDENCIES - only run once

  // FIXED: Auto-refresh - separate effect with stable dependencies
  useEffect(() => {
    if (refreshInterval <= 0) return;

    console.log(`⏰ Setting up auto-refresh: ${refreshInterval}ms`);

    const intervalId = setInterval(() => {
      console.log("🔄 Auto-refresh tick");
      handleRefreshData();
    }, refreshInterval);

    return () => {
      console.log("🛑 Clearing auto-refresh interval");
      clearInterval(intervalId);
    };
  }, [refreshInterval]); // ONLY depends on refreshInterval

  // ============================================
  // MEMOIZED PROPS (Prevent child re-renders)
  // ============================================

  const memoizedMarketRegime = useMemo(
    () => ({
      trend: marketContext.trend,
      volatility: marketContext.volatility,
      vix: marketContext.vix,
      breadth: marketContext.breadth,
      spyChange: marketContext.spyChange,
    }),
    [
      marketContext.trend,
      marketContext.volatility,
      marketContext.vix,
      marketContext.breadth,
      marketContext.spyChange,
    ]
  );

  const memoizedServiceStatus = useMemo(
    () => ({
      backendHealth: realServiceStatus.backendHealth,
      version: realServiceStatus.version,
      cacheSize: realServiceStatus.cacheSize,
    }),
    [
      realServiceStatus.backendHealth,
      realServiceStatus.version,
      realServiceStatus.cacheSize,
    ]
  );

  const memoizedSummaryStats = useMemo(
    () => ({
      total: summaryStats.total,
      bullish: summaryStats.bullish,
      bearish: summaryStats.bearish,
      highConfidence: summaryStats.highConfidence,
      activeSignals: summaryStats.activeSignals,
      avgNissScore: summaryStats.avgNissScore,
    }),
    [
      summaryStats.total,
      summaryStats.bullish,
      summaryStats.bearish,
      summaryStats.highConfidence,
      summaryStats.activeSignals,
      summaryStats.avgNissScore,
    ]
  );

  // ============================================
  // RENDER METHOD
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Component */}
      <HeaderComponent
        serviceStatus={memoizedServiceStatus}
        marketContext={memoizedMarketRegime}
        summaryStats={memoizedSummaryStats}
        loading={loading}
        onRefresh={handleRefreshData}
        onSettingsChange={handleSettingsChange}
        onExport={() => handleExportData("csv")}
      />

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md shadow-sm">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Error Occurred
                </h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={handleClearError}
                className="text-red-700 text-sm underline hover:text-red-800 transition-colors ml-4"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Navigation */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
          summaryStats={memoizedSummaryStats}
          loading={loading}
        />

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "screener" && (
            <StockScreener
              // Core data
              stocks={screeningResults}
              totalResults={screeningResults.length}
              selectedStock={selectedStock}
              watchlist={watchlist}
              // State - ALL REAL HANDLERS
              loading={loading}
              searchQuery={searchQuery}
              setSearchQuery={handleSearchChange}
              filters={filters}
              setFilters={handleFiltersChange}
              sortBy={sortBy}
              setSortBy={handleSortChange}
              sortDirection={sortDirection}
              setSortDirection={handleSortDirectionChange}
              // Actions
              onRefresh={handleRefreshData}
              onWatchlistToggle={handleWatchlistToggle}
              onExportData={handleExportData}
              setSelectedStock={handleStockSelection}
              // Status
              marketRegime={memoizedMarketRegime}
              backendHealth={realServiceStatus.backendHealth}
              serviceStatus={memoizedServiceStatus}
              connectionStatus={
                realServiceStatus.backendHealth ? "connected" : "disconnected"
              }
              refreshing={refreshing}
              exportInProgress={exportInProgress}
              // Additional data
              availableSectors={availableSectors}
              summaryStats={memoizedSummaryStats}
              // Pagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={Math.ceil(screeningResults.length / resultsPerPage)}
              resultsPerPage={resultsPerPage}
            />
          )}

          {activeTab === "catalyst" && (
            <CatalystAnalysisTab
              stocks={screeningResults}
              selectedStock={selectedStock}
              setSelectedStock={handleStockSelection}
              loading={loading}
              error={error}
              marketRegime={memoizedMarketRegime}
              backendHealth={realServiceStatus.backendHealth}
              serviceStatus={memoizedServiceStatus}
              connectionStatus={
                realServiceStatus.backendHealth ? "connected" : "disconnected"
              }
              alerts={[]}
              onAnalyzeStock={() => {}}
              onWatchlistToggle={handleWatchlistToggle}
            />
          )}

          {activeTab === "performance" && (
            <PerformanceTrackingTab
              historicalPerformance={[]}
              stockData={{}}
              loading={loading}
              error={error}
              marketRegime={memoizedMarketRegime}
              onWatchlistToggle={handleWatchlistToggle}
              onAnalyzeStock={() => {}}
              onExport={handleExportData}
              backendHealth={realServiceStatus.backendHealth}
              serviceStatus={memoizedServiceStatus}
              connectionStatus={
                realServiceStatus.backendHealth ? "connected" : "disconnected"
              }
              watchlist={watchlist}
              summaryStats={memoizedSummaryStats}
            />
          )}
        </div>
      </div>

      {/* Debug Panel - STABLE */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-3 rounded-lg text-xs max-w-sm z-50 shadow-lg">
          <div className="font-semibold mb-2 text-green-400">
            🛠️ Debug v3.1.5 (LOOP FIXED)
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <div>Results:</div>
              <div className="text-yellow-400">{screeningResults.length}</div>

              <div>Tab:</div>
              <div className="text-purple-400">{activeTab}</div>

              <div>Search:</div>
              <div className="text-orange-400">{searchQuery || "None"}</div>

              <div>Loading:</div>
              <div className={loading ? "text-yellow-400" : "text-green-400"}>
                {loading ? "Yes" : "No"}
              </div>

              <div>Renders:</div>
              <div className="text-blue-400">{window.renderCount || 0}</div>

              <div>Refreshing:</div>
              <div
                className={refreshing ? "text-yellow-400" : "text-green-400"}
              >
                {refreshing ? "Yes" : "No"}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-700 space-y-1">
            <button
              onClick={() => (window.renderCount = 0)}
              className="block w-full text-left text-blue-300 text-xs hover:text-blue-200"
            >
              🔄 Reset Render Count
            </button>
            <button
              onClick={() =>
                console.log("State:", {
                  activeTab,
                  loading,
                  error,
                  resultsCount: screeningResults.length,
                })
              }
              className="block w-full text-left text-green-300 text-xs hover:text-green-200"
            >
              📊 Log State
            </button>
          </div>

          {/* Loop warning */}
          {window.renderCount > 30 && (
            <div className="mt-2 pt-2 border-t border-red-600 text-red-300 text-xs">
              ⚠️ LOOP DETECTED: {window.renderCount} renders
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NewsImpactScreener;
