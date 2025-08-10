// src/components/NewsImpactScreener.js - PRODUCTION READY VERSION
// Properly connects to backend and handles all loading states

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

// Import services
import InstitutionalDataService from "../api/InstitutionalDataService";

// Import enhanced components
import HeaderComponent from "./enhanced/HeaderComponent";
import TabNavigation from "./enhanced/TabNavigation";

const NewsImpactScreener = () => {
  console.log("🚀 NewsImpactScreener v4.0.0-production starting...");

  // ============================================
  // CORE STATE MANAGEMENT
  // ============================================

  const [activeTab, setActiveTab] = useState("screener");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [screeningResults, setScreeningResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);

  // Market context state
  const [marketContext, setMarketContext] = useState({
    volatility: "NORMAL",
    trend: "NEUTRAL",
    breadth: "MIXED",
    spyChange: 0,
    vix: 20,
    lastUpdate: new Date(),
    dataSource: "LOADING",
  });

  // Watchlist with localStorage persistence
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

  // Service status
  const [serviceStatus, setServiceStatus] = useState({
    backendHealth: false,
    version: "4.0.0-production",
    initialized: false,
    lastHealthCheck: null,
  });

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

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const availableSectors = useMemo(() => {
    const sectors = [
      ...new Set(screeningResults.map((stock) => stock.sector).filter(Boolean)),
    ];
    return sectors.sort();
  }, [screeningResults]);

  const filteredResults = useMemo(() => {
    let filtered = screeningResults;

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (stock.name &&
            stock.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply filters
    if (filters.confidence !== "all") {
      filtered = filtered.filter(
        (stock) => stock.confidence === filters.confidence
      );
    }

    if (filters.sector !== "all") {
      filtered = filtered.filter((stock) => stock.sector === filters.sector);
    }

    // Add more filters as needed

    return filtered;
  }, [screeningResults, searchQuery, filters]);

  // ============================================
  // MAIN DATA LOADING
  // ============================================

  const loadRealData = useCallback(async () => {
    console.log("📊 Loading real data from backend...");

    if (loading) {
      console.log("⏭️ Already loading, skipping duplicate request");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Test backend connection
      console.log("🔗 Testing backend connection...");
      const connectionTest = await InstitutionalDataService.testConnection();

      console.log("✅ Backend connection successful:", {
        version: connectionTest.health?.version,
        apis: Object.keys(connectionTest.health?.apis || {}).length,
      });

      setServiceStatus({
        backendHealth: true,
        version: connectionTest.health?.version || "4.0.0",
        initialized: true,
        lastHealthCheck: new Date(),
      });

      // Step 2: Load market context
      console.log("📊 Loading market context...");
      const realMarketContext =
        await InstitutionalDataService.getMarketContext();
      setMarketContext(realMarketContext);

      console.log("✅ Market context loaded:", {
        trend: realMarketContext.trend,
        volatility: realMarketContext.volatility,
        source: realMarketContext.dataSource,
      });

      // Step 3: Perform stock screening
      console.log("🔍 Starting stock screening...");
      const screeningStartTime = Date.now();

      const realScreeningResults =
        await InstitutionalDataService.screenAllStocks({
          nissThreshold: 0, // Get all stocks
          minConfidence: "LOW", // Include all confidence levels
          maxResults: 50, // Start with 50 stocks
        });

      const screeningEndTime = Date.now();
      const screeningTime = screeningEndTime - screeningStartTime;

      console.log("✅ Stock screening completed:", {
        stocksFound: realScreeningResults.length,
        processingTime: `${screeningTime}ms`,
        avgTimePerStock:
          realScreeningResults.length > 0
            ? `${Math.round(screeningTime / realScreeningResults.length)}ms`
            : "N/A",
      });

      // Validate screening results
      if (!Array.isArray(realScreeningResults)) {
        throw new Error("Invalid screening results format - expected array");
      }

      if (realScreeningResults.length === 0) {
        console.warn("⚠️ No stocks returned from screening");
      }

      setScreeningResults(realScreeningResults);

      console.log("🎉 All real data loaded successfully!");
    } catch (error) {
      console.error("❌ Failed to load real data:", error);

      setError(`Unable to load real market data: ${error.message}`);
      setServiceStatus((prev) => ({
        ...prev,
        backendHealth: false,
        lastHealthCheck: new Date(),
      }));

      // Don't fall back to mock data - show the real error
      setScreeningResults([]);
      setMarketContext((prev) => ({
        ...prev,
        dataSource: "ERROR",
        error: error.message,
      }));
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // ============================================
  // EFFECT HOOKS
  // ============================================

  // Initial data load
  useEffect(() => {
    console.log("🎬 NewsImpactScreener mounted - starting initial data load");
    loadRealData();
  }, []); // Empty dependency array - only run on mount

  // Watchlist persistence
  useEffect(() => {
    localStorage.setItem("institutionalWatchlist", JSON.stringify(watchlist));
    console.log(`💾 Watchlist saved: ${watchlist.length} items`);
  }, [watchlist]);

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleRefreshData = useCallback(async () => {
    console.log("🔄 Manual data refresh requested");

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
      console.log("✅ Data refresh completed successfully");
    } catch (error) {
      console.error("❌ Refresh failed:", error);
      setError(`Refresh failed: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  }, [loading, refreshing, loadRealData]);

  const handleWatchlistToggle = useCallback((symbol) => {
    console.log(`⭐ Watchlist toggle: ${symbol}`);

    setWatchlist((prev) => {
      const isInWatchlist = prev.includes(symbol);
      const newWatchlist = isInWatchlist
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol];

      console.log(
        `${isInWatchlist ? "➖" : "➕"} ${symbol} ${
          isInWatchlist ? "removed from" : "added to"
        } watchlist`
      );
      return newWatchlist;
    });
  }, []);

  const handleStockSelect = useCallback((stock) => {
    console.log(`👆 Stock selected: ${stock.symbol}`);
    setSelectedStock(stock);
  }, []);

  const handleExportData = useCallback(async () => {
    console.log("📤 Export data requested");
    setExportInProgress(true);

    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        marketContext: marketContext,
        stocks: filteredResults,
        filters: filters,
        summary: {
          totalStocks: screeningResults.length,
          filteredStocks: filteredResults.length,
          watchlistItems: watchlist.length,
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `news-impact-screening-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log("✅ Data exported successfully");
    } catch (error) {
      console.error("❌ Export failed:", error);
      setError(`Export failed: ${error.message}`);
    } finally {
      setExportInProgress(false);
    }
  }, [marketContext, filteredResults, filters, screeningResults, watchlist]);

  // ============================================
  // LOADING AND ERROR STATES
  // ============================================

  if (loading && screeningResults.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-4">
          <div className="flex items-center justify-center mb-6">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-4">
            Loading Real Market Data
          </h2>
          <p className="text-gray-600 text-center mb-4">
            Connecting to backend and fetching live stock data...
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
              Testing backend connection
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
              Loading market context
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
              Screening{" "}
              {process.env.REACT_APP_ENVIRONMENT === "production"
                ? "50"
                : "10"}{" "}
              stocks
            </div>
          </div>
          {serviceStatus.version && (
            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
              <span className="text-xs text-gray-400">
                Backend v{serviceStatus.version}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error && screeningResults.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-4">
          <div className="flex items-center justify-center mb-6">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-4">
            Connection Error
          </h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRefreshData}
              disabled={refreshing}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {refreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {refreshing ? "Retrying..." : "Try Again"}
            </button>
            <div className="text-xs text-gray-500 text-center space-y-1">
              <div>
                Backend:{" "}
                {serviceStatus.backendHealth ? "✅ Online" : "❌ Offline"}
              </div>
              <div>
                Environment:{" "}
                {process.env.REACT_APP_ENVIRONMENT || "development"}
              </div>
              <div>
                Backend URL:{" "}
                {process.env.REACT_APP_BACKEND_URL || "Not configured"}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <HeaderComponent
        marketContext={marketContext}
        serviceStatus={serviceStatus}
        onRefresh={handleRefreshData}
        onExport={handleExportData}
        refreshing={refreshing}
        exportInProgress={exportInProgress}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Navigation */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          stockCount={screeningResults.length}
        />

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Data Loading Issue
                </h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === "screener" && (
            <StockScreener
              stockData={filteredResults}
              loading={loading || refreshing}
              error={error}
              onStockSelect={handleStockSelect}
              selectedStock={selectedStock}
              watchlist={watchlist}
              onWatchlistToggle={handleWatchlistToggle}
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
              historicalPerformance={[]}
              stockData={screeningResults}
              loading={loading || refreshing}
              error={error}
              marketContext={marketContext}
            />
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {(loading || refreshing) && screeningResults.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-4">
            <div className="flex items-center">
              <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mr-3" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {loading ? "Loading Data..." : "Refreshing..."}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {loading
                    ? "Fetching real market data..."
                    : "Updating stock information..."}
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
