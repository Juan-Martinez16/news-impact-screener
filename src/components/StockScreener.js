// src/components/StockScreener.js - COMPLETE ENHANCED VERSION
// Enhanced to work with NewsImpactScreener while maintaining all existing institutional features

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

  // Status props
  marketRegime = {},
  backendHealth = true,
  serviceStatus = {},
  connectionStatus = "connected",
  refreshing = false,
  exportInProgress = false,

  // Additional data
  availableSectors = [],
  summaryStats = {},
  watchlist = [],

  // Pagination props
  currentPage = 1,
  setCurrentPage,
  totalPages = 1,
  resultsPerPage = 25,
}) => {
  // Local component state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [viewMode, setViewMode] = useState("table"); // table, cards, compact
  const [showDetails, setShowDetails] = useState({});
  const [sortHistory, setSortHistory] = useState([]);

  // Local filter state for UI responsiveness
  const [localFilters, setLocalFilters] = useState(filters);

  // Sync local filters with parent when they change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Handle local filter changes with debouncing
  const handleLocalFilterChange = useCallback(
    (newFilters) => {
      setLocalFilters((prev) => ({ ...prev, ...newFilters }));

      // Debounce the parent update
      const timeoutId = setTimeout(() => {
        setFilters(newFilters);
      }, 300);

      return () => clearTimeout(timeoutId);
    },
    [setFilters]
  );

  // Handle sorting with history tracking
  const handleSort = useCallback(
    (field) => {
      let newDirection = "desc";

      if (sortBy === field) {
        newDirection = sortDirection === "desc" ? "asc" : "desc";
      }

      setSortBy(field);
      setSortDirection(newDirection);

      // Track sort history
      setSortHistory((prev) => [
        { field, direction: newDirection, timestamp: Date.now() },
        ...prev.slice(0, 4), // Keep last 5 sorts
      ]);
    },
    [sortBy, sortDirection, setSortBy, setSortDirection]
  );

  // Handle row selection
  const handleRowSelection = useCallback((symbol, isSelected) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(symbol);
      } else {
        newSet.delete(symbol);
      }
      return newSet;
    });
  }, []);

  // Handle bulk operations
  const handleBulkWatchlistAdd = useCallback(() => {
    selectedRows.forEach((symbol) => {
      if (!watchlist.includes(symbol)) {
        onWatchlistToggle(symbol);
      }
    });
    setSelectedRows(new Set());
  }, [selectedRows, watchlist, onWatchlistToggle]);

  // Toggle row details
  const toggleRowDetails = useCallback((symbol) => {
    setShowDetails((prev) => ({
      ...prev,
      [symbol]: !prev[symbol],
    }));
  }, []);

  // SECTION 2: ENHANCED HEADER & CONTROL COMPONENTS

  // Enhanced header with comprehensive status
  const renderEnhancedHeader = () => (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg p-6 border-b border-gray-200">
      <div className="flex justify-between items-start mb-6">
        {/* Enhanced Status Indicators */}
        <div className="flex items-center space-x-6">
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
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
                disabled={exportInProgress || stocks.length === 0}
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

      {/* Enhanced Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {summaryStats.total || stocks.length}
          </div>
          <div className="text-sm text-gray-600">Total Results</div>
          <div className="text-xs text-gray-500 mt-1">
            of {totalResults} screened
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {summaryStats.bullish || 0}
          </div>
          <div className="text-sm text-gray-600">Bullish Signals</div>
          <div className="text-xs text-gray-500 mt-1">
            {totalResults > 0
              ? (((summaryStats.bullish || 0) / totalResults) * 100).toFixed(1)
              : 0}
            % of total
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-red-600">
            {summaryStats.bearish || 0}
          </div>
          <div className="text-sm text-gray-600">Bearish Signals</div>
          <div className="text-xs text-gray-500 mt-1">
            {totalResults > 0
              ? (((summaryStats.bearish || 0) / totalResults) * 100).toFixed(1)
              : 0}
            % of total
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-purple-600">
            {summaryStats.highConfidence || 0}
          </div>
          <div className="text-sm text-gray-600">High Confidence</div>
          <div className="text-xs text-gray-500 mt-1">
            Premium opportunities
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-orange-600">
            {summaryStats.activeSignals || 0}
          </div>
          <div className="text-sm text-gray-600">Active Signals</div>
          <div className="text-xs text-gray-500 mt-1">Actionable trades</div>
        </div>

        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-indigo-600">
            {(summaryStats.avgNISS || 0).toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">Avg NISS Score</div>
          <div className="text-xs text-gray-500 mt-1">Market sentiment</div>
        </div>

        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-teal-600">
            {summaryStats.withNews || 0}
          </div>
          <div className="text-sm text-gray-600">With News</div>
          <div className="text-xs text-gray-500 mt-1">Catalyst driven</div>
        </div>
      </div>
    </div>
  );

  // Enhanced search and filter controls
  const renderSearchAndFilters = () => (
    <div className="bg-white p-6 border-b border-gray-200">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by symbol, company name, or sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
        {/* Sector Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sector
          </label>
          <select
            value={localFilters.sector || "all"}
            onChange={(e) =>
              handleLocalFilterChange({ sector: e.target.value })
            }
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

        {/* Market Cap Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Market Cap
          </label>
          <select
            value={localFilters.marketCap || "all"}
            onChange={(e) =>
              handleLocalFilterChange({ marketCap: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Caps</option>
            <option value="mega">Mega Cap (&gt; $200B)</option>
            <option value="large">Large Cap ($10B-$200B)</option>
            <option value="mid">Mid Cap ($2B-$10B)</option>
            <option value="small">Small Cap (&lt; $2B)</option>
          </select>
        </div>

        {/* NISS Threshold Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min NISS Score: {localFilters.nissThreshold || 0}
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={localFilters.nissThreshold || 0}
            onChange={(e) =>
              handleLocalFilterChange({
                nissThreshold: parseInt(e.target.value),
              })
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Confidence Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Confidence
          </label>
          <select
            value={localFilters.minConfidence || "all"}
            onChange={(e) =>
              handleLocalFilterChange({ minConfidence: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Levels</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium & High</option>
            <option value="LOW">All Levels</option>
          </select>
        </div>

        {/* Signal Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Signal Type
          </label>
          <select
            value={localFilters.signalType || "all"}
            onChange={(e) =>
              handleLocalFilterChange({ signalType: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Signals</option>
            <option value="BUY">Buy Signals</option>
            <option value="SELL">Sell Signals</option>
            <option value="HOLD">Hold/Neutral</option>
          </select>
        </div>

        {/* News Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            News Filter
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localFilters.showOnlyWithNews || false}
              onChange={(e) =>
                handleLocalFilterChange({ showOnlyWithNews: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Only with news</span>
          </label>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="flex items-center text-sm text-blue-600 hover:text-blue-700"
        >
          <Filter className="h-4 w-4 mr-1" />
          {showAdvancedFilters ? "Hide" : "Show"} Advanced Filters
        </button>

        {/* Bulk Actions */}
        {selectedRows.size > 0 && (
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              {selectedRows.size} selected
            </span>
            <button
              onClick={handleBulkWatchlistAdd}
              className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200"
            >
              Add to Watchlist
            </button>
            <button
              onClick={() => setSelectedRows(new Set())}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Volume Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Volume (millions)
              </label>
              <input
                type="number"
                placeholder="0.5"
                value={
                  localFilters.minVolume ? localFilters.minVolume / 1000000 : ""
                }
                onChange={(e) =>
                  handleLocalFilterChange({
                    minVolume: e.target.value
                      ? parseFloat(e.target.value) * 1000000
                      : null,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Price Range Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Price ($)
              </label>
              <input
                type="number"
                placeholder="1"
                value={localFilters.minPrice || ""}
                onChange={(e) =>
                  handleLocalFilterChange({
                    minPrice: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Price ($)
              </label>
              <input
                type="number"
                placeholder="1000"
                value={localFilters.maxPrice || ""}
                onChange={(e) =>
                  handleLocalFilterChange({
                    maxPrice: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* News Timeframe Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                News Timeframe
              </label>
              <select
                value={localFilters.timeframe || "1d"}
                onChange={(e) =>
                  handleLocalFilterChange({ timeframe: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="1d">Last 24 hours</option>
                <option value="1w">Last week</option>
                <option value="1m">Last month</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // SECTION 3: TABLE HEADER & SORTING COMPONENTS

  // Sortable table header component
  const SortableHeader = ({ field, children, className = "" }) => {
    const isActive = sortBy === field;
    const isAsc = sortDirection === "asc";

    return (
      <th
        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center space-x-1">
          <span>{children}</span>
          <div className="flex flex-col">
            {isActive ? (
              isAsc ? (
                <ArrowUp className="h-3 w-3 text-blue-600" />
              ) : (
                <ArrowDown className="h-3 w-3 text-blue-600" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 text-gray-400" />
            )}
          </div>
        </div>
      </th>
    );
  };

  // Table header with comprehensive sorting options
  const renderTableHeader = () => (
    <thead className="bg-gray-50">
      <tr>
        {/* Bulk Selection */}
        <th className="px-6 py-3 text-left">
          <input
            type="checkbox"
            checked={selectedRows.size === stocks.length && stocks.length > 0}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedRows(new Set(stocks.map((s) => s.symbol)));
              } else {
                setSelectedRows(new Set());
              }
            }}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </th>

        {/* Symbol & Company */}
        <SortableHeader field="symbol" className="min-w-[120px]">
          Symbol
        </SortableHeader>

        {/* NISS Score - Primary sort */}
        <SortableHeader field="nissScore" className="min-w-[100px]">
          <div className="flex items-center">
            <Zap className="h-3 w-3 mr-1" />
            NISS Score
          </div>
        </SortableHeader>

        {/* Confidence Level */}
        <SortableHeader field="confidence" className="min-w-[100px]">
          Confidence
        </SortableHeader>

        {/* Price & Change */}
        <SortableHeader field="price" className="min-w-[100px]">
          <div className="flex items-center">
            <DollarSign className="h-3 w-3 mr-1" />
            Price
          </div>
        </SortableHeader>

        <SortableHeader field="changePercent" className="min-w-[100px]">
          Change %
        </SortableHeader>

        {/* Volume */}
        <SortableHeader field="volume" className="min-w-[120px]">
          <div className="flex items-center">
            <Volume2 className="h-3 w-3 mr-1" />
            Volume
          </div>
        </SortableHeader>

        {/* Trading Signal */}
        <SortableHeader field="tradeSetup.action" className="min-w-[100px]">
          Signal
        </SortableHeader>

        {/* News Count */}
        <SortableHeader field="newsCount" className="min-w-[80px]">
          News
        </SortableHeader>

        {/* Sector */}
        <SortableHeader field="sector" className="min-w-[120px]">
          Sector
        </SortableHeader>

        {/* Actions */}
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
          Actions
        </th>
      </tr>
    </thead>
  );

  // Format large numbers for display
  const formatLargeNumber = (num) => {
    if (!num) return "N/A";

    if (num >= 1e9) {
      return `${(num / 1e9).toFixed(1)}B`;
    } else if (num >= 1e6) {
      return `${(num / 1e6).toFixed(1)}M`;
    } else if (num >= 1e3) {
      return `${(num / 1e3).toFixed(1)}K`;
    } else {
      return num.toLocaleString();
    }
  };

  // Format percentage with appropriate styling
  const formatPercentage = (value, includeSign = true) => {
    if (value === null || value === undefined) return "N/A";

    const formatted = `${includeSign && value > 0 ? "+" : ""}${value.toFixed(
      2
    )}%`;
    const colorClass =
      value > 0
        ? "text-green-600"
        : value < 0
        ? "text-red-600"
        : "text-gray-600";

    return <span className={colorClass}>{formatted}</span>;
  };

  // Get NISS score styling
  const getNISSScoreStyle = (score) => {
    if (!score && score !== 0)
      return { class: "text-gray-500", bg: "bg-gray-100" };

    const absScore = Math.abs(score);

    if (absScore >= 80) {
      return score > 0
        ? { class: "text-green-800 font-bold", bg: "bg-green-200" }
        : { class: "text-red-800 font-bold", bg: "bg-red-200" };
    } else if (absScore >= 60) {
      return score > 0
        ? { class: "text-green-700", bg: "bg-green-100" }
        : { class: "text-red-700", bg: "bg-red-100" };
    } else if (absScore >= 40) {
      return score > 0
        ? { class: "text-green-600", bg: "bg-green-50" }
        : { class: "text-red-600", bg: "bg-red-50" };
    } else {
      return { class: "text-gray-600", bg: "bg-gray-50" };
    }
  };

  // Get confidence badge styling
  const getConfidenceBadge = (confidence) => {
    const styles = {
      HIGH: "bg-green-100 text-green-800 border-green-200",
      MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
      LOW: "bg-red-100 text-red-800 border-red-200",
    };

    const style = styles[confidence] || styles.LOW;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}
      >
        {confidence || "LOW"}
      </span>
    );
  };

  // Get trading signal badge
  const getTradingSignalBadge = (tradeSetup) => {
    if (!tradeSetup || !tradeSetup.action) {
      return <span className="text-xs text-gray-500">No Signal</span>;
    }

    const { action, confidence } = tradeSetup;

    const styles = {
      BUY: "bg-green-100 text-green-800 border-green-200",
      SELL: "bg-red-100 text-red-800 border-red-200",
      HOLD: "bg-gray-100 text-gray-800 border-gray-200",
    };

    const style = styles[action] || styles.HOLD;

    return (
      <div className="flex flex-col items-center">
        <span
          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${style}`}
        >
          {action}
        </span>
        {confidence && (
          <span className="text-xs text-gray-500 mt-1">{confidence}</span>
        )}
      </div>
    );
  };

  // SECTION 4: TABLE ROWS & DATA DISPLAY COMPONENTS

  // Enhanced table row with comprehensive data display
  const renderTableRow = (stock, index) => {
    const isSelected = selectedRows.has(stock.symbol);
    const isInWatchlist = watchlist.includes(stock.symbol);
    const showDetail = showDetails[stock.symbol];
    const nissStyle = getNISSScoreStyle(stock.nissScore);

    return (
      <React.Fragment key={stock.symbol}>
        {/* Main Row */}
        <tr
          className={`${
            isSelected
              ? "bg-blue-50"
              : index % 2 === 0
              ? "bg-white"
              : "bg-gray-50"
          } hover:bg-blue-50 transition-colors cursor-pointer`}
          onClick={() => setSelectedStock(stock)}
        >
          {/* Selection Checkbox */}
          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) =>
                handleRowSelection(stock.symbol, e.target.checked)
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </td>

          {/* Symbol & Company */}
          <td className="px-6 py-4">
            <div className="flex items-center">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-gray-900">
                    {stock.symbol}
                  </span>
                  {isInWatchlist && (
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  )}
                </div>
                <div
                  className="text-sm text-gray-500 truncate max-w-[120px]"
                  title={stock.company}
                >
                  {stock.company || stock.symbol}
                </div>
                {stock.lastUpdate && (
                  <div className="text-xs text-gray-400">
                    {new Date(stock.lastUpdate).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </td>

          {/* NISS Score */}
          <td className="px-6 py-4">
            <div className="flex items-center">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${nissStyle.bg} ${nissStyle.class}`}
              >
                {stock.nissScore !== null && stock.nissScore !== undefined
                  ? stock.nissScore.toFixed(1)
                  : "N/A"}
              </span>
              {stock.nissScore && (
                <div className="ml-2">
                  {stock.nissScore > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
              )}
            </div>
            {stock.nissData?.riskMetrics && (
              <div className="text-xs text-gray-500 mt-1">
                Risk: {stock.nissData.riskMetrics.level}
              </div>
            )}
          </td>

          {/* Confidence Level */}
          <td className="px-6 py-4">
            {getConfidenceBadge(stock.nissData?.confidence)}
            {stock.nissData?.components && (
              <div className="text-xs text-gray-500 mt-1">
                {Object.keys(stock.nissData.components).length} factors
              </div>
            )}
          </td>

          {/* Price */}
          <td className="px-6 py-4">
            <div className="text-sm font-medium text-gray-900">
              ${(stock.price || stock.quote?.price || 0).toFixed(2)}
            </div>
            {stock.quote?.high && stock.quote?.low && (
              <div className="text-xs text-gray-500">
                ${stock.quote.low.toFixed(2)} - ${stock.quote.high.toFixed(2)}
              </div>
            )}
          </td>

          {/* Change Percentage */}
          <td className="px-6 py-4">
            {formatPercentage(
              stock.changePercent || stock.quote?.changePercent || 0
            )}
            {stock.quote?.previousClose && (
              <div className="text-xs text-gray-500">
                Prev: ${stock.quote.previousClose.toFixed(2)}
              </div>
            )}
          </td>

          {/* Volume */}
          <td className="px-6 py-4">
            <div className="text-sm text-gray-900">
              {formatLargeNumber(stock.volume || stock.quote?.volume)}
            </div>
            {stock.quote?.avgVolume && (
              <div className="text-xs text-gray-500">
                Avg: {formatLargeNumber(stock.quote.avgVolume)}
                {stock.volume && stock.quote.avgVolume && (
                  <span
                    className={`ml-1 ${
                      stock.volume > stock.quote.avgVolume * 1.5
                        ? "text-green-600"
                        : stock.volume < stock.quote.avgVolume * 0.5
                        ? "text-red-600"
                        : "text-gray-500"
                    }`}
                  >
                    ({((stock.volume / stock.quote.avgVolume) * 100).toFixed(0)}
                    %)
                  </span>
                )}
              </div>
            )}
          </td>

          {/* Trading Signal */}
          <td className="px-6 py-4">
            {getTradingSignalBadge(stock.tradeSetup)}
            {stock.tradeSetup?.entryPrice && (
              <div className="text-xs text-gray-500 mt-1">
                Entry: ${stock.tradeSetup.entryPrice}
              </div>
            )}
          </td>

          {/* News Count */}
          <td className="px-6 py-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-900">
                {stock.news?.length || 0}
              </span>
              {(stock.news?.length || 0) > 0 && (
                <div className="ml-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
              )}
            </div>
            {stock.news?.length > 0 && (
              <div className="text-xs text-gray-500">
                Latest:{" "}
                {new Date(
                  stock.news[0]?.datetime * 1000 || Date.now()
                ).toLocaleDateString()}
              </div>
            )}
          </td>

          {/* Sector */}
          <td className="px-6 py-4">
            <span className="text-sm text-gray-900">
              {stock.sector || "N/A"}
            </span>
            {stock.marketCap && (
              <div className="text-xs text-gray-500">{stock.marketCap}</div>
            )}
          </td>

          {/* Actions */}
          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center space-x-2">
              {/* Watchlist Toggle */}
              <button
                onClick={() => onWatchlistToggle(stock.symbol)}
                className={`p-1 rounded hover:bg-gray-100 ${
                  isInWatchlist ? "text-yellow-500" : "text-gray-400"
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

              {/* View Details */}
              <button
                onClick={() => toggleRowDetails(stock.symbol)}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                title="Toggle details"
              >
                <Eye className="h-4 w-4" />
              </button>

              {/* External Link (if available) */}
              {stock.url && (
                <a
                  href={stock.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                  title="View external source"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </td>
        </tr>

        {/* Expanded Details Row */}
        {showDetail && (
          <tr className="bg-blue-50">
            <td colSpan="11" className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* NISS Analysis Details */}
                {stock.nissData && (
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      NISS Analysis
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Sentiment:</span>
                        <span className="font-medium">
                          {stock.nissData.avgSentiment?.toFixed(2) || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Technical Strength:</span>
                        <span className="font-medium">
                          {stock.nissData.technicalStrength?.toFixed(2) ||
                            "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>News Relevance:</span>
                        <span className="font-medium">
                          {stock.nissData.avgRelevance?.toFixed(1) || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Market Alignment:</span>
                        <span className="font-medium">
                          {stock.nissData.marketAlignment?.toFixed(2) || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trading Setup Details */}
                {stock.tradeSetup && stock.tradeSetup.action !== "HOLD" && (
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Trading Setup
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Action:</span>
                        <span className="font-medium">
                          {stock.tradeSetup.action}
                        </span>
                      </div>
                      {stock.tradeSetup.entryPrice && (
                        <div className="flex justify-between text-sm">
                          <span>Entry Price:</span>
                          <span className="font-medium">
                            ${stock.tradeSetup.entryPrice}
                          </span>
                        </div>
                      )}
                      {stock.tradeSetup.stopLoss && (
                        <div className="flex justify-between text-sm">
                          <span>Stop Loss:</span>
                          <span className="font-medium">
                            ${stock.tradeSetup.stopLoss}
                          </span>
                        </div>
                      )}
                      {stock.tradeSetup.targets &&
                        stock.tradeSetup.targets.length > 0 && (
                          <div className="text-sm">
                            <span>Targets:</span>
                            <div className="mt-1 space-y-1">
                              {stock.tradeSetup.targets.map((target, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between text-xs bg-gray-50 px-2 py-1 rounded"
                                >
                                  <span>T{target.level}:</span>
                                  <span>
                                    ${target.price} (
                                    {target.probability
                                      ? `${(target.probability * 100).toFixed(
                                          0
                                        )}%`
                                      : "N/A"}
                                    )
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      {stock.tradeSetup.riskReward && (
                        <div className="flex justify-between text-sm">
                          <span>Risk/Reward:</span>
                          <span className="font-medium">
                            1:{stock.tradeSetup.riskReward}
                          </span>
                        </div>
                      )}
                      <div className="text-xs text-gray-600 mt-2">
                        {stock.tradeSetup.reasoning}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent News */}
                {stock.news && stock.news.length > 0 && (
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Recent News ({stock.news.length})
                    </h4>
                    <div className="space-y-3 max-h-40 overflow-y-auto">
                      {stock.news.slice(0, 3).map((newsItem, idx) => (
                        <div
                          key={idx}
                          className="border-b border-gray-100 pb-2 last:border-b-0"
                        >
                          <div className="text-sm font-medium text-gray-900 line-clamp-2">
                            {newsItem.headline || newsItem.title}
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-500">
                              {newsItem.source}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(
                                (newsItem.datetime || newsItem.publishedAt) *
                                  1000
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          {newsItem.sentiment !== undefined && (
                            <div className="flex items-center mt-1">
                              <span className="text-xs text-gray-500 mr-2">
                                Sentiment:
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  newsItem.sentiment > 0.1
                                    ? "bg-green-100 text-green-700"
                                    : newsItem.sentiment < -0.1
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {newsItem.sentiment > 0.1
                                  ? "Positive"
                                  : newsItem.sentiment < -0.1
                                  ? "Negative"
                                  : "Neutral"}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                      {stock.news.length > 3 && (
                        <div className="text-xs text-blue-600 text-center">
                          +{stock.news.length - 3} more articles
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  // SECTION 5: PAGINATION & MAIN RENDER FUNCTION

  // Enhanced pagination component
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
        <div className="flex items-center justify-between">
          {/* Results Info */}
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>

          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {(currentPage - 1) * resultsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * resultsPerPage, totalResults)}
                </span>{" "}
                of <span className="font-medium">{totalResults}</span> results
              </p>
            </div>

            <div>
              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Page Numbers */}
                {startPage > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentPage(1)}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      1
                    </button>
                    {startPage > 2 && (
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        ...
                      </span>
                    )}
                  </>
                )}

                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      page === currentPage
                        ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                {endPage < totalPages && (
                  <>
                    {endPage < totalPages - 1 && (
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        ...
                      </span>
                    )}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                {/* Next Button */}
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state component
  const renderLoadingState = () => (
    <div className="bg-white rounded-lg shadow">
      {renderEnhancedHeader()}
      {renderSearchAndFilters()}
      <div className="p-12 text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          Screening Stocks...
        </p>
        <p className="text-gray-600">
          Analyzing {serviceStatus.totalSymbols || "400+"} symbols with
          institutional-grade algorithms
        </p>
      </div>
    </div>
  );

  // Empty state component
  const renderEmptyState = () => (
    <div className="bg-white rounded-lg shadow">
      {renderEnhancedHeader()}
      {renderSearchAndFilters()}
      <div className="p-12 text-center">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          No Results Found
        </p>
        <p className="text-gray-600 mb-4">
          Try adjusting your filters or search criteria to find more stocks.
        </p>
        <button
          onClick={() => {
            setSearchQuery("");
            setFilters({
              marketCap: "all",
              sector: "all",
              nissThreshold: 0,
              minConfidence: "all",
              minVolume: null,
              minPrice: null,
              maxPrice: null,
              signalType: "all",
              showOnlyWithNews: false,
              timeframe: "1d",
            });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );

  // MAIN COMPONENT RENDER
  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && stocks.length === 0 && renderLoadingState()}

      {/* Empty State */}
      {!loading && stocks.length === 0 && renderEmptyState()}

      {/* Main Content */}
      {(stocks.length > 0 || !loading) && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Enhanced Header */}
          {renderEnhancedHeader()}

          {/* Search and Filters */}
          {renderSearchAndFilters()}

          {/* Results Table */}
          {stocks.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  {renderTableHeader()}
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stocks.map((stock, index) => renderTableRow(stock, index))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {renderPagination()}
            </>
          )}

          {/* Loading Overlay for Refresh */}
          {refreshing && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex items-center space-x-3">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-lg font-medium text-gray-900">
                  Updating data...
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats Footer */}
      {stocks.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-6">
              <span>
                <strong>{summaryStats.total || stocks.length}</strong> results
                displayed
              </span>
              <span>
                <strong>{summaryStats.activeSignals || 0}</strong> active
                trading signals
              </span>
              <span>
                <strong>{summaryStats.highConfidence || 0}</strong> high
                confidence opportunities
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-xs text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
              {connectionStatus !== "connected" && (
                <span className="flex items-center text-yellow-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Limited connectivity
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockScreener;
