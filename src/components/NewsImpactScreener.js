// src/components/NewsImpactScreener.js - ENHANCED VERSION 3.0
// Complete rewrite using NISSCalculationEngine
// Simplified main component with modular architecture

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

// Import existing tab components (these will be updated in Phase 3)
import StockScreener from "./StockScreener";
import CatalystAnalysisTab from "./CatalystAnalysisTab";
import PerformanceTrackingTab from "./PerformanceTrackingTab";

// Import NEW Phase 1 engines
import NISSCalculationEngine from "../engine/NISSCalculationEngine";
import InstitutionalDataService from "../api/InstitutionalDataService";
import DataNormalizer from "../utils/DataNormalizer";

// Import NEW Phase 2 modular components
import HeaderComponent from "./enhanced/HeaderComponent";
import TabNavigation from "./enhanced/TabNavigation";

// ============================================
// MAIN COMPONENT DEFINITION
// ============================================

const NewsImpactScreener = () => {
  console.log("🚀 NewsImpactScreener v3.0 initializing...");

  // ============================================
  // CORE STATE MANAGEMENT (Simplified to 8 states)
  // ============================================

  // Main application state
  const [activeTab, setActiveTab] = useState("screener");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data state - single source of truth
  const [screeningResults, setScreeningResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [marketContext, setMarketContext] = useState({
    volatility: "NORMAL",
    trend: "NEUTRAL",
    breadth: "MIXED",
    spyChange: 0,
    lastUpdate: new Date(),
  });

  // User preferences state
  const [watchlist, setWatchlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("institutionalWatchlist") || "[]");
    } catch {
      return [];
    }
  });

  const [refreshInterval, setRefreshInterval] = useState(() => {
    try {
      return parseInt(localStorage.getItem("refreshInterval") || "300000"); // 5 minutes default
    } catch {
      return 300000;
    }
  });

  // ============================================
  // COMPUTED VALUES (using useMemo for performance)
  // ============================================

  // Service status - computed from InstitutionalDataService
  const serviceStatus = useMemo(() => {
    return InstitutionalDataService.getServiceStatus();
  }, [loading]); // Only recompute when loading changes

  // Summary statistics - computed from screening results
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
      (stock) => stock.nissScore > 0
    ).length;
    const bearish = screeningResults.filter(
      (stock) => stock.nissScore < 0
    ).length;
    const highConfidence = screeningResults.filter(
      (stock) => stock.confidence === "HIGH"
    ).length;
    const activeSignals = screeningResults.filter(
      (stock) =>
        stock.tradeSetup?.action && !stock.tradeSetup.action.includes("HOLD")
    ).length;
    const avgNissScore =
      total > 0
        ? screeningResults.reduce(
            (sum, stock) => sum + Math.abs(stock.nissScore),
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

  // Available sectors - computed from universe
  const availableSectors = useMemo(() => {
    return Object.keys(InstitutionalDataService.screeningUniverse);
  }, []);

  // ============================================
  // INITIALIZATION EFFECTS
  // ============================================

  // Main initialization effect
  useEffect(() => {
    console.log("📊 Initializing News Impact Screener...");

    // Load initial data
    handleInitialLoad();

    // Set up auto-refresh
    const intervalId = setInterval(() => {
      if (!loading) {
        console.log("🔄 Auto-refresh triggered");
        handleRefreshData();
      }
    }, refreshInterval);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
      console.log("🛑 NewsImpactScreener unmounted");
    };
  }, [refreshInterval]);

  // Market context update effect
  useEffect(() => {
    const updateMarketContext = async () => {
      try {
        await InstitutionalDataService.updateMarketContext();
        setMarketContext(InstitutionalDataService.marketContext);
      } catch (error) {
        console.error("Market context update failed:", error);
      }
    };

    // Update immediately and then every 5 minutes
    updateMarketContext();
    const contextInterval = setInterval(updateMarketContext, 5 * 60 * 1000);

    return () => clearInterval(contextInterval);
  }, []);

  // ============================================
  // CORE METHODS (Using NISSCalculationEngine)
  // ============================================

  // Initial data loading method
  const handleInitialLoad = useCallback(async () => {
    console.log("📊 Loading initial screening data...");

    try {
      setLoading(true);
      setError(null);

      // Use enhanced screening from InstitutionalDataService
      const results = await InstitutionalDataService.screenAllStocks({
        nissThreshold: 30, // Lower threshold for initial load
        minConfidence: "LOW",
        maxResults: 50, // Start with smaller set
        sectors: "all",
      });

      console.log(
        `✅ Initial load complete: ${results.length} stocks analyzed`
      );
      setScreeningResults(results);
    } catch (error) {
      console.error("❌ Initial load failed:", error);
      setError(`Failed to load initial data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Main screening method using NISSCalculationEngine
  const handleScreenAllStocks = useCallback(async (options = {}) => {
    console.log("🔍 Starting enhanced stock screening...");

    try {
      setLoading(true);
      setError(null);

      // Default screening options
      const defaultOptions = {
        nissThreshold: 50,
        minConfidence: "MEDIUM",
        maxResults: 200,
        sectors: "all",
      };

      const screeningOptions = { ...defaultOptions, ...options };
      console.log("📊 Screening options:", screeningOptions);

      // This uses NISSCalculationEngine under the hood
      const results = await InstitutionalDataService.screenAllStocks(
        screeningOptions
      );

      console.log(
        `✅ Enhanced screening complete: ${results.length} qualifying stocks found`
      );
      setScreeningResults(results);

      // Update market context after screening
      setMarketContext(InstitutionalDataService.marketContext);

      return results;
    } catch (error) {
      console.error("❌ Enhanced screening failed:", error);
      setError(`Screening failed: ${error.message}`);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh data method
  const handleRefreshData = useCallback(async () => {
    console.log("🔄 Refreshing screening data...");

    try {
      // Clear cache to ensure fresh data
      InstitutionalDataService.cache.clear();
      console.log("🧹 Cache cleared for refresh");

      // Re-run screening with current results length as baseline
      const currentResultCount = screeningResults.length;
      const refreshOptions = {
        maxResults: Math.max(currentResultCount, 50),
      };

      await handleScreenAllStocks(refreshOptions);
    } catch (error) {
      console.error("❌ Refresh failed:", error);
      setError(`Refresh failed: ${error.message}`);
    }
  }, [screeningResults.length, handleScreenAllStocks]);

  // Individual stock analysis using NISSCalculationEngine
  const handleAnalyzeStock = useCallback(async (symbol) => {
    console.log(`🔍 Analyzing individual stock: ${symbol}`);

    try {
      // Use enhanced analysis method
      const analysis = await InstitutionalDataService.analyzeStock(symbol);

      if (analysis) {
        console.log(
          `✅ ${symbol} analysis complete - NISS: ${analysis.nissScore.toFixed(
            1
          )}, Confidence: ${analysis.confidence}`
        );

        // Update the stock in screening results if it exists
        setScreeningResults((prev) => {
          const index = prev.findIndex((stock) => stock.symbol === symbol);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = analysis;
            return updated;
          }
          return prev;
        });

        return analysis;
      }
    } catch (error) {
      console.error(`❌ Analysis failed for ${symbol}:`, error);
      setError(`Analysis failed for ${symbol}: ${error.message}`);
      return null;
    }
  }, []);

  // ============================================
  // DATA FILTERING AND SORTING
  // ============================================

  // Filter and sort results based on criteria
  const getFilteredResults = useCallback(
    (filters = {}, sortBy = "nissScore", sortDirection = "desc") => {
      let filtered = [...screeningResults];

      // Apply filters
      if (filters.minNissScore) {
        filtered = filtered.filter(
          (stock) => Math.abs(stock.nissScore) >= filters.minNissScore
        );
      }

      if (filters.confidence && filters.confidence !== "all") {
        filtered = filtered.filter(
          (stock) => stock.confidence === filters.confidence
        );
      }

      if (filters.sector && filters.sector !== "all") {
        filtered = filtered.filter((stock) => stock.sector === filters.sector);
      }

      if (filters.signal && filters.signal !== "all") {
        filtered = filtered.filter((stock) => {
          const action = stock.tradeSetup?.action || "HOLD";
          return action.includes(filters.signal);
        });
      }

      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (stock) =>
            stock.symbol.toLowerCase().includes(query) ||
            (stock.company && stock.company.toLowerCase().includes(query))
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let aValue, bValue;

        switch (sortBy) {
          case "nissScore":
            aValue = Math.abs(a.nissScore);
            bValue = Math.abs(b.nissScore);
            break;
          case "price":
            aValue = a.price;
            bValue = b.price;
            break;
          case "changePercent":
            aValue = a.changePercent;
            bValue = b.changePercent;
            break;
          case "volume":
            aValue = a.volume;
            bValue = b.volume;
            break;
          case "symbol":
            aValue = a.symbol;
            bValue = b.symbol;
            break;
          default:
            aValue = a.nissScore;
            bValue = b.nissScore;
        }

        if (sortDirection === "desc") {
          return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
        } else {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
      });

      return filtered;
    },
    [screeningResults]
  );

  // ============================================
  // UTILITY METHODS
  // ============================================

  // Get stock analysis with caching
  const getStockAnalysis = useCallback(
    async (symbol) => {
      // Check if we already have this stock in our results
      const existing = screeningResults.find(
        (stock) => stock.symbol === symbol
      );

      if (existing && existing.nissScore !== undefined) {
        console.log(`📋 Using cached analysis for ${symbol}`);
        return existing;
      }

      // If not found, analyze it fresh
      console.log(`🔍 Fresh analysis needed for ${symbol}`);
      return await handleAnalyzeStock(symbol);
    },
    [screeningResults, handleAnalyzeStock]
  );

  // Export data functionality
  const handleExportData = useCallback(
    (format = "csv") => {
      try {
        console.log(
          `📁 Exporting ${screeningResults.length} results as ${format}`
        );

        if (screeningResults.length === 0) {
          setError("No data to export. Please run screening first.");
          return;
        }

        const exportData = screeningResults.map((stock) => ({
          Symbol: stock.symbol,
          Company: stock.company || stock.symbol,
          Price: stock.price?.toFixed(2),
          "Change %": stock.changePercent?.toFixed(2),
          "NISS Score": stock.nissScore?.toFixed(2),
          Confidence: stock.confidence,
          Action: stock.tradeSetup?.action || "HOLD",
          "Entry Price": stock.tradeSetup?.entryPrice?.toFixed(2),
          "Stop Loss": stock.tradeSetup?.stopLoss?.toFixed(2),
          "Target 1": stock.tradeSetup?.targets?.[0]?.price?.toFixed(2),
          "Target 2": stock.tradeSetup?.targets?.[1]?.price?.toFixed(2),
          "Target 3": stock.tradeSetup?.targets?.[2]?.price?.toFixed(2),
          "Risk/Reward": stock.tradeSetup?.riskReward?.toFixed(2),
          Sector: stock.sector,
          Volume: stock.volume,
          "Market Cap": stock.marketCap,
          "News Count": stock.news?.length || 0,
          "Last Update": stock.lastUpdate,
        }));

        if (format === "csv") {
          const headers = Object.keys(exportData[0]);
          const csvContent = [
            headers.join(","),
            ...exportData.map((row) =>
              headers
                .map((header) => {
                  const value = row[header];
                  // Handle values that might contain commas
                  return typeof value === "string" && value.includes(",")
                    ? `"${value}"`
                    : value;
                })
                .join(",")
            ),
          ].join("\n");

          const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `niss-screening-${
            new Date().toISOString().split("T")[0]
          }.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

        console.log(
          `✅ Export completed: ${exportData.length} records exported`
        );
      } catch (error) {
        console.error("❌ Export failed:", error);
        setError(`Export failed: ${error.message}`);
      }
    },
    [screeningResults]
  );

  // Search functionality
  const handleSearch = useCallback(
    (searchQuery, filters = {}) => {
      console.log(`🔍 Search: "${searchQuery}" with filters:`, filters);

      const searchFilters = {
        ...filters,
        searchQuery: searchQuery,
      };

      return getFilteredResults(searchFilters);
    },
    [getFilteredResults]
  );

  // Clear error messages
  const handleClearError = useCallback(() => {
    console.log("🧹 Clearing error message");
    setError(null);
  }, []);

  // ============================================
  // EVENT HANDLERS (Complete User Interactions)
  // ============================================

  // Tab switching with cleanup
  const handleTabChange = useCallback(
    (newTab) => {
      console.log(`🔄 Switching to tab: ${newTab}`);

      setActiveTab(newTab);
      setSelectedStock(null); // Clear selection when changing tabs
      setError(null); // Clear any existing errors

      // Track tab usage for analytics
      try {
        const tabUsage = JSON.parse(localStorage.getItem("tabUsage") || "{}");
        tabUsage[newTab] = (tabUsage[newTab] || 0) + 1;
        localStorage.setItem("tabUsage", JSON.stringify(tabUsage));
        console.log(`📊 Tab usage updated for: ${newTab}`);
      } catch (error) {
        console.warn("State persistence failed:", error);
      }
    },
    [activeTab, watchlist, refreshInterval, screeningResults.length]
  );

  // Restore state on component mount
  const handleRestoreState = useCallback(() => {
    try {
      const savedState = JSON.parse(localStorage.getItem("appState") || "{}");

      if (savedState.version === "3.0") {
        if (savedState.activeTab && savedState.activeTab !== activeTab) {
          console.log("📄 Restoring active tab:", savedState.activeTab);
          setActiveTab(savedState.activeTab);
        }

        console.log("✅ State restored from localStorage");
      } else {
        console.log("🔄 State version mismatch, using defaults");
        localStorage.removeItem("appState"); // Clear old version state
      }
    } catch (error) {
      console.warn("State restoration failed:", error);
    }
  }, [activeTab]);

  // State restoration and cleanup effect
  useEffect(() => {
    handleRestoreState();

    // Setup cleanup on unmount
    return handleCleanup;
  }, [handleRestoreState, handleCleanup]);

  // ============================================
  // ADVANCED FEATURES
  // ============================================

  // Real-time data subscription (placeholder for future enhancement)
  const handleSubscribeToUpdates = useCallback((symbols) => {
    console.log(
      `📡 Subscribing to real-time updates for: ${symbols.join(", ")}`
    );

    // Future: WebSocket connection for real-time updates
    // For now, just log the subscription
    try {
      const subscriptions = JSON.parse(
        localStorage.getItem("realtimeSubscriptions") || "[]"
      );
      const newSubscriptions = [...new Set([...subscriptions, ...symbols])];
      localStorage.setItem(
        "realtimeSubscriptions",
        JSON.stringify(newSubscriptions)
      );
      console.log(
        `📡 Subscribed to ${newSubscriptions.length} symbols for real-time updates`
      );
    } catch (error) {
      console.warn("Subscription management failed:", error);
    }
  }, []);

  // Notification management
  const handleSendNotification = useCallback(
    (title, message, type = "info") => {
      console.log(`🔔 Notification: ${title} - ${message}`);

      // Browser notification (if permission granted)
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(title, {
            body: message,
            icon: "/favicon.ico",
            tag: `niss-${type}`,
            requireInteraction: type === "error",
          });
        } catch (error) {
          console.warn("Browser notification failed:", error);
        }
      }

      // Console notification for development
      const emoji = type === "error" ? "❌" : type === "success" ? "✅" : "📢";
      console.log(`${emoji} ${title}: ${message}`);
    },
    []
  );

  // Health monitoring
  const handleHealthCheck = useCallback(async () => {
    console.log("🏥 Performing health check...");

    try {
      const healthStatus = {
        timestamp: new Date().toISOString(),
        phase1Engines: {
          nissEngine: !!NISSCalculationEngine,
          dataService: !!InstitutionalDataService,
          dataNormalizer: !!DataNormalizer,
        },
        serviceStatus: serviceStatus,
        dataIntegrity: {
          screeningResults: screeningResults.length,
          hasValidNissScores: screeningResults.filter(
            (s) => s.nissScore !== null && !isNaN(s.nissScore)
          ).length,
          hasTradeSetups: screeningResults.filter((s) => s.tradeSetup).length,
        },
        marketContext: marketContext,
        userState: {
          activeTab,
          watchlistSize: watchlist.length,
          refreshInterval,
        },
      };

      console.log("🏥 Health check results:", healthStatus);

      // Store health check results
      localStorage.setItem("lastHealthCheck", JSON.stringify(healthStatus));

      return healthStatus;
    } catch (error) {
      console.error("❌ Health check failed:", error);
      return null;
    }
  }, [
    serviceStatus,
    screeningResults,
    marketContext,
    activeTab,
    watchlist,
    refreshInterval,
  ]);

  // Debug utilities
  const handleDebugLog = useCallback(() => {
    console.log("🛠️ Debug information requested");

    const debugInfo = {
      timestamp: new Date().toISOString(),
      version: "3.0",
      state: {
        activeTab,
        loading,
        error,
        screeningResultsCount: screeningResults.length,
        selectedStock: selectedStock?.symbol,
        watchlistCount: watchlist.length,
        refreshInterval,
      },
      computed: {
        summaryStats,
        serviceStatus,
        marketContext,
        availableSectors,
      },
      performance: JSON.parse(
        localStorage.getItem("performanceHistory") || "[]"
      ).slice(-5),
      engines: {
        nissEngineVersion: NISSCalculationEngine.version,
        dataServiceVersion: InstitutionalDataService.version,
        dataNormalizerVersion: DataNormalizer.dataVersion,
      },
    };

    console.table(debugInfo.state);
    console.table(debugInfo.computed.summaryStats);
    console.log("🛠️ Complete debug info:", debugInfo);

    return debugInfo;
  }, [
    activeTab,
    loading,
    error,
    screeningResults,
    selectedStock,
    watchlist,
    refreshInterval,
    summaryStats,
    serviceStatus,
    marketContext,
    availableSectors,
  ]);

  // ============================================
  // MAIN RENDER METHOD (Complete Component JSX)
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header Component */}
      <HeaderComponent
        serviceStatus={serviceStatus}
        marketContext={marketContext}
        summaryStats={summaryStats}
        loading={loading}
        onRefresh={handleManualRefresh}
        onSettingsChange={handleSettingsChange}
        onExport={() => handleExportData("csv")}
      />

      {/* Error Display with Retry Options */}
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
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => handleRetry("screening")}
                  className="text-red-700 text-sm underline hover:text-red-800 transition-colors"
                >
                  Retry Screening
                </button>
                <button
                  onClick={() => handleRetry("refresh")}
                  className="text-red-700 text-sm underline hover:text-red-800 transition-colors"
                >
                  Refresh Data
                </button>
                <button
                  onClick={handleClearError}
                  className="text-red-700 text-sm underline hover:text-red-800 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Enhanced Tab Navigation */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
          summaryStats={summaryStats}
          loading={loading}
        />

        {/* Tab Content - Clean Props Passing */}
        <div className="mt-6">
          {/* Stock Screener Tab */}
          {activeTab === "screener" && (
            <StockScreener
              // Core data props
              stocks={screeningResults}
              totalResults={screeningResults.length}
              selectedStock={selectedStock}
              watchlist={watchlist}
              // State props
              loading={loading}
              searchQuery=""
              setSearchQuery={(query) => console.log("Search:", query)}
              filters={{}}
              setFilters={(filters) => console.log("Filters:", filters)}
              sortBy="nissScore"
              setSortBy={(sort) => console.log("Sort by:", sort)}
              sortDirection="desc"
              setSortDirection={(dir) => console.log("Sort direction:", dir)}
              // Action props
              onRefresh={handleManualRefresh}
              onWatchlistToggle={handleWatchlistToggle}
              onExportData={handleExportData}
              setSelectedStock={handleStockSelection}
              // Status props
              marketRegime={marketContext}
              backendHealth={serviceStatus.backendHealth}
              serviceStatus={serviceStatus}
              connectionStatus="connected"
              refreshing={false}
              exportInProgress={false}
              // Additional data
              availableSectors={availableSectors}
              summaryStats={summaryStats}
              // Pagination props (simplified)
              currentPage={1}
              setCurrentPage={() => {}}
              totalPages={1}
              resultsPerPage={screeningResults.length}
              // Utility functions
              getFilteredResults={getFilteredResults}
              onSearch={handleSearch}
              onBulkOperation={handleBulkOperation}
            />
          )}

          {/* Catalyst Analysis Tab */}
          {activeTab === "catalyst" && (
            <CatalystAnalysisTab
              // Core data
              stocks={screeningResults}
              selectedStock={selectedStock}
              setSelectedStock={handleStockSelection}
              // State
              loading={loading}
              error={error}
              // Market context
              marketRegime={marketContext}
              // Status
              backendHealth={serviceStatus.backendHealth}
              serviceStatus={serviceStatus}
              connectionStatus="connected"
              // Actions
              alerts={[]} // Will be enhanced in Phase 3
              onAnalyzeStock={handleAnalyzeStock}
              onWatchlistToggle={handleWatchlistToggle}
            />
          )}

          {/* Performance Tracking Tab */}
          {activeTab === "performance" && (
            <PerformanceTrackingTab
              // Core data
              historicalPerformance={screeningResults.map((stock) => ({
                ticker: stock.symbol,
                timestamp: stock.lastUpdate,
                nissScore: stock.nissScore,
                confidence: stock.confidence,
                signal: stock.tradeSetup,
                price: stock.price,
                marketRegime: marketContext,
              }))}
              stockData={screeningResults.reduce((acc, stock) => {
                acc[stock.symbol] = stock;
                return acc;
              }, {})}
              // State
              loading={loading}
              error={error}
              // Market context
              marketRegime={marketContext}
              // Actions
              onWatchlistToggle={handleWatchlistToggle}
              onAnalyzeStock={handleAnalyzeStock}
              onExport={handleExportData}
              // Status
              backendHealth={serviceStatus.backendHealth}
              serviceStatus={serviceStatus}
              connectionStatus="connected"
              // Additional
              watchlist={watchlist}
              summaryStats={summaryStats}
            />
          )}
        </div>
      </div>

      {/* Development Debug Panel */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-3 rounded-lg text-xs max-w-sm z-50 shadow-lg">
          <div className="font-semibold mb-2 text-green-400">
            🛠️ Debug Panel v3.0
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <div>Engine:</div>
              <div className="text-green-400">
                v{NISSCalculationEngine.version}
              </div>

              <div>Service:</div>
              <div className="text-blue-400">v{serviceStatus.version}</div>

              <div>Results:</div>
              <div className="text-yellow-400">{screeningResults.length}</div>

              <div>Tab:</div>
              <div className="text-purple-400">{activeTab}</div>

              <div>Selected:</div>
              <div className="text-orange-400">
                {selectedStock?.symbol || "None"}
              </div>

              <div>Watchlist:</div>
              <div className="text-pink-400">{watchlist.length}</div>

              <div>Cache:</div>
              <div className="text-indigo-400">{serviceStatus.cacheSize}</div>

              <div>Backend:</div>
              <div
                className={
                  serviceStatus.backendHealth
                    ? "text-green-400"
                    : "text-red-400"
                }
              >
                {serviceStatus.backendHealth ? "✅" : "❌"}
              </div>

              <div>Market:</div>
              <div
                className={
                  marketContext.trend === "BULLISH"
                    ? "text-green-400"
                    : marketContext.trend === "BEARISH"
                    ? "text-red-400"
                    : "text-gray-400"
                }
              >
                {marketContext.trend}
              </div>

              <div>Loading:</div>
              <div className={loading ? "text-yellow-400" : "text-green-400"}>
                {loading ? "Yes" : "No"}
              </div>
            </div>
          </div>

          {/* Debug Action Buttons */}
          <div className="mt-3 pt-2 border-t border-gray-700 space-y-1">
            <button
              onClick={handleDebugLog}
              className="block w-full text-left text-blue-300 text-xs hover:text-blue-200 transition-colors"
            >
              📊 Log Complete State
            </button>
            <button
              onClick={handleHealthCheck}
              className="block w-full text-left text-green-300 text-xs hover:text-green-200 transition-colors"
            >
              🏥 Run Health Check
            </button>
            <button
              onClick={() => handleExportData("csv")}
              className="block w-full text-left text-yellow-300 text-xs hover:text-yellow-200 transition-colors"
              disabled={screeningResults.length === 0}
            >
              📁 Export Current Data
            </button>
            <button
              onClick={() => InstitutionalDataService.cache.clear()}
              className="block w-full text-left text-red-300 text-xs hover:text-red-200 transition-colors"
            >
              🧹 Clear Cache
            </button>
          </div>

          {/* Performance Indicator */}
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="text-xs text-gray-400">
              Avg NISS: {summaryStats.avgNissScore?.toFixed(1) || "0.0"}
            </div>
            <div className="text-xs text-gray-400">
              Uptime:{" "}
              {Math.floor(
                (Date.now() - performance.timing.navigationStart) / 1000
              )}
              s
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// COMPONENT EXPORT
// ============================================

export default NewsImpactScreener;
