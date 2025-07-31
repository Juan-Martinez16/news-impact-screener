// src/components/NewsImpactScreener.js - REAL DATA ONLY
// NO MOCK DATA - All data fetched from real APIs through backend service

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
  console.log("🚀 NewsImpactScreener v3.2.0 - REAL DATA ONLY");

  // ============================================
  // CORE STATE MANAGEMENT (OPTIMIZED)
  // ============================================

  const [activeTab, setActiveTab] = useState("screener");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [screeningResults, setScreeningResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);

  // Market context - real data only
  const [marketContext, setMarketContext] = useState({
    volatility: "NORMAL",
    trend: "NEUTRAL",
    breadth: "MIXED",
    spyChange: 0,
    vix: 20,
    lastUpdate: new Date(),
    dataSource: "REAL",
  });

  // Watchlist - persisted in localStorage
  const [watchlist, setWatchlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("institutionalWatchlist") || "[]");
    } catch {
      return [];
    }
  });

  // UI state
  const [refreshing, setRefreshing] = useState(false);
  const [exportInProgress, setExportInProgress] = useState(false);

  // Service status - real backend only
  const [realServiceStatus, setRealServiceStatus] = useState({
    backendHealth: false,
    version: "3.2.0",
    cacheSize: 0,
    dataSource: "REAL_ONLY",
    lastHealthCheck: null,
  });

  // Filtering and search state (simplified)
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

  // ============================================
  // COMPUTED VALUES (OPTIMIZED - NO FUNCTION DEPENDENCIES)
  // ============================================

  // Available sectors - static list
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
  // REAL DATA LOADING FUNCTIONS
  // ============================================

  // Load real data - NO MOCK FALLBACKS
  const loadRealData = useCallback(async () => {
    console.log("📊 Loading REAL data from backend APIs...");

    if (loading) {
      console.log("⏭️ Already loading, skipping...");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check backend health first
      const healthStatus = await InstitutionalDataService.getHealthReport();
      setRealServiceStatus(healthStatus);

      if (healthStatus.overall !== "HEALTHY") {
        throw new Error(
          `Backend service is ${healthStatus.overall}: ${
            healthStatus.error || "API unavailable"
          }`
        );
      }

      // Load real market context
      const realMarketContext =
        await InstitutionalDataService.getMarketContext();
      setMarketContext(realMarketContext);

      // Perform real stock screening
      const realScreeningResults =
        await InstitutionalDataService.screenAllStocks({
          nissThreshold: 0, // Get all stocks
          minConfidence: "LOW", // Include all confidence levels
          maxResults: 50, // Start with 50, will expand to 200+
        });

      console.log(`✅ Real data loaded: ${realScreeningResults.length} stocks`);
      setScreeningResults(realScreeningResults);
    } catch (error) {
      console.error("❌ Failed to load REAL data:", error.message);
      setError(`Unable to load real market data: ${error.message}`);

      // Don't fallback to mock data - show user the real error
      setScreeningResults([]);
    } finally {
      setLoading(false);
    }
  }, [loading]); // MINIMAL DEPENDENCIES

  // Refresh real data - NO MOCK FALLBACKS
  const handleRefreshData = useCallback(async () => {
    console.log("🔄 Refreshing REAL data...");

    if (loading || refreshing) {
      console.log("⏭️ Already refreshing, skipping...");
      return;
    }

    setRefreshing(true);
    setError(null);

    try {
      // Clear cache and reload
      InstitutionalDataService.clearCache();
      await loadRealData();

      console.log("✅ Real data refresh complete");
    } catch (error) {
      console.error("❌ Refresh failed:", error.message);
      setError(`Refresh failed: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  }, [loading, refreshing, loadRealData]);

  // ============================================
  // EVENT HANDLERS (STABLE - NO DEPENDENCIES)
  // ============================================

  const handleWatchlistToggle = useCallback((symbol) => {
    console.log(`⭐ Watchlist toggle: ${symbol}`);

    setWatchlist((prev) => {
      const isInWatchlist = prev.includes(symbol);
      const newWatchlist = isInWatchlist
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol];

      // Persist to localStorage
      try {
        localStorage.setItem(
          "institutionalWatchlist",
          JSON.stringify(newWatchlist)
        );
      } catch (error) {
        console.warn("Failed to save watchlist:", error);
      }

      return newWatchlist;
    });
  }, []); // NO DEPENDENCIES

  const handleStockSelect = useCallback((stock) => {
    console.log(`📊 Stock selected: ${stock.symbol}`);
    setSelectedStock(stock);
  }, []); // NO DEPENDENCIES

  const handleSettingsChange = useCallback((newSettings) => {
    console.log("⚙️ Settings updated:", newSettings);
    // Handle settings changes
  }, []); // NO DEPENDENCIES

  const handleExportData = useCallback(
    (format) => {
      console.log(`📥 Exporting data in ${format} format...`);
      setExportInProgress(true);

      setTimeout(() => {
        try {
          if (format === "csv") {
            // Export screening results as CSV
            const csvData = screeningResults.map((stock) => ({
              Symbol: stock.symbol,
              Company: stock.company,
              Price: stock.currentPrice,
              "NISS Score": stock.nissScore,
              Confidence: stock.confidence,
              Sector: stock.sector,
              "Market Cap": stock.marketCap,
              "Data Source": stock.dataSource || "REAL",
            }));

            const csvContent = [
              Object.keys(csvData[0]).join(","),
              ...csvData.map((row) => Object.values(row).join(",")),
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `news-impact-screener-${
              new Date().toISOString().split("T")[0]
            }.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
          }

          console.log("✅ Export completed");
        } catch (error) {
          console.error("❌ Export failed:", error);
          setError(`Export failed: ${error.message}`);
        } finally {
          setExportInProgress(false);
        }
      }, 1000);
    },
    [screeningResults]
  ); // ONLY depends on screeningResults

  // ============================================
  // EFFECTS (MINIMAL DEPENDENCIES)
  // ============================================

  // Initial load effect - runs once
  useEffect(() => {
    console.log("🎬 Initial load effect triggered");
    loadRealData();
  }, []); // NO DEPENDENCIES - runs once only

  // Auto-refresh effect - stable interval
  useEffect(() => {
    const autoRefreshInterval = 300000; // 5 minutes

    const intervalId = setInterval(() => {
      if (!loading && !refreshing) {
        console.log("⏰ Auto-refresh triggered");
        handleRefreshData();
      }
    }, autoRefreshInterval);

    return () => {
      clearInterval(intervalId);
      console.log("🧹 Auto-refresh interval cleared");
    };
  }, [loading, refreshing, handleRefreshData]);

  // ============================================
  // MEMOIZED VALUES FOR PROPS (STABLE)
  // ============================================

  const memoizedServiceStatus = useMemo(
    () => ({
      backendHealth: realServiceStatus.backendHealth,
      version: realServiceStatus.version,
      cacheSize: realServiceStatus.cacheSize,
      dataSource: realServiceStatus.dataSource,
    }),
    [
      realServiceStatus.backendHealth,
      realServiceStatus.version,
      realServiceStatus.cacheSize,
      realServiceStatus.dataSource,
    ]
  );

  const memoizedMarketRegime = useMemo(
    () => ({
      volatility: marketContext.volatility,
      trend: marketContext.trend,
      breadth: marketContext.breadth,
      spyChange: marketContext.spyChange,
      vix: marketContext.vix,
      dataSource: marketContext.dataSource,
    }),
    [
      marketContext.volatility,
      marketContext.trend,
      marketContext.breadth,
      marketContext.spyChange,
      marketContext.vix,
      marketContext.dataSource,
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
                  Real Data Error
                </h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <div className="mt-2">
                  <button
                    onClick={() => setError(null)}
                    className="text-red-600 hover:text-red-500 text-sm underline"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={handleRefreshData}
                    className="ml-4 text-red-600 hover:text-red-500 text-sm underline"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Navigation */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          resultsCount={screeningResults.length}
          loadingState={loading || refreshing}
        />

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "screener" && (
            <StockScreener
              stockData={screeningResults}
              loading={loading || refreshing}
              error={error}
              onStockSelect={handleStockSelect}
              onWatchlistToggle={handleWatchlistToggle}
              watchlist={watchlist}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filters={filters}
              onFiltersChange={setFilters}
              sortBy={sortBy}
              onSortChange={setSortBy}
              sortDirection={sortDirection}
              onSortDirectionChange={setSortDirection}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              resultsPerPage={resultsPerPage}
              onResultsPerPageChange={setResultsPerPage}
              availableSectors={availableSectors}
              marketContext={marketContext}
            />
          )}

          {activeTab === "catalyst" && (
            <CatalystAnalysisTab
              stockData={screeningResults}
              loading={loading || refreshing}
              error={error}
              onStockSelect={handleStockSelect}
              watchlist={watchlist}
              onWatchlistToggle={handleWatchlistToggle}
              marketContext={marketContext}
            />
          )}

          {activeTab === "performance" && (
            <PerformanceTrackingTab
              historicalPerformance={[]} // Will populate with real historical data
              stockData={screeningResults}
              loading={loading || refreshing}
              error={error}
              marketContext={marketContext}
            />
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {(loading || refreshing) && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-4">
            <div className="flex items-center">
              <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mr-3" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {loading ? "Loading Real Data..." : "Refreshing..."}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Fetching data from real APIs...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Progress */}
      {exportInProgress && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-center">
            <Download className="h-5 w-5 text-green-600 animate-pulse mr-3" />
            <span className="text-sm font-medium text-gray-900">
              Exporting data...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsImpactScreener;
