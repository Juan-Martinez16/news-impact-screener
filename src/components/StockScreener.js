// src/components/StockScreener.js - FIXED VERSION - Infinite Loop Resolved
// Emergency fixes applied to stop vibrating screen

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Eye,
  Star,
  StarOff,
  Download,
  RefreshCw,
  Activity,
  BarChart3,
  DollarSign,
  Volume2,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Settings,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  Target,
  Shield,
  Percent,
} from "lucide-react";

const StockScreener = ({
  // Data props
  stocks = [],
  totalResults = 0,

  // State props
  loading = false,
  searchQuery = "",
  setSearchQuery,
  filters = {},
  setFilters,
  sortBy = "nissScore",
  setSortBy,
  sortDirection = "desc",
  setSortDirection,
  selectedStock,
  setSelectedStock,

  // Action props
  onRefresh,
  onWatchlistToggle,
  onExportData,

  // Status props - MEMOIZED TO PREVENT RECREATION
  marketRegime = {},
  backendHealth = true,
  serviceStatus = {},
  connectionStatus = "connected",
  refreshing = false,
  exportInProgress = false,

  // Additional data - MEMOIZED TO PREVENT RECREATION
  availableSectors = [],
  summaryStats = {},
  watchlist = [],

  // Pagination props
  currentPage = 1,
  setCurrentPage,
  totalPages = 1,
  resultsPerPage = 25,
}) => {
  // DEBUG: Add render counter to track loops
  console.log(
    "🎯 StockScreener render #",
    ++window.renderCount || (window.renderCount = 1)
  );

  // ============================================
  // SIMPLIFIED STATE MANAGEMENT (6 core states only)
  // ============================================

  // Filter state (Enhanced Trading Cheat Sheet ranges)
  const [activeFilters, setActiveFilters] = useState({
    nissRange: "all",
    confidence: "all",
    marketCap: "all",
    sector: "all",
    volume: "all",
    timeframe: "24h",
  });

  // Sort configuration - SIMPLIFIED
  const [sortConfig, setSortConfig] = useState({
    field: "nissScore",
    direction: "desc",
  });

  // UI state
  const [viewMode, setViewMode] = useState("table");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Selection and expansion state
  const [selectedStocks, setSelectedStocks] = useState(new Set());
  const [expandedDetails, setExpandedDetails] = useState(new Set());

  // ============================================
  // STABLE UTILITY FUNCTIONS (Moved outside render, no dependencies)
  // ============================================

  // Get NISS score color - NO DEPENDENCIES
  const getNissScoreColor = useCallback((score) => {
    if (score > 75) return "text-green-600 font-bold";
    if (score > 60) return "text-green-500";
    if (score > -60) return "text-gray-600";
    if (score > -75) return "text-red-500";
    return "text-red-600 font-bold";
  }, []); // EMPTY DEPENDENCIES

  // Get confidence badge styling - NO DEPENDENCIES
  const getConfidenceBadge = useCallback((confidence) => {
    switch (confidence) {
      case "HIGH":
        return "bg-green-100 text-green-800 border-green-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "LOW":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }, []); // EMPTY DEPENDENCIES

  // Format currency - NO DEPENDENCIES
  const formatCurrency = useCallback((value) => {
    if (!value) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }, []); // EMPTY DEPENDENCIES

  // Format percentage - NO DEPENDENCIES
  const formatPercentage = useCallback((value) => {
    if (value === null || value === undefined) return "N/A";
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  }, []); // EMPTY DEPENDENCIES

  // Format market cap - NO DEPENDENCIES
  const formatMarketCap = useCallback((value) => {
    if (!value) return "N/A";
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toFixed(0)}`;
  }, []); // EMPTY DEPENDENCIES

  // ============================================
  // FIXED TRADING FUNCTIONS (No circular dependencies)
  // ============================================

  // Generate trade signal - STABLE FUNCTION WITH NO DEPENDENCIES
  const generateTradeSignal = useCallback((stock) => {
    if (!stock) {
      return {
        action: "HOLD",
        color: "bg-gray-400",
        textColor: "text-white",
        priority: 3,
      };
    }

    const nissScore = stock.nissScore || 0;
    const confidence = stock.confidence || "LOW";
    const relativeVolume = stock.volumeData?.relativeVolume || 1;
    const priceChange = stock.priceData?.change || 0;

    // Strong Buy Signal
    if (
      nissScore > 75 &&
      confidence === "HIGH" &&
      relativeVolume > 2 &&
      priceChange > 0
    ) {
      return {
        action: "STRONG BUY",
        color: "bg-green-600",
        textColor: "text-white",
        priority: 1,
      };
    }

    // Buy Signal
    if (nissScore >= 60 && confidence !== "LOW" && relativeVolume > 1.5) {
      return {
        action: "BUY",
        color: "bg-green-500",
        textColor: "text-white",
        priority: 2,
      };
    }

    // Strong Sell Signal
    if (
      nissScore < -75 &&
      confidence === "HIGH" &&
      relativeVolume > 2 &&
      priceChange < 0
    ) {
      return {
        action: "STRONG SELL",
        color: "bg-red-600",
        textColor: "text-white",
        priority: 1,
      };
    }

    // Sell Signal
    if (nissScore <= -60 && confidence !== "LOW" && relativeVolume > 1.5) {
      return {
        action: "SELL",
        color: "bg-red-500",
        textColor: "text-white",
        priority: 2,
      };
    }

    // Default Hold
    return {
      action: "HOLD",
      color: "bg-gray-400",
      textColor: "text-white",
      priority: 3,
    };
  }, []); // NO DEPENDENCIES TO PREVENT LOOPS

  // Calculate trade setup - STABLE FUNCTION WITH NO DEPENDENCIES
  const calculateTradeSetup = useCallback((stock) => {
    if (!stock || !stock.currentPrice) {
      return { action: "HOLD", message: "Insufficient data" };
    }

    const currentPrice = stock.currentPrice;
    const nissScore = stock.nissScore || 0;
    const confidence = stock.confidence || "LOW";
    const atr = stock.technicalData?.atr || currentPrice * 0.025;

    // Get signal without circular dependency
    const signal = generateTradeSignal(stock);

    if (signal.action === "HOLD") {
      return { action: "HOLD", message: "No clear setup" };
    }

    const isBullish = signal.action.includes("BUY");

    // Entry price
    const entry = currentPrice;

    // Stop loss calculation
    const stopMultiplier =
      confidence === "HIGH" ? 1.5 : confidence === "MEDIUM" ? 2.0 : 2.5;
    const stopLoss = isBullish
      ? entry - atr * stopMultiplier
      : entry + atr * stopMultiplier;
    const riskPerShare = Math.abs(entry - stopLoss);

    // Calculate targets
    const baseTarget = riskPerShare * 2.5;
    const targets = [];

    if (isBullish) {
      targets.push({
        level: 1,
        price: entry + baseTarget * 0.6,
        percentage: ((entry + baseTarget * 0.6) / entry - 1) * 100,
        probability: 70,
      });
      targets.push({
        level: 2,
        price: entry + baseTarget * 1.0,
        percentage: ((entry + baseTarget * 1.0) / entry - 1) * 100,
        probability: 50,
      });
      targets.push({
        level: 3,
        price: entry + baseTarget * 1.5,
        percentage: ((entry + baseTarget * 1.5) / entry - 1) * 100,
        probability: 30,
      });
    } else {
      targets.push({
        level: 1,
        price: entry - baseTarget * 0.6,
        percentage: ((entry - baseTarget * 0.6) / entry - 1) * 100,
        probability: 70,
      });
      targets.push({
        level: 2,
        price: entry - baseTarget * 1.0,
        percentage: ((entry - baseTarget * 1.0) / entry - 1) * 100,
        probability: 50,
      });
      targets.push({
        level: 3,
        price: entry - baseTarget * 1.5,
        percentage: ((entry - baseTarget * 1.5) / entry - 1) * 100,
        probability: 30,
      });
    }

    const riskRewardRatio = Math.abs(targets[1].price - entry) / riskPerShare;

    return {
      action: signal.action,
      entry: { price: entry, reasoning: "Current market price" },
      stopLoss: {
        price: stopLoss,
        percentage: ((stopLoss / entry - 1) * 100).toFixed(2),
      },
      targets,
      riskReward: `1:${riskRewardRatio.toFixed(1)}`,
      confidence: confidence,
    };
  }, []); // NO DEPENDENCIES TO PREVENT LOOPS

  // ============================================
  // MEMOIZED DATA PROCESSING (Proper dependencies)
  // ============================================

  // Apply all filters to stocks data - STABLE DEPENDENCIES
  const filteredStocks = useMemo(() => {
    if (!stocks || stocks.length === 0) return [];

    let filtered = [...stocks];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (stock) =>
          stock.symbol?.toLowerCase().includes(query) ||
          stock.company?.toLowerCase().includes(query) ||
          stock.sector?.toLowerCase().includes(query)
      );
    }

    // NISS Score range filter
    if (activeFilters.nissRange !== "all") {
      switch (activeFilters.nissRange) {
        case "strong_buy":
          filtered = filtered.filter((stock) => (stock.nissScore || 0) > 75);
          break;
        case "buy":
          filtered = filtered.filter(
            (stock) =>
              (stock.nissScore || 0) >= 60 && (stock.nissScore || 0) <= 75
          );
          break;
        case "hold":
          filtered = filtered.filter(
            (stock) =>
              (stock.nissScore || 0) > -60 && (stock.nissScore || 0) < 60
          );
          break;
        case "sell":
          filtered = filtered.filter(
            (stock) =>
              (stock.nissScore || 0) >= -75 && (stock.nissScore || 0) <= -60
          );
          break;
        case "strong_sell":
          filtered = filtered.filter((stock) => (stock.nissScore || 0) < -75);
          break;
        default:
          break;
      }
    }

    // Other filters...
    if (activeFilters.confidence !== "all") {
      if (activeFilters.confidence === "HIGH_ONLY") {
        filtered = filtered.filter((stock) => stock.confidence === "HIGH");
      } else if (activeFilters.confidence === "MEDIUM_PLUS") {
        filtered = filtered.filter(
          (stock) =>
            stock.confidence === "HIGH" || stock.confidence === "MEDIUM"
        );
      }
    }

    return filtered;
  }, [stocks, searchQuery, activeFilters]); // ONLY ESSENTIAL DEPENDENCIES

  // Sort filtered stocks - FIXED DEPENDENCIES
  const sortedStocks = useMemo(() => {
    if (!filteredStocks.length) return [];

    return [...filteredStocks].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.field) {
        case "nissScore":
          aValue = a.nissScore || 0;
          bValue = b.nissScore || 0;
          break;
        case "confidence":
          const confMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          aValue = confMap[a.confidence] || 0;
          bValue = confMap[b.confidence] || 0;
          break;
        case "price":
          aValue = a.currentPrice || 0;
          bValue = b.currentPrice || 0;
          break;
        case "volume":
          aValue = a.volumeData?.relativeVolume || 0;
          bValue = b.volumeData?.relativeVolume || 0;
          break;
        case "marketCap":
          aValue = a.marketCap || 0;
          bValue = b.marketCap || 0;
          break;
        case "change":
          aValue = a.priceData?.change || 0;
          bValue = b.priceData?.change || 0;
          break;
        default:
          aValue = a[sortConfig.field] || 0;
          bValue = b[sortConfig.field] || 0;
      }

      if (sortConfig.direction === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredStocks, sortConfig]); // ONLY ESSENTIAL DEPENDENCIES

  // FIXED: Quick stats calculation WITHOUT calling expensive functions
  const quickStats = useMemo(() => {
    if (!sortedStocks?.length) {
      return {
        strongBuys: 0,
        buys: 0,
        sells: 0,
        highConfidence: 0,
        avgNiss: "0",
      };
    }

    try {
      let strongBuys = 0,
        buys = 0,
        sells = 0,
        highConfidence = 0,
        totalNiss = 0;

      // FIXED: Calculate signals directly without function calls
      for (const stock of sortedStocks) {
        const nissScore = stock.nissScore || 0;
        const confidence = stock.confidence || "LOW";
        const relativeVolume = stock.volumeData?.relativeVolume || 1;
        const priceChange = stock.priceData?.change || 0;

        // Direct signal calculation (no function calls)
        if (
          nissScore > 75 &&
          confidence === "HIGH" &&
          relativeVolume > 2 &&
          priceChange > 0
        ) {
          strongBuys++;
        } else if (
          nissScore >= 60 &&
          confidence !== "LOW" &&
          relativeVolume > 1.5
        ) {
          buys++;
        } else if (
          (nissScore < -75 &&
            confidence === "HIGH" &&
            relativeVolume > 2 &&
            priceChange < 0) ||
          (nissScore <= -60 && confidence !== "LOW" && relativeVolume > 1.5)
        ) {
          sells++;
        }

        if (confidence === "HIGH") highConfidence++;
        totalNiss += nissScore;
      }

      return {
        strongBuys,
        buys,
        sells,
        highConfidence,
        avgNiss: (totalNiss / sortedStocks.length).toFixed(1),
      };
    } catch (error) {
      console.error("QuickStats calculation error:", error);
      return {
        strongBuys: 0,
        buys: 0,
        sells: 0,
        highConfidence: 0,
        avgNiss: "0",
      };
    }
  }, [sortedStocks]); // ONLY depends on sortedStocks

  // ============================================
  // STABLE EVENT HANDLERS (No circular dependencies)
  // ============================================

  // Handle filter changes - STABLE
  const handleFilterChange = useCallback((filterKey, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterKey]: value,
    }));
  }, []); // NO DEPENDENCIES

  // Handle sorting - STABLE
  const handleSort = useCallback((field) => {
    setSortConfig((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "desc" ? "asc" : "desc",
    }));
  }, []); // NO DEPENDENCIES

  // Handle row selection - STABLE
  const handleRowSelection = useCallback((symbol, isSelected) => {
    setSelectedStocks((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(symbol);
      } else {
        newSet.delete(symbol);
      }
      return newSet;
    });
  }, []); // NO DEPENDENCIES

  // Handle bulk watchlist add - ONLY ESSENTIAL DEPENDENCIES
  const handleBulkWatchlistAdd = useCallback(() => {
    selectedStocks.forEach((symbol) => {
      if (!watchlist.includes(symbol) && onWatchlistToggle) {
        onWatchlistToggle(symbol);
      }
    });
    setSelectedStocks(new Set());
  }, [selectedStocks, watchlist, onWatchlistToggle]); // MINIMAL DEPENDENCIES

  // Toggle details expansion - STABLE
  const toggleDetails = useCallback((symbol) => {
    setExpandedDetails((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      return newSet;
    });
  }, []); // NO DEPENDENCIES

  // Clear all filters - STABLE
  const clearAllFilters = useCallback(() => {
    setActiveFilters({
      nissRange: "all",
      confidence: "all",
      marketCap: "all",
      sector: "all",
      volume: "all",
      timeframe: "24h",
    });
    if (setSearchQuery) {
      setSearchQuery("");
    }
    setSelectedStocks(new Set());
  }, [setSearchQuery]); // MINIMAL DEPENDENCIES

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  // Sort icon component
  const SortIcon = ({ field }) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === "desc" ? (
      <ArrowDown className="h-4 w-4 text-blue-600" />
    ) : (
      <ArrowUp className="h-4 w-4 text-blue-600" />
    );
  };

  // Enhanced header
  const renderEnhancedHeader = () => (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg p-6 border-b border-gray-200">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center space-x-6">
          {/* Market Regime Indicator */}
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                Market Regime
              </div>
              <div
                className={`text-xs ${
                  marketRegime.trend === "BULLISH"
                    ? "text-green-600"
                    : marketRegime.trend === "BEARISH"
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {marketRegime.trend || "NEUTRAL"} • VIX:{" "}
                {marketRegime.vix || "N/A"}
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {filteredStocks.length} of {totalResults} stocks
              </div>
              <div className="text-xs text-gray-500">
                {selectedStocks.size > 0 && `${selectedStocks.size} selected`}
              </div>
            </div>
          </div>

          {/* Signal Distribution */}
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-green-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Signals</div>
              <div className="text-xs text-gray-500">
                {quickStats.buys} Buy • {quickStats.sells} Sell
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {selectedStocks.size > 0 && (
            <button
              onClick={handleBulkWatchlistAdd}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center"
            >
              <Star className="h-4 w-4 mr-1" />
              Add to Watchlist ({selectedStocks.size})
            </button>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading || refreshing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${
                  loading || refreshing ? "animate-spin" : ""
                }`}
              />
              {loading
                ? "Screening..."
                : refreshing
                ? "Updating..."
                : "Refresh"}
            </button>
          )}

          {onExportData && (
            <button
              onClick={() => onExportData("csv")}
              disabled={exportInProgress || sortedStocks.length === 0}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center"
            >
              <Download
                className={`h-4 w-4 mr-2 ${
                  exportInProgress ? "animate-bounce" : ""
                }`}
              />
              {exportInProgress ? "Exporting..." : "Export"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Filter controls
  const renderFilterControls = () => (
    <div className="bg-white p-4 border-b border-gray-200">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by symbol, company, or sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery?.(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery?.("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Primary Filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            NISS Range
          </label>
          <select
            value={activeFilters.nissRange}
            onChange={(e) => handleFilterChange("nissRange", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Ranges</option>
            <option value="strong_buy">Strong Buy (&gt;75)</option>
            <option value="buy">Buy (60-75)</option>
            <option value="hold">Hold (-60 to 60)</option>
            <option value="sell">Sell (-75 to -60)</option>
            <option value="strong_sell">Strong Sell (&lt;-75)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confidence
          </label>
          <select
            value={activeFilters.confidence}
            onChange={(e) => handleFilterChange("confidence", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Levels</option>
            <option value="HIGH_ONLY">HIGH Only</option>
            <option value="MEDIUM_PLUS">MEDIUM+</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Market Cap
          </label>
          <select
            value={activeFilters.marketCap}
            onChange={(e) => handleFilterChange("marketCap", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Caps</option>
            <option value="mega">Mega (&gt;$200B)</option>
            <option value="large">Large ($10B-$200B)</option>
            <option value="mid">Mid ($2B-$10B)</option>
            <option value="small">Small (&lt;$2B)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sector
          </label>
          <select
            value={activeFilters.sector}
            onChange={(e) => handleFilterChange("sector", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Sectors</option>
            {availableSectors.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Volume Surge
          </label>
          <select
            value={activeFilters.volume}
            onChange={(e) => handleFilterChange("volume", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">Any Volume</option>
            <option value="1.5x">&gt;1.5x Average</option>
            <option value="2x">&gt;2x Average</option>
            <option value="3x">&gt;3x Average</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            News Recency
          </label>
          <select
            value={activeFilters.timeframe}
            onChange={(e) => handleFilterChange("timeframe", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="4h">Last 4 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Filter Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-700"
          >
            <Filter className="h-4 w-4 mr-1" />
            {showAdvancedFilters ? "Hide" : "Show"} Advanced Filters
          </button>

          {Object.values(activeFilters).filter(
            (v) => v !== "all" && v !== "24h"
          ).length > 0 && (
            <span className="text-sm text-gray-500">
              {
                Object.values(activeFilters).filter(
                  (v) => v !== "all" && v !== "24h"
                ).length
              }{" "}
              filters active
            </span>
          )}
        </div>

        <button
          onClick={clearAllFilters}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );

  // Table header
  const renderTableHeader = () => (
    <thead className="bg-gray-50">
      <tr>
        {/* Selection Column */}
        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
          <input
            type="checkbox"
            checked={
              selectedStocks.size === sortedStocks.length &&
              sortedStocks.length > 0
            }
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedStocks(new Set(sortedStocks.map((s) => s.symbol)));
              } else {
                setSelectedStocks(new Set());
              }
            }}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </th>

        {/* Stock Info */}
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          <button
            onClick={() => handleSort("symbol")}
            className="flex items-center space-x-1 hover:text-gray-700"
          >
            <span>Stock</span>
            <SortIcon field="symbol" />
          </button>
        </th>

        {/* NISS Score */}
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          <button
            onClick={() => handleSort("nissScore")}
            className="flex items-center space-x-1 hover:text-gray-700"
          >
            <span>NISS Score</span>
            <SortIcon field="nissScore" />
          </button>
        </th>

        {/* Confidence Level */}
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          <button
            onClick={() => handleSort("confidence")}
            className="flex items-center space-x-1 hover:text-gray-700"
          >
            <span>Confidence</span>
            <SortIcon field="confidence" />
          </button>
        </th>

        {/* Trade Signal */}
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Signal
        </th>

        {/* Price & Change */}
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          <button
            onClick={() => handleSort("price")}
            className="flex items-center space-x-1 hover:text-gray-700"
          >
            <span>Price</span>
            <SortIcon field="price" />
          </button>
        </th>

        {/* Volume */}
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          <button
            onClick={() => handleSort("volume")}
            className="flex items-center space-x-1 hover:text-gray-700"
          >
            <span>Volume</span>
            <SortIcon field="volume" />
          </button>
        </th>

        {/* Trade Setup */}
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Trade Setup
        </th>

        {/* News Catalyst */}
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Latest News
        </th>

        {/* Actions */}
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Actions
        </th>
      </tr>
    </thead>
  );

  // FIXED: Table row renderer - Calculate signals ONCE per render
  const renderTableRow = (stock, index) => {
    // Calculate signal and setup ONCE per row render (not in useMemo dependencies)
    const signal = generateTradeSignal(stock);
    const tradeSetup = calculateTradeSetup(stock);
    const isSelected = selectedStocks.has(stock.symbol);
    const isExpanded = expandedDetails.has(stock.symbol);
    const isInWatchlist = watchlist.includes(stock.symbol);

    return (
      <React.Fragment key={stock.symbol || index}>
        {/* Main Row */}
        <tr
          className={`hover:bg-gray-50 transition-colors ${
            isSelected ? "bg-blue-50" : ""
          } ${
            signal.priority === 1
              ? "border-l-4 border-l-green-500"
              : signal.priority === 2
              ? "border-l-4 border-l-blue-500"
              : ""
          }`}
        >
          {/* Selection Checkbox */}
          <td className="px-3 py-4 whitespace-nowrap">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) =>
                handleRowSelection(stock.symbol, e.target.checked)
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </td>

          {/* Stock Info */}
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="text-sm font-medium text-gray-900">
                    {stock.symbol}
                  </div>
                  {isInWatchlist && (
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  )}
                </div>
                <div className="text-sm text-gray-500 truncate max-w-32">
                  {stock.company || stock.name}
                </div>
                <div className="text-xs text-gray-400">{stock.sector}</div>
              </div>
            </div>
          </td>

          {/* NISS Score */}
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-center">
              <div
                className={`text-lg font-bold ${getNissScoreColor(
                  stock.nissScore
                )}`}
              >
                {stock.nissScore?.toFixed(1) || "N/A"}
              </div>
              <div className="text-xs text-gray-500">
                {(stock.nissScore || 0) > 0
                  ? "Bullish"
                  : (stock.nissScore || 0) < 0
                  ? "Bearish"
                  : "Neutral"}
              </div>
            </div>
          </td>

          {/* Confidence Badge */}
          <td className="px-6 py-4 whitespace-nowrap">
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getConfidenceBadge(
                stock.confidence
              )}`}
            >
              {stock.confidence || "N/A"}
            </span>
          </td>

          {/* Trade Signal */}
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-center">
              <span
                className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${signal.color} ${signal.textColor}`}
              >
                {signal.action}
              </span>
              {signal.priority === 1 && (
                <div className="flex items-center justify-center mt-1">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs text-yellow-600 ml-1">Priority</span>
                </div>
              )}
            </div>
          </td>

          {/* Price & Change */}
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {formatCurrency(stock.currentPrice)}
              </div>
              <div
                className={`text-sm ${
                  (stock.priceData?.change || 0) > 0
                    ? "text-green-600"
                    : (stock.priceData?.change || 0) < 0
                    ? "text-red-600"
                    : "text-gray-500"
                }`}
              >
                {formatPercentage(stock.priceData?.changePercent)}
              </div>
              <div className="text-xs text-gray-500">
                {formatMarketCap(stock.marketCap)}
              </div>
            </div>
          </td>

          {/* Volume */}
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {stock.volumeData?.relativeVolume?.toFixed(1) || "N/A"}x
              </div>
              <div className="text-xs text-gray-500">
                {stock.volumeData?.volume
                  ? `${(stock.volumeData.volume / 1000000).toFixed(1)}M`
                  : "N/A"}
              </div>
              {(stock.volumeData?.relativeVolume || 0) > 2 && (
                <div className="flex items-center justify-end mt-1">
                  <Volume2 className="h-3 w-3 text-orange-500" />
                  <span className="text-xs text-orange-600 ml-1">High</span>
                </div>
              )}
            </div>
          </td>

          {/* Trade Setup Preview */}
          <td className="px-6 py-4 whitespace-nowrap">
            {tradeSetup.action !== "HOLD" ? (
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {tradeSetup.riskReward}
                </div>
                <div className="text-xs text-gray-500">
                  Entry: {formatCurrency(tradeSetup.entry?.price)}
                </div>
                <div className="text-xs text-gray-500">
                  Stop: {formatCurrency(tradeSetup.stopLoss?.price)}
                </div>
                <div className="text-xs text-green-600">
                  T1: {formatCurrency(tradeSetup.targets?.[0]?.price)}
                </div>
              </div>
            ) : (
              <div className="text-center text-sm text-gray-400">No Setup</div>
            )}
          </td>

          {/* Latest News */}
          <td className="px-6 py-4">
            <div className="max-w-48">
              {stock.latestNews ? (
                <div>
                  <div className="text-sm text-gray-900 truncate">
                    {stock.latestNews.headline}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(stock.latestNews.timestamp).toLocaleTimeString()}
                  </div>
                  {stock.latestNews.source && (
                    <div className="text-xs text-blue-600">
                      {stock.latestNews.source}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-400">No recent news</div>
              )}
            </div>
          </td>

          {/* Actions */}
          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onWatchlistToggle?.(stock.symbol)}
                className={`p-1 rounded ${
                  isInWatchlist
                    ? "text-yellow-500 hover:text-yellow-600"
                    : "text-gray-400 hover:text-yellow-500"
                }`}
                title={
                  isInWatchlist ? "Remove from watchlist" : "Add to watchlist"
                }
              >
                {isInWatchlist ? (
                  <Star className="h-4 w-4 fill-current" />
                ) : (
                  <StarOff className="h-4 w-4" />
                )}
              </button>

              <button
                onClick={() => toggleDetails(stock.symbol)}
                className="p-1 text-gray-400 hover:text-blue-600 rounded"
                title="View details"
              >
                <Eye className="h-4 w-4" />
              </button>

              <button
                onClick={() => setSelectedStock?.(stock)}
                className="p-1 text-gray-400 hover:text-green-600 rounded"
                title="Analyze"
              >
                <Target className="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>

        {/* Expanded Details Row */}
        {isExpanded && (
          <tr className="bg-gray-50">
            <td colSpan="10" className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* NISS Component Breakdown */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    NISS Components
                  </h4>
                  <div className="space-y-2">
                    {stock.nissComponents &&
                      Object.entries(stock.nissComponents).map(
                        ([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-sm text-gray-600 capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}:
                            </span>
                            <span
                              className={`text-sm font-medium ${
                                (value || 0) > 0
                                  ? "text-green-600"
                                  : (value || 0) < 0
                                  ? "text-red-600"
                                  : "text-gray-600"
                              }`}
                            >
                              {value?.toFixed(1) || "N/A"}
                            </span>
                          </div>
                        )
                      )}
                  </div>
                </div>

                {/* Complete Trade Setup */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Complete Trade Setup
                  </h4>
                  {tradeSetup.action !== "HOLD" ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Entry:</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(tradeSetup.entry?.price)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Stop Loss:
                        </span>
                        <span className="text-sm font-medium text-red-600">
                          {formatCurrency(tradeSetup.stopLoss?.price)} (
                          {tradeSetup.stopLoss?.percentage}%)
                        </span>
                      </div>
                      {tradeSetup.targets?.map((target, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Target {target.level}:
                          </span>
                          <span className="text-sm font-medium text-green-600">
                            {formatCurrency(target.price)} (
                            {target.percentage?.toFixed(1)}%)
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Risk:Reward:
                          </span>
                          <span className="text-sm font-bold text-blue-600">
                            {tradeSetup.riskReward}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      No clear trading setup available
                    </div>
                  )}
                </div>

                {/* Recent News Summary */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Info className="h-4 w-4 mr-2" />
                    Recent News Impact
                  </h4>
                  {stock.recentNews && stock.recentNews.length > 0 ? (
                    <div className="space-y-2">
                      {stock.recentNews.slice(0, 3).map((news, idx) => (
                        <div
                          key={idx}
                          className="border-l-2 border-gray-200 pl-3"
                        >
                          <div className="text-sm text-gray-900 line-clamp-2">
                            {news.headline}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {news.source} •{" "}
                            {new Date(news.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      No recent news available
                    </div>
                  )}
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  // Quick stats footer
  const renderQuickStats = () => (
    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-green-600">
            {quickStats.strongBuys}
          </div>
          <div className="text-sm text-gray-600">Strong Buys</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-500">
            {quickStats.buys}
          </div>
          <div className="text-sm text-gray-600">Buys</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-500">
            {quickStats.sells}
          </div>
          <div className="text-sm text-gray-600">Sells</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-600">
            {quickStats.highConfidence}
          </div>
          <div className="text-sm text-gray-600">High Confidence</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-800">
            {quickStats.avgNiss}
          </div>
          <div className="text-sm text-gray-600">Avg NISS</div>
        </div>
      </div>
    </div>
  );

  // Loading state
  const renderLoadingState = () => (
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <div className="flex items-center justify-center mb-4">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Screening Market for Opportunities
      </h3>
      <p className="text-gray-500 mb-4">
        Analyzing {totalResults || "200+"} stocks with Enhanced Trading Cheat
        Sheet criteria...
      </p>
      <div className="bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-blue-600 h-2 rounded-full animate-pulse"
          style={{ width: "65%" }}
        ></div>
      </div>
      <div className="text-sm text-gray-600">
        This may take up to 30 seconds for full analysis
      </div>
    </div>
  );

  // Empty state
  const renderEmptyState = () => (
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <div className="flex items-center justify-center mb-4">
        <AlertCircle className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No Stocks Match Current Filters
      </h3>
      <p className="text-gray-500 mb-6">
        Try adjusting your filters to see more opportunities, or refresh data to
        get latest results.
      </p>
      <div className="flex items-center justify-center space-x-3">
        <button
          onClick={clearAllFilters}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Clear All Filters
        </button>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Refresh Data
          </button>
        )}
      </div>
    </div>
  );

  // ============================================
  // MAIN COMPONENT RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && sortedStocks.length === 0 && renderLoadingState()}

      {/* Empty State */}
      {!loading && sortedStocks.length === 0 && renderEmptyState()}

      {/* Main Content */}
      {(sortedStocks.length > 0 || !loading) && (
        <div className="bg-white rounded-lg shadow overflow-hidden relative">
          {/* Enhanced Header */}
          {renderEnhancedHeader()}

          {/* Filter Controls */}
          {renderFilterControls()}

          {/* Results Table */}
          {sortedStocks.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                {renderTableHeader()}
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedStocks.map((stock, index) =>
                    renderTableRow(stock, index)
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Quick Stats Footer */}
          {sortedStocks.length > 0 && renderQuickStats()}

          {/* Loading Overlay for Refresh */}
          {refreshing && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex items-center space-x-3">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-lg font-medium text-gray-900">
                  Updating screening data...
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connection Status Indicator */}
      {connectionStatus !== "connected" && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">
              Connection issues detected. Data may be outdated.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockScreener;
