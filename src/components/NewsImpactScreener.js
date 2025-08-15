// src/components/NewsImpactScreener.js - COMPLETE FIXED VERSION
// This is the complete file - replace your entire NewsImpactScreener.js with this

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";

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
  console.log("🚀 NewsImpactScreener v4.0.0-production starting...");

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
      const saved = localStorage.getItem("institutionalWatchlist");
      const parsed = saved ? JSON.parse(saved) : [];
      console.log(`💾 Watchlist saved: ${parsed.length} items`);
      return parsed;
    } catch {
      console.log("💾 Watchlist saved: 0 items");
      return [];
    }
  });

  // UI state
  const [refreshing, setRefreshing] = useState(false);
  const [exportInProgress, setExportInProgress] = useState(false);

  // Service status - real backend only
  const [realServiceStatus, setRealServiceStatus] = useState({
    backendHealth: false,
    version: "4.0.0-production",
    cacheSize: 0,
    dataSource: "REAL_ONLY",
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
  // COMPUTED VALUES (STABLE)
  // ============================================

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
  }, []);

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

      // Step 3: Perform stock screening
      console.log("🔍 Starting stock screening...");
      const realScreeningResults =
        await InstitutionalDataService.screenAllStocks({
          nissThreshold: 0,
          minConfidence: "LOW",
          maxResults: 50,
        });

      console.log(`✅ Real data loaded: ${realScreeningResults.length} stocks`);
      setScreeningResults(realScreeningResults);

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
  // EVENT HANDLERS (STABLE)
  // ============================================

  const handleRefreshData = useCallback(async () => {
    if (loadingRef.current || refreshing) {
      console.log("⏭️ Already refreshing, skipping...");
      return;
    }

    console.log("🔄 Refreshing REAL data...");
    setRefreshing(true);
    setError(null);

    // Reset the initial load flag to allow refresh
    const wasInitialLoadDone = initialLoadDone.current;
    initialLoadDone.current = false;

    try {
      InstitutionalDataService.clearCache();
      await loadRealData();
      console.log("✅ Real data refresh complete");
    } catch (error) {
      console.error("❌ Refresh failed:", error.message);
      setError(`Refresh failed: ${error.message}`);
      // Restore the initial load flag if refresh failed
      initialLoadDone.current = wasInitialLoadDone;
    } finally {
      setRefreshing(false);
    }
  }, [loadRealData]);

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
        console.log(`💾 Watchlist saved: ${newWatchlist.length} items`);
      } catch (error) {
        console.error("❌ Failed to save watchlist:", error);
      }

      return newWatchlist;
    });
  }, []);

  const handleStockSelect = useCallback((stock) => {
    console.log(`📊 Stock selected: ${stock?.symbol}`);
    setSelectedStock(stock);
    setActiveTab("catalyst");
  }, []);

  const handleExportData = useCallback(
    async (format = "csv") => {
      if (!screeningResults.length) {
        setError("No data to export");
        return;
      }

      setExportInProgress(true);

      setTimeout(() => {
        try {
          const headers = [
            "Symbol",
            "Price",
            "Change %",
            "NISS Score",
            "Confidence",
            "Sector",
            "Market Cap",
            "Volume",
            "Data Source",
          ];

          const csvData = screeningResults.map((stock) => [
            stock.symbol,
            stock.currentPrice?.toFixed(2) || "N/A",
            stock.changePercent?.toFixed(2) || "0.00",
            stock.nissScore?.toFixed(1) || "0.0",
            stock.confidence || "LOW",
            stock.sector || "Unknown",
            stock.marketCap || "N/A",
            stock.volume || "N/A",
            stock.dataSource || "backend",
          ]);

          const csvContent = [headers, ...csvData]
            .map((row) => row.map((field) => `"${field}"`).join(","))
            .join("\n");

          const blob = new Blob([csvContent], { type: "text/csv" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `news-impact-screener-${
            new Date().toISOString().split("T")[0]
          }.csv`;
          a.click();
          window.URL.revokeObjectURL(url);

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
  );

  // ============================================
  // EFFECTS (FIXED - NO INFINITE LOOPS)
  // ============================================

  // Single mount effect - runs once when component mounts
  useEffect(() => {
    console.log("🎬 NewsImpactScreener mounted - starting initial data load");
    mountedRef.current = true;

    // Load data immediately on mount
    loadRealData();

    // Cleanup function
    return () => {
      console.log("🧹 NewsImpactScreener unmounting");
      mountedRef.current = false;
      loadingRef.current = false;
    };
  }, []); // Empty dependency array - runs once only

  // Auto-refresh effect with stable interval
  useEffect(() => {
    const autoRefreshInterval = 300000; // 5 minutes

    const intervalId = setInterval(() => {
      if (
        mountedRef.current &&
        !loadingRef.current &&
        !refreshing &&
        initialLoadDone.current
      ) {
        console.log("⏰ Auto-refresh triggered");
        handleRefreshData();
      }
    }, autoRefreshInterval);

    return () => {
      clearInterval(intervalId);
      console.log("🧹 Auto-refresh interval cleared");
    };
  }, [refreshing, handleRefreshData]); // Minimal dependencies

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

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <HeaderComponent
          summaryStats={summaryStats}
          serviceStatus={memoizedServiceStatus}
          onRefresh={handleRefreshData}
          onExport={handleExportData}
          loading={loading || refreshing}
          exportInProgress={exportInProgress}
        />

        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === "screener" && (
            <StockScreener
              stockData={screeningResults}
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
                  Fetching data from backend v4.0.0...
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
