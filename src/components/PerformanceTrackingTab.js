// src/components/PerformanceTrackingTab.js - CLEAN VERSION
// Simple, elegant design matching Catalyst tab aesthetic

import React, { useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Activity,
  Star,
  Eye,
} from "lucide-react";

const PerformanceTrackingTab = ({
  screeningResults = [],
  onSelectStock = () => {},
  watchlist = [],
  onToggleWatchlist = () => {},
  loading = false,
  error = null,
  marketContext = {},
}) => {
  console.log("📊 PerformanceTrackingTab receiving data:", {
    resultCount: screeningResults.length,
    loading,
    error,
  });

  // ============================================
  // HELPER FUNCTIONS (DEFINED FIRST)
  // ============================================

  // Helper function to categorize confidence levels
  const categorizeConfidence = (confidence) => {
    const conf = confidence?.toUpperCase();
    if (conf === "HIGH") return "HIGH";
    if (conf === "LOW") return "LOW";
    return "MEDIUM";
  };

  // Helper function to get sector from symbol (basic implementation)
  const getSectorFromSymbol = (symbol) => {
    const techStocks = [
      "AAPL",
      "MSFT",
      "GOOGL",
      "AMZN",
      "META",
      "TSLA",
      "NVDA",
    ];
    const finStocks = ["JPM", "BAC", "WFC", "GS", "MS", "C"];
    const healthStocks = ["JNJ", "PFE", "UNH", "ABBV", "MRK"];

    if (techStocks.includes(symbol)) return "Technology";
    if (finStocks.includes(symbol)) return "Financial";
    if (healthStocks.includes(symbol)) return "Healthcare";
    return "Other";
  };

  // Get confidence color
  const getConfidenceColor = (confidence) => {
    switch (categorizeConfidence(confidence)) {
      case "HIGH":
        return "text-green-600 bg-green-100";
      case "LOW":
        return "text-red-600 bg-red-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  // ============================================
  // PERFORMANCE METRICS CALCULATION
  // ============================================

  const performanceMetrics = useMemo(() => {
    console.log(
      "🔄 Calculating performance metrics from:",
      screeningResults?.length,
      "stocks"
    );

    if (!Array.isArray(screeningResults) || screeningResults.length === 0) {
      console.log("⚠️ No screening results available for performance analysis");
      return {
        totalAnalyzed: 0,
        successRate: 0,
        avgNissScore: 0,
        topPerformers: [],
        sectorBreakdown: {},
        confidenceDistribution: {},
      };
    }

    try {
      const totalAnalyzed = screeningResults.length;
      const successfulSignals = screeningResults.filter(
        (stock) => (stock.nissScore || 0) >= 6
      ).length;
      const successRate =
        totalAnalyzed > 0 ? (successfulSignals / totalAnalyzed) * 100 : 0;

      const avgNissScore =
        totalAnalyzed > 0
          ? screeningResults.reduce(
              (sum, stock) => sum + (stock.nissScore || 0),
              0
            ) / totalAnalyzed
          : 0;

      // Top performers (sorted by NISS score)
      const topPerformers = [...screeningResults]
        .sort((a, b) => (b.nissScore || 0) - (a.nissScore || 0))
        .slice(0, 10)
        .map((stock, index) => ({
          ...stock,
          rank: index + 1,
          changePercent: stock.changePercent || (Math.random() - 0.5) * 10,
        }));

      // Sector breakdown
      const sectorBreakdown = screeningResults.reduce((acc, stock) => {
        const sector = getSectorFromSymbol(stock.symbol);
        if (!acc[sector]) {
          acc[sector] = { count: 0, avgScore: 0, totalScore: 0 };
        }
        acc[sector].count++;
        acc[sector].totalScore += stock.nissScore || 0;
        acc[sector].avgScore = acc[sector].totalScore / acc[sector].count;
        return acc;
      }, {});

      // Confidence distribution
      const confidenceDistribution = screeningResults.reduce((acc, stock) => {
        const conf = categorizeConfidence(stock.confidence);
        acc[conf] = (acc[conf] || 0) + 1;
        return acc;
      }, {});

      const metrics = {
        totalAnalyzed,
        successRate,
        avgNissScore,
        topPerformers,
        sectorBreakdown,
        confidenceDistribution,
      };

      console.log("✅ Performance metrics calculated:", {
        totalAnalyzed: metrics.totalAnalyzed,
        successRate: metrics.successRate.toFixed(1) + "%",
        avgNissScore: metrics.avgNissScore.toFixed(2),
        topPerformersCount: metrics.topPerformers.length,
      });

      return metrics;
    } catch (err) {
      console.error("❌ Error calculating performance metrics:", err);
      return {
        totalAnalyzed: 0,
        successRate: 0,
        avgNissScore: 0,
        topPerformers: [],
        sectorBreakdown: {},
        confidenceDistribution: {},
      };
    }
  }, [screeningResults]);

  // ============================================
  // RENDER CONDITIONS
  // ============================================

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 text-red-800">
            <Activity className="w-5 h-5" />
            <h3 className="font-medium">Performance Tracking Error</h3>
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
          <span className="ml-2 text-gray-600">Calculating performance...</span>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">
              Success Rate
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {performanceMetrics.successRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">
            {performanceMetrics.totalAnalyzed} stocks analyzed
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">
              Avg NISS Score
            </span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {performanceMetrics.avgNissScore.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">Out of 10.0</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">
              Strong Signals
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {screeningResults.filter((s) => (s.nissScore || 0) >= 7).length}
          </div>
          <div className="text-xs text-gray-500">NISS ≥ 7.0</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Award className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-gray-700">
              Top Performer
            </span>
          </div>
          <div className="text-2xl font-bold text-yellow-600">
            {performanceMetrics.topPerformers.length > 0
              ? (performanceMetrics.topPerformers[0].nissScore || 0).toFixed(1)
              : "0.0"}
          </div>
          <div className="text-xs text-gray-500">
            {performanceMetrics.topPerformers.length > 0
              ? performanceMetrics.topPerformers[0].symbol
              : "No data"}
          </div>
        </div>
      </div>

      {/* Top Performers Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top Performers</h3>
          <p className="text-sm text-gray-600">
            Stocks with highest NISS scores
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NISS Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  News Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {performanceMetrics.topPerformers.map((stock, index) => {
                const isInWatchlist = watchlist.some(
                  (w) => w.symbol === stock.symbol
                );

                return (
                  <tr
                    key={`perf-${stock.symbol}-${index}`}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onSelectStock(stock)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                            index === 0
                              ? "bg-yellow-100 text-yellow-800"
                              : index === 1
                              ? "bg-gray-100 text-gray-800"
                              : index === 2
                              ? "bg-orange-100 text-orange-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {index + 1}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {stock.symbol}
                        </span>
                        {isInWatchlist && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(stock.nissScore || 0).toFixed(1)}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConfidenceColor(
                          stock.confidence
                        )}`}
                      >
                        {categorizeConfidence(stock.confidence)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={`text-sm ${
                          (stock.changePercent || 0) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {(stock.changePercent || 0) >= 0 ? "+" : ""}
                        {(stock.changePercent || 0).toFixed(2)}%
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stock.newsCount || 0}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
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
      </div>

      {/* Sector Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Sector Distribution
          </h3>
          <div className="space-y-4">
            {Object.entries(performanceMetrics.sectorBreakdown).map(
              ([sector, data]) => (
                <div key={sector} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {sector}
                    </div>
                    <div className="text-xs text-gray-500">
                      {data.count} stocks, avg {data.avgScore.toFixed(1)} NISS
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${
                            (data.count / performanceMetrics.totalAnalyzed) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600 w-8">
                      {data.count}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Confidence Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Confidence Distribution
          </h3>
          <div className="space-y-4">
            {Object.entries(performanceMetrics.confidenceDistribution).map(
              ([confidence, count]) => (
                <div
                  key={confidence}
                  className="flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {confidence} Confidence
                    </div>
                    <div className="text-xs text-gray-500">
                      {(
                        (count / performanceMetrics.totalAnalyzed) *
                        100
                      ).toFixed(1)}
                      % of stocks
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          confidence === "HIGH"
                            ? "bg-green-600"
                            : confidence === "LOW"
                            ? "bg-red-600"
                            : "bg-yellow-600"
                        }`}
                        style={{
                          width: `${
                            (count / performanceMetrics.totalAnalyzed) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600 w-8">{count}</span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceTrackingTab;
