// src/components/StockScreener.js - FIXED VERSION
// COMPLETE REPLACEMENT - This fixes prop mapping and data display

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Eye,
  Star,
  Filter,
} from "lucide-react";

const StockScreener = ({
  screeningResults = [], // FIXED: Changed from 'stocks' to 'screeningResults'
  onSelectStock = () => {},
  watchlist = [],
  onToggleWatchlist = () => {},
  loading = false,
  error = null,
}) => {
  console.log("🔍 StockScreener receiving data:", {
    resultCount: screeningResults.length,
    sampleData: screeningResults.slice(0, 2),
    loading,
    error,
  });

  // Filter and sort state
  const [filters, setFilters] = useState({
    confidence: "ALL", // ALL, HIGH, MEDIUM, LOW
    sentiment: "ALL", // ALL, BULLISH, BEARISH, NEUTRAL
    nissThreshold: 0, // Minimum NISS score
    sortBy: "nissScore", // nissScore, change, volume, symbol
    sortOrder: "desc", // desc, asc
  });

  const [showFilters, setShowFilters] = useState(false);

  // Memoized filtered and sorted results
  const filteredResults = useMemo(() => {
    if (!Array.isArray(screeningResults) || screeningResults.length === 0) {
      console.log("⚠️ No valid screening results to filter");
      return [];
    }

    let filtered = screeningResults.filter((stock) => {
      // Confidence filter
      if (
        filters.confidence !== "ALL" &&
        stock.confidence !== filters.confidence
      ) {
        return false;
      }

      // Sentiment filter
      if (filters.sentiment !== "ALL") {
        const stockSentiment = determineSentiment(stock);
        if (stockSentiment !== filters.sentiment) {
          return false;
        }
      }

      // NISS threshold filter
      if ((stock.nissScore || 0) < filters.nissThreshold) {
        return false;
      }

      return true;
    });

    // Sort results
    filtered.sort((a, b) => {
      let aVal = a[filters.sortBy] || 0;
      let bVal = b[filters.sortBy] || 0;

      // Handle special sorting cases
      if (filters.sortBy === "symbol") {
        aVal = (a.symbol || "").toString();
        bVal = (b.symbol || "").toString();
        return filters.sortOrder === "desc"
          ? bVal.localeCompare(aVal)
          : aVal.localeCompare(bVal);
      }

      // Numeric sorting
      const numA = parseFloat(aVal) || 0;
      const numB = parseFloat(bVal) || 0;

      return filters.sortOrder === "desc" ? numB - numA : numA - numB;
    });

    console.log(
      `✅ Filtered ${filtered.length} stocks from ${screeningResults.length} total`
    );
    return filtered;
  }, [screeningResults, filters]);

  // Helper function to determine sentiment from stock data
  const determineSentiment = (stock) => {
    if (stock.sentiment && typeof stock.sentiment === "string") {
      return stock.sentiment.toUpperCase();
    }

    // Infer sentiment from price change
    const change = stock.change || stock.changePercent || 0;
    if (change > 1) return "BULLISH";
    if (change < -1) return "BEARISH";
    return "NEUTRAL";
  };

  // Helper function to get confidence color
  const getConfidenceColor = (confidence) => {
    switch (confidence?.toUpperCase()) {
      case "HIGH":
        return "text-green-600 bg-green-100";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-100";
      case "LOW":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // Helper function to get NISS score color
  const getNissScoreColor = (score) => {
    const numScore = parseFloat(score) || 0;
    if (numScore >= 8) return "text-green-600 font-bold";
    if (numScore >= 6) return "text-yellow-600 font-medium";
    if (numScore >= 4) return "text-orange-600";
    return "text-gray-600";
  };

  // Helper function to format price change
  const formatChange = (change, isPercent = false) => {
    const num = parseFloat(change) || 0;
    const formatted = isPercent ? `${num.toFixed(2)}%` : `$${num.toFixed(2)}`;
    const colorClass = num >= 0 ? "text-green-600" : "text-red-600";
    const icon =
      num >= 0 ? (
        <TrendingUp className="inline w-3 h-3" />
      ) : (
        <TrendingDown className="inline w-3 h-3" />
      );

    return (
      <span className={colorClass}>
        {icon} {formatted}
      </span>
    );
  };

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-medium">Screening Error</h3>
        </div>
        <p className="text-red-700 mt-2">{error}</p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Screening stocks...</span>
        </div>
      </div>
    );
  }

  // No data state
  if (!Array.isArray(screeningResults) || screeningResults.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-yellow-800">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-medium">No Data Available</h3>
        </div>
        <p className="text-yellow-700 mt-2">
          No screening results found. Please check your backend connection and
          try refreshing.
        </p>
        <div className="mt-4 text-sm text-yellow-600">
          <p>Debugging info:</p>
          <p>• Screening results type: {typeof screeningResults}</p>
          <p>
            • Results length:{" "}
            {Array.isArray(screeningResults)
              ? screeningResults.length
              : "Not an array"}
          </p>
          <p>
            • Backend connected:{" "}
            {loading ? "Checking..." : "Check console for connection status"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Stock Screener
          </h2>
          <span className="text-sm text-gray-500">
            {filteredResults.length} of {screeningResults.length} stocks
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-1 px-3 py-2 text-sm rounded-md border ${
              showFilters
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Confidence Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confidence
              </label>
              <select
                value={filters.confidence}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    confidence: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="ALL">All Levels</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Sentiment Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sentiment
              </label>
              <select
                value={filters.sentiment}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, sentiment: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="ALL">All Sentiment</option>
                <option value="BULLISH">Bullish</option>
                <option value="BEARISH">Bearish</option>
                <option value="NEUTRAL">Neutral</option>
              </select>
            </div>

            {/* NISS Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min NISS Score
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={filters.nissThreshold}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    nissThreshold: parseFloat(e.target.value),
                  }))
                }
                className="w-full"
              />
              <div className="text-xs text-gray-500 mt-1">
                {filters.nissThreshold}+
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <div className="flex space-x-1">
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, sortBy: e.target.value }))
                  }
                  className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="nissScore">NISS Score</option>
                  <option value="change">Change %</option>
                  <option value="volume">Volume</option>
                  <option value="symbol">Symbol</option>
                </select>
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      sortOrder: prev.sortOrder === "desc" ? "asc" : "desc",
                    }))
                  }
                  className="px-2 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  {filters.sortOrder === "desc" ? "↓" : "↑"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NISS Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  News
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredResults.map((stock, index) => {
                const isInWatchlist = watchlist.some(
                  (w) => w.symbol === stock.symbol
                );

                return (
                  <tr
                    key={stock.symbol || index}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onSelectStock(stock)}
                  >
                    {/* Symbol */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {stock.symbol || "N/A"}
                        </span>
                        {isInWatchlist && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                    </td>

                    {/* NISS Score */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${getNissScoreColor(
                          stock.nissScore
                        )}`}
                      >
                        {(stock.nissScore || 0).toFixed(1)}
                      </span>
                    </td>

                    {/* Confidence */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(
                          stock.confidence
                        )}`}
                      >
                        {stock.confidence || "MEDIUM"}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        ${(stock.currentPrice || 0).toFixed(2)}
                      </span>
                    </td>

                    {/* Change */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {formatChange(stock.changePercent, true)}
                      </div>
                    </td>

                    {/* News Count */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {stock.newsCount || 0} articles
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStock(stock);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWatchlist(stock);
                          }}
                          className={`text-sm ${
                            isInWatchlist
                              ? "text-yellow-600 hover:text-yellow-800"
                              : "text-gray-400 hover:text-yellow-600"
                          }`}
                          title={
                            isInWatchlist
                              ? "Remove from Watchlist"
                              : "Add to Watchlist"
                          }
                        >
                          <Star
                            className={`w-4 h-4 ${
                              isInWatchlist ? "fill-current" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state for filtered results */}
        {filteredResults.length === 0 && screeningResults.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No stocks match your current filters.
            </p>
            <button
              onClick={() =>
                setFilters({
                  confidence: "ALL",
                  sentiment: "ALL",
                  nissThreshold: 0,
                  sortBy: "nissScore",
                  sortOrder: "desc",
                })
              }
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Avg NISS Score</div>
          <div className="text-lg font-semibold text-gray-900">
            {filteredResults.length > 0
              ? (
                  filteredResults.reduce(
                    (sum, stock) => sum + (stock.nissScore || 0),
                    0
                  ) / filteredResults.length
                ).toFixed(1)
              : "0.0"}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">High Confidence</div>
          <div className="text-lg font-semibold text-green-600">
            {filteredResults.filter((s) => s.confidence === "HIGH").length}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Bullish Signals</div>
          <div className="text-lg font-semibold text-green-600">
            {
              filteredResults.filter((s) => determineSentiment(s) === "BULLISH")
                .length
            }
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">In Watchlist</div>
          <div className="text-lg font-semibold text-yellow-600">
            {
              filteredResults.filter((s) =>
                watchlist.some((w) => w.symbol === s.symbol)
              ).length
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockScreener;
