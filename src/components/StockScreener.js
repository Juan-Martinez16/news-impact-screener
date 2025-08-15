// src/components/StockScreener.js - FIXED VERSION FOR DATA DISPLAY
// Replace your StockScreener.js with this version

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
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  Target,
} from "lucide-react";

const StockScreener = ({
  // Data props - renamed to match what NewsImpactScreener sends
  stockData = [],

  // State props
  loading = false,
  error = null,
  searchQuery = "",
  onSearchChange,
  filters = {},
  onFiltersChange,
  sortBy = "nissScore",
  onSortChange,
  sortDirection = "desc",
  onSortDirectionChange,
  selectedStock,
  onStockSelect,

  // Action props
  onRefresh,
  watchlist = [],
  onWatchlistToggle,

  // Additional props
  availableSectors = [],
  marketContext = {},
}) => {
  console.log(
    "🎯 StockScreener render - Data received:",
    stockData.length,
    "stocks"
  );

  // ============================================
  // LOCAL STATE
  // ============================================
  const [selectedStocks, setSelectedStocks] = useState(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // ============================================
  // DATA PROCESSING
  // ============================================

  // Process and filter stocks
  const processedStocks = useMemo(() => {
    console.log("📊 Processing stocks:", stockData.length);

    if (!stockData || stockData.length === 0) {
      console.log("⚠️ No stock data available");
      return [];
    }

    // Apply search filter
    let filtered = stockData.filter((stock) => {
      if (!searchQuery) return true;
      return (
        stock.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.sector?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    // Apply other filters
    if (filters.sector && filters.sector !== "all") {
      filtered = filtered.filter((stock) => stock.sector === filters.sector);
    }

    if (filters.confidence && filters.confidence !== "all") {
      filtered = filtered.filter(
        (stock) => stock.confidence === filters.confidence
      );
    }

    // Apply NISS score range filter
    if (filters.nissRange && filters.nissRange !== "all") {
      filtered = filtered.filter((stock) => {
        const score = Math.abs(stock.nissScore || 0);
        switch (filters.nissRange) {
          case "high":
            return score >= 70;
          case "medium":
            return score >= 40 && score < 70;
          case "low":
            return score < 40;
          default:
            return true;
        }
      });
    }

    console.log("📋 Filtered stocks:", filtered.length);
    return filtered;
  }, [stockData, searchQuery, filters]);

  // Sort stocks
  const sortedStocks = useMemo(() => {
    if (processedStocks.length === 0) return [];

    const sorted = [...processedStocks].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle different data types
      if (
        sortBy === "nissScore" ||
        sortBy === "currentPrice" ||
        sortBy === "changePercent"
      ) {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = (bValue || "").toLowerCase();
      }

      if (sortDirection === "desc") {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    console.log("🔄 Sorted stocks:", sorted.length);
    return sorted;
  }, [processedStocks, sortBy, sortDirection]);

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleSort = useCallback(
    (field) => {
      if (sortBy === field) {
        onSortDirectionChange?.(sortDirection === "desc" ? "asc" : "desc");
      } else {
        onSortChange?.(field);
        onSortDirectionChange?.("desc");
      }
    },
    [sortBy, sortDirection, onSortChange, onSortDirectionChange]
  );

  const clearAllFilters = useCallback(() => {
    onSearchChange?.("");
    onFiltersChange?.({
      nissRange: "all",
      confidence: "all",
      marketCap: "all",
      sector: "all",
      volume: "all",
      timeframe: "24h",
    });
  }, [onSearchChange, onFiltersChange]);

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const getNissColor = (score) => {
    const absScore = Math.abs(score || 0);
    if (absScore >= 70) return "text-red-600 bg-red-50";
    if (absScore >= 40) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  const getChangeColor = (change) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  const formatPrice = (price) => {
    return price ? `$${parseFloat(price).toFixed(2)}` : "N/A";
  };

  const formatPercent = (percent) => {
    return percent ? `${parseFloat(percent).toFixed(2)}%` : "0.00%";
  };

  // ============================================
  // RENDER COMPONENTS
  // ============================================

  // Sort icon component
  const SortIcon = ({ field }) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === "desc" ? (
      <ArrowDown className="h-4 w-4 text-blue-600" />
    ) : (
      <ArrowUp className="h-4 w-4 text-blue-600" />
    );
  };

  // Loading state
  if (loading && sortedStocks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-3" />
          <span className="text-lg font-medium text-gray-900">
            Loading stock data...
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-6 w-6 mr-3" />
          <div>
            <h3 className="text-lg font-medium">Error Loading Data</h3>
            <p className="text-sm text-red-500 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && sortedStocks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No stocks match your criteria
          </h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your filters or search terms
          </p>
          <button
            onClick={clearAllFilters}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header with summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Stock Screener</h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Showing {sortedStocks.length} of {stockData.length} stocks
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3">
            <div className="text-sm text-gray-600">Total Stocks</div>
            <div className="text-lg font-bold text-gray-900">
              {stockData.length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-sm text-gray-600">High Confidence</div>
            <div className="text-lg font-bold text-green-600">
              {stockData.filter((s) => s.confidence === "HIGH").length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-sm text-gray-600">Bullish Signals</div>
            <div className="text-lg font-bold text-green-600">
              {stockData.filter((s) => (s.nissScore || 0) > 0).length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-sm text-gray-600">Bearish Signals</div>
            <div className="text-lg font-bold text-red-600">
              {stockData.filter((s) => (s.nissScore || 0) < 0).length}
            </div>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by symbol or sector..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Sector filter */}
          <select
            value={filters.sector || "all"}
            onChange={(e) =>
              onFiltersChange?.({ ...filters, sector: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Sectors</option>
            {availableSectors.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>

          {/* Confidence filter */}
          <select
            value={filters.confidence || "all"}
            onChange={(e) =>
              onFiltersChange?.({ ...filters, confidence: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Confidence</option>
            <option value="HIGH">High Confidence</option>
            <option value="MEDIUM">Medium Confidence</option>
            <option value="LOW">Low Confidence</option>
          </select>

          {/* Clear filters */}
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {/* Table header */}
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("symbol")}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Symbol</span>
                    <SortIcon field="symbol" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("currentPrice")}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Price</span>
                    <SortIcon field="currentPrice" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("changePercent")}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Change %</span>
                    <SortIcon field="changePercent" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("nissScore")}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>NISS Score</span>
                    <SortIcon field="nissScore" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sector
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table body */}
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedStocks.map((stock, index) => (
                <tr key={stock.symbol || index} className="hover:bg-gray-50">
                  {/* Symbol */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="font-medium text-gray-900">
                        {stock.symbol}
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatPrice(stock.currentPrice)}
                    </div>
                  </td>

                  {/* Change % */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`text-sm font-medium ${getChangeColor(
                        stock.changePercent
                      )}`}
                    >
                      {formatPercent(stock.changePercent)}
                    </div>
                  </td>

                  {/* NISS Score */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getNissColor(
                        stock.nissScore
                      )}`}
                    >
                      {(stock.nissScore || 0).toFixed(1)}
                    </span>
                  </td>

                  {/* Confidence */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        stock.confidence === "HIGH"
                          ? "bg-green-100 text-green-800"
                          : stock.confidence === "MEDIUM"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {stock.confidence || "LOW"}
                    </span>
                  </td>

                  {/* Sector */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stock.sector || "Unknown"}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {/* Watchlist toggle */}
                      <button
                        onClick={() => onWatchlistToggle?.(stock.symbol)}
                        className={`p-1 rounded hover:bg-gray-100 ${
                          watchlist.includes(stock.symbol)
                            ? "text-yellow-500"
                            : "text-gray-400"
                        }`}
                      >
                        {watchlist.includes(stock.symbol) ? (
                          <Star className="h-4 w-4 fill-current" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </button>

                      {/* View details */}
                      <button
                        onClick={() => onStockSelect?.(stock)}
                        className="p-1 rounded hover:bg-gray-100 text-blue-600"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        {sortedStocks.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Displaying {sortedStocks.length} stocks • Avg NISS Score:{" "}
              {(
                sortedStocks.reduce(
                  (sum, s) => sum + Math.abs(s.nissScore || 0),
                  0
                ) / sortedStocks.length
              ).toFixed(1)}{" "}
              • Data Source: {sortedStocks[0]?.dataSource || "backend"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockScreener;
