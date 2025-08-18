// src/components/StockScreener.js - ENHANCED VERSION
// Fixed hoisting issues and added JM Trading Services brand styling with modal

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Eye,
  Star,
  Filter,
  X,
  ExternalLink,
  Calendar,
  DollarSign,
  BarChart3,
  Target,
} from "lucide-react";

const StockScreener = ({
  screeningResults = [],
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
    confidence: "ALL",
    sentiment: "ALL",
    nissThreshold: 0,
    sortBy: "nissScore",
    sortOrder: "desc",
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedStockModal, setSelectedStockModal] = useState(null);

  // ============================================
  // HELPER FUNCTIONS (MOVED BEFORE USEMEMO)
  // ============================================

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
        return "text-green-700 bg-green-100 border-green-200";
      case "MEDIUM":
        return "text-blue-700 bg-blue-100 border-blue-200";
      case "LOW":
        return "text-red-700 bg-red-100 border-red-200";
      default:
        return "text-gray-700 bg-gray-100 border-gray-200";
    }
  };

  // Helper function to get NISS score color
  const getNissScoreColor = (score) => {
    const numScore = parseFloat(score) || 0;
    if (numScore >= 8) return "text-green-600 font-bold";
    if (numScore >= 6) return "text-blue-600 font-semibold";
    if (numScore >= 4) return "text-yellow-600 font-medium";
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

  // Helper function to format market cap
  const formatMarketCap = (marketCap) => {
    if (!marketCap) return "N/A";
    const cap = parseFloat(marketCap);
    if (cap >= 1000000000000) return `$${(cap / 1000000000000).toFixed(1)}T`;
    if (cap >= 1000000000) return `$${(cap / 1000000000).toFixed(1)}B`;
    if (cap >= 1000000) return `$${(cap / 1000000).toFixed(1)}M`;
    return `$${cap.toFixed(0)}`;
  };

  // Helper function to generate mock market cap for demo
  const getMockMarketCap = (symbol) => {
    const symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA"];
    const baseValues = [3000, 2800, 1800, 1500, 800, 700, 2200];
    const index =
      symbols.indexOf(symbol) >= 0
        ? symbols.indexOf(symbol)
        : Math.abs(symbol?.charCodeAt(0) || 0) % 7;
    const base = baseValues[index] || 500;
    const variation = (Math.random() - 0.5) * 200;
    return (base + variation) * 1000000000; // Convert to actual number
  };

  // ============================================
  // MEMOIZED FILTERED RESULTS
  // ============================================

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

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleStockClick = (stock) => {
    setSelectedStockModal(stock);
    onSelectStock(stock);
  };

  const closeModal = () => {
    setSelectedStockModal(null);
  };

  // ============================================
  // MODAL COMPONENT
  // ============================================

  const StockDetailModal = ({ stock, onClose }) => {
    if (!stock) return null;

    const sentiment = determineSentiment(stock);
    const marketCap = getMockMarketCap(stock.symbol);
    const isInWatchlist = watchlist.some((w) => w.symbol === stock.symbol);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-400 to-blue-500 p-4 rounded-t-2xl text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-3xl font-bold">{stock.symbol}</div>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${getConfidenceColor(
                    stock.confidence
                  )}`}
                >
                  {stock.confidence || "MEDIUM"}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <div className="text-blue-600 text-sm font-medium">
                  NISS Score
                </div>
                <div
                  className={`text-2xl font-bold ${getNissScoreColor(
                    stock.nissScore
                  )}`}
                >
                  {(stock.nissScore || 0).toFixed(1)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                <div className="text-green-600 text-sm font-medium">
                  Current Price
                </div>
                <div className="text-2xl font-bold text-green-700">
                  ${(stock.currentPrice || 0).toFixed(2)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                <div className="text-purple-600 text-sm font-medium">
                  Change
                </div>
                <div className="text-lg font-semibold">
                  {formatChange(stock.changePercent, true)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                <div className="text-gray-600 text-sm font-medium">
                  Market Cap
                </div>
                <div className="text-lg font-bold text-gray-700">
                  {formatMarketCap(marketCap)}
                </div>
              </div>
            </div>

            {/* Sentiment & Analysis */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                Market Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Sentiment</div>
                  <div
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      sentiment === "BULLISH"
                        ? "bg-green-100 text-green-700"
                        : sentiment === "BEARISH"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {sentiment}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Volume</div>
                  <div className="text-gray-900 font-medium">
                    {stock.volume
                      ? Number(stock.volume).toLocaleString()
                      : "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {/* Trading Signals */}
            <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                <Target className="w-5 h-5 mr-2 text-blue-600" />
                Trading Signals
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-blue-600 mb-1">Entry Level</div>
                  <div className="text-blue-900 font-semibold">
                    ${((stock.currentPrice || 0) * 0.98).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-blue-600 mb-1">Stop Loss</div>
                  <div className="text-red-600 font-semibold">
                    ${((stock.currentPrice || 0) * 0.95).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-blue-600 mb-1">Target</div>
                  <div className="text-green-600 font-semibold">
                    ${((stock.currentPrice || 0) * 1.05).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={() => onToggleWatchlist(stock)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium transition-all ${
                  isInWatchlist
                    ? "bg-yellow-500 text-white hover:bg-yellow-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Star
                  className={`w-5 h-5 ${isInWatchlist ? "fill-current" : ""}`}
                />
                <span>
                  {isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                </span>
              </button>

              <button className="flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                <ExternalLink className="w-5 h-5" />
                <span>View Chart</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // ERROR STATES
  // ============================================

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-medium">Screening Error</h3>
          </div>
          <p className="text-red-700 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Screening stocks...</span>
        </div>
      </div>
    );
  }

  if (!Array.isArray(screeningResults) || screeningResults.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center space-x-2 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-medium">No Data Available</h3>
          </div>
          <p className="text-yellow-700 mt-2">
            No screening results found. Please check your backend connection and
            try refreshing.
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="p-6 space-y-6">
      {/* Header with Stats and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
              showFilters
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Enhanced Filter Panel */}
      {showFilters && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confidence Level
              </label>
              <select
                value={filters.confidence}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    confidence: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">All Levels</option>
                <option value="HIGH">High Confidence</option>
                <option value="MEDIUM">Medium Confidence</option>
                <option value="LOW">Low Confidence</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Market Sentiment
              </label>
              <select
                value={filters.sentiment}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, sentiment: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">All Sentiment</option>
                <option value="BULLISH">Bullish</option>
                <option value="BEARISH">Bearish</option>
                <option value="NEUTRAL">Neutral</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Min NISS Score: {filters.nissThreshold}
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
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>10</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sort Options
              </label>
              <div className="flex space-x-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, sortBy: e.target.value }))
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="nissScore">NISS Score</option>
                  <option value="change">Price Change</option>
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
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  {filters.sortOrder === "desc" ? "↓" : "↑"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Results Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  NISS Score
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Change
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Market Cap
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredResults.map((stock, index) => {
                const isInWatchlist = watchlist.some(
                  (w) => w.symbol === stock.symbol
                );
                const marketCap = getMockMarketCap(stock.symbol);

                return (
                  <tr
                    key={stock.symbol || index}
                    className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent cursor-pointer transition-all duration-150"
                    onClick={() => handleStockClick(stock)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-bold text-gray-900">
                          {stock.symbol || "N/A"}
                        </span>
                        {isInWatchlist && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-semibold ${getNissScoreColor(
                          stock.nissScore
                        )}`}
                      >
                        {(stock.nissScore || 0).toFixed(1)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getConfidenceColor(
                          stock.confidence
                        )}`}
                      >
                        {stock.confidence || "MEDIUM"}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        ${(stock.currentPrice || 0).toFixed(2)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">
                        {formatChange(stock.changePercent, true)}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-700">
                        {formatMarketCap(marketCap)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStockClick(stock);
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWatchlist(stock);
                          }}
                          className={`p-1 rounded transition-colors ${
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

        {filteredResults.length === 0 && screeningResults.length > 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-3">
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-blue-600">
                Avg NISS Score
              </div>
              <div className="text-2xl font-bold text-blue-900">
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
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-green-600">
                High Confidence
              </div>
              <div className="text-2xl font-bold text-green-900">
                {filteredResults.filter((s) => s.confidence === "HIGH").length}
              </div>
            </div>
            <Target className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-emerald-600">
                Bullish Signals
              </div>
              <div className="text-2xl font-bold text-emerald-900">
                {
                  filteredResults.filter(
                    (s) => determineSentiment(s) === "BULLISH"
                  ).length
                }
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-yellow-600">
                In Watchlist
              </div>
              <div className="text-2xl font-bold text-yellow-900">
                {
                  filteredResults.filter((s) =>
                    watchlist.some((w) => w.symbol === s.symbol)
                  ).length
                }
              </div>
            </div>
            <Star className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Stock Detail Modal */}
      {selectedStockModal && (
        <StockDetailModal stock={selectedStockModal} onClose={closeModal} />
      )}
    </div>
  );
};

export default StockScreener;
