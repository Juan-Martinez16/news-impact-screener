// src/components/PerformanceTrackingTab.js - FIXED VERSION
// COMPLETE REPLACEMENT - This fixes prop mapping and data display

import React, { useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Activity,
} from "lucide-react";

const PerformanceTrackingTab = ({
  screeningResults = [], // FIXED: Changed from other prop names
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

  // Calculate performance metrics from screening results
  const performanceMetrics = useMemo(() => {
    if (!Array.isArray(screeningResults) || screeningResults.length === 0) {
      return {
        totalAnalyzed: 0,
        successRate: 0,
        avgNissScore: 0,
        topPerformers: [],
        sectorBreakdown: {},
        confidenceDistribution: {},
      };
    }

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

    // Top performers (highest NISS scores)
    const topPerformers = [...screeningResults]
      .sort((a, b) => (b.nissScore || 0) - (a.nissScore || 0))
      .slice(0, 5);

    // Sector breakdown (simulated based on symbol patterns)
    const sectorBreakdown = screeningResults.reduce((acc, stock) => {
      const sector = determineSector(stock.symbol);
      acc[sector] = (acc[sector] || 0) + 1;
      return acc;
    }, {});

    // Confidence distribution
    const confidenceDistribution = screeningResults.reduce((acc, stock) => {
      const confidence = stock.confidence || "MEDIUM";
      acc[confidence] = (acc[confidence] || 0) + 1;
      return acc;
    }, {});

    return {
      totalAnalyzed,
      successRate,
      avgNissScore,
      topPerformers,
      sectorBreakdown,
      confidenceDistribution,
    };
  }, [screeningResults]);

  // Helper function to determine sector (simplified)
  const determineSector = (symbol) => {
    if (!symbol) return "Other";

    const techStocks = [
      "AAPL",
      "MSFT",
      "GOOGL",
      "META",
      "NVDA",
      "AMZN",
      "TSLA",
    ];
    const financeStocks = ["JPM", "BAC", "WFC", "GS", "MS"];
    const healthStocks = ["JNJ", "PFE", "UNH", "ABT", "MRK"];

    if (techStocks.includes(symbol)) return "Technology";
    if (financeStocks.includes(symbol)) return "Finance";
    if (healthStocks.includes(symbol)) return "Healthcare";

    return "Other";
  };

  // Helper function to get trend color
  const getTrendColor = (value, threshold = 0) => {
    if (value > threshold) return "text-green-600";
    if (value < threshold) return "text-red-600";
    return "text-gray-600";
  };

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-800">
          <Activity className="w-5 h-5" />
          <h3 className="font-medium">Performance Tracking Error</h3>
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
          <span className="ml-2 text-gray-600">Calculating performance...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Performance Tracking
          </h2>
          <p className="text-sm text-gray-600">
            Analysis of {performanceMetrics.totalAnalyzed} stocks with{" "}
            {performanceMetrics.successRate.toFixed(1)}% success rate
          </p>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Activity className="w-4 h-4" />
          <span>Real-time metrics</span>
        </div>
      </div>

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
            {screeningResults.filter((s) => (s.nissScore || 0) >= 6).length} of{" "}
            {performanceMetrics.totalAnalyzed} stocks
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
          <div className="text-xs text-gray-500">
            Across all analyzed stocks
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">
              High Confidence
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {performanceMetrics.confidenceDistribution.HIGH || 0}
          </div>
          <div className="text-xs text-gray-500">High confidence signals</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Award className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-gray-700">Top Score</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">
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
      <div className="bg-white border border-gray-200 rounded-lg">
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {performanceMetrics.topPerformers.map((stock, index) => (
                <tr
                  key={stock.symbol}
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
                    <span className="text-sm font-medium text-gray-900">
                      {stock.symbol}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-green-600">
                      {(stock.nissScore || 0).toFixed(1)}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        stock.confidence === "HIGH"
                          ? "bg-green-100 text-green-800"
                          : stock.confidence === "MEDIUM"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {stock.confidence || "MEDIUM"}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`text-sm font-medium ${getTrendColor(
                        stock.changePercent || 0
                      )}`}
                    >
                      {stock.changePercent > 0 ? "+" : ""}
                      {(stock.changePercent || 0).toFixed(2)}%
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {stock.newsCount || 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Sector Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(performanceMetrics.sectorBreakdown).map(
              ([sector, count]) => (
                <div key={sector} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{sector}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${
                            (count / performanceMetrics.totalAnalyzed) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {count}
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
          <div className="space-y-3">
            {Object.entries(performanceMetrics.confidenceDistribution).map(
              ([confidence, count]) => (
                <div
                  key={confidence}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-gray-700">{confidence}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          confidence === "HIGH"
                            ? "bg-green-600"
                            : confidence === "MEDIUM"
                            ? "bg-yellow-600"
                            : "bg-red-600"
                        }`}
                        style={{
                          width: `${
                            (count / performanceMetrics.totalAnalyzed) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {count}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Performance Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {performanceMetrics.totalAnalyzed}
            </div>
            <div className="text-sm text-gray-600">Total Stocks Analyzed</div>
            <div className="text-xs text-gray-500 mt-1">
              Across all sectors and market caps
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {(
                ((performanceMetrics.confidenceDistribution.HIGH || 0) /
                  performanceMetrics.totalAnalyzed) *
                100
              ).toFixed(1)}
              %
            </div>
            <div className="text-sm text-gray-600">High Confidence Rate</div>
            <div className="text-xs text-gray-500 mt-1">
              Signals with institutional-grade confidence
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {Object.keys(performanceMetrics.sectorBreakdown).length}
            </div>
            <div className="text-sm text-gray-600">Sectors Covered</div>
            <div className="text-xs text-gray-500 mt-1">
              Diversified across market segments
            </div>
          </div>
        </div>

        {/* Additional Insights */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Market Insights
          </h4>
          <div className="text-sm text-gray-600">
            <p>
              • Market trend:{" "}
              <span className="font-medium">
                {marketContext.trend || "NEUTRAL"}
              </span>
            </p>
            <p>
              • Volatility level:{" "}
              <span className="font-medium">
                {marketContext.volatility || "NORMAL"}
              </span>
            </p>
            <p>
              • Analysis breadth:{" "}
              <span className="font-medium">
                {marketContext.breadth || "MIXED"}
              </span>
            </p>
            <p>
              • Average NISS effectiveness:{" "}
              <span className="font-medium text-green-600">
                {performanceMetrics.avgNissScore >= 6
                  ? "Strong"
                  : performanceMetrics.avgNissScore >= 4
                  ? "Moderate"
                  : "Developing"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceTrackingTab;
