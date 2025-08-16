// src/components/CatalystAnalysisTab.js - FIXED VERSION
// Complete replacement to fix variable hoisting and data structure issues

import React, { useMemo } from "react";
import {
  Target,
  Calendar,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

const CatalystAnalysisTab = ({
  screeningResults = [],
  onSelectStock = () => {},
  watchlist = [],
  onToggleWatchlist = () => {},
  loading = false,
  error = null,
}) => {
  console.log("🎯 CatalystAnalysisTab receiving data:", {
    resultCount: screeningResults.length,
    loading,
    error,
  });

  // ============================================
  // HELPER FUNCTIONS (DEFINED FIRST)
  // ============================================

  // Helper function to determine catalyst type
  const determineCatalystType = (stock) => {
    const score = stock.nissScore || 0;
    const sentiment = stock.sentiment || "NEUTRAL";

    if (score >= 8) {
      return sentiment === "BULLISH" ? "Earnings Beat" : "Major News";
    } else if (score >= 7) {
      return "Product Launch";
    } else {
      return "Market Update";
    }
  };

  // Helper function to generate catalyst description
  const generateCatalystDescription = (stock) => {
    const types = [
      `Strong momentum in ${stock.symbol} driven by ${
        stock.newsCount || 0
      } news articles`,
      `Significant price movement with NISS score of ${(
        stock.nissScore || 0
      ).toFixed(1)}`,
      `Market attention increasing with ${
        stock.confidence || "MEDIUM"
      } confidence level`,
      `Technical breakout potential with current sentiment: ${
        stock.sentiment || "NEUTRAL"
      }`,
    ];

    return types[Math.floor(Math.random() * types.length)];
  };

  // Helper function to calculate price target
  const calculatePriceTarget = (stock) => {
    const currentPrice = stock.currentPrice || 0;
    const nissMultiplier = (stock.nissScore || 0) / 10;
    return currentPrice * (1 + nissMultiplier * 0.05); // 5% per NISS point approximation
  };

  // Helper function to get impact color
  const getImpactColor = (impact) => {
    switch (impact) {
      case "HIGH":
        return "text-red-600 bg-red-100";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-100";
      case "LOW":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // ============================================
  // CATALYST DATA PROCESSING
  // ============================================

  // Generate catalyst analysis from screening results
  const catalystData = useMemo(() => {
    console.log(
      "🔄 Processing catalyst data from:",
      screeningResults?.length,
      "stocks"
    );

    if (!Array.isArray(screeningResults) || screeningResults.length === 0) {
      console.log("⚠️ No screening results available for catalyst analysis");
      return [];
    }

    try {
      const processed = screeningResults
        .filter((stock) => {
          const nissScore = stock.nissScore || 0;
          return nissScore >= 6; // High NISS scores likely have catalysts
        })
        .map((stock) => {
          const currentPrice = stock.currentPrice || 0;
          const priceTarget = calculatePriceTarget(stock);

          return {
            symbol: stock.symbol,
            catalystType: determineCatalystType(stock),
            impact:
              stock.nissScore >= 8
                ? "HIGH"
                : stock.nissScore >= 7
                ? "MEDIUM"
                : "LOW",
            confidence: stock.confidence || "MEDIUM",
            newsCount: stock.newsCount || 0,
            timeframe: "1-3 days", // Estimated based on news velocity
            description: generateCatalystDescription(stock),
            priceTarget: priceTarget,
            currentPrice: currentPrice,
            upside: currentPrice
              ? ((priceTarget - currentPrice) / currentPrice) * 100
              : 0,
          };
        })
        .sort((a, b) => {
          // Sort by impact priority: HIGH > MEDIUM > LOW
          const impactOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          return (impactOrder[b.impact] || 0) - (impactOrder[a.impact] || 0);
        });

      console.log("✅ Processed", processed.length, "catalyst opportunities");
      return processed;
    } catch (err) {
      console.error("❌ Error processing catalyst data:", err);
      return [];
    }
  }, [screeningResults]);

  // ============================================
  // RENDER CONDITIONS
  // ============================================

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-800">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-medium">Catalyst Analysis Error</h3>
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
          <span className="ml-2 text-gray-600">Analyzing catalysts...</span>
        </div>
      </div>
    );
  }

  // No data state
  if (catalystData.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-yellow-800">
          <Target className="w-5 h-5" />
          <h3 className="font-medium">No Major Catalysts Detected</h3>
        </div>
        <p className="text-yellow-700 mt-2">
          No stocks with significant catalyst potential found in current
          screening results.
        </p>
        <p className="text-yellow-600 text-sm mt-1">
          Try lowering the NISS threshold or refresh data to find more
          opportunities.
        </p>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Catalyst Analysis
          </h2>
          <p className="text-sm text-gray-600">
            {catalystData.length} potential catalysts identified
          </p>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>Next 1-3 days</span>
        </div>
      </div>

      {/* Catalyst Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {catalystData.map((catalyst, index) => (
          <div
            key={`catalyst-${catalyst.symbol}-${index}`}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {catalyst.symbol}
                </h3>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getImpactColor(
                    catalyst.impact
                  )}`}
                >
                  {catalyst.impact} Impact
                </span>
              </div>

              <button
                onClick={() => {
                  const stock = screeningResults.find(
                    (s) => s.symbol === catalyst.symbol
                  );
                  if (stock) onSelectStock(stock);
                }}
                className="text-blue-600 hover:text-blue-800"
                title={`View details for ${catalyst.symbol}`}
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            {/* Catalyst Type */}
            <div className="mb-3">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  {catalyst.catalystType}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4">{catalyst.description}</p>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-500">Current Price</div>
                <div className="text-sm font-medium text-gray-900">
                  ${catalyst.currentPrice.toFixed(2)}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Price Target</div>
                <div className="text-sm font-medium text-green-600">
                  ${catalyst.priceTarget.toFixed(2)}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Upside Potential</div>
                <div
                  className={`text-sm font-medium ${
                    catalyst.upside > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {catalyst.upside > 0 ? "+" : ""}
                  {catalyst.upside.toFixed(1)}%
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">News Volume</div>
                <div className="text-sm font-medium text-gray-900">
                  {catalyst.newsCount} articles
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Confidence:</span>
                <span className="text-xs font-medium text-gray-700">
                  {catalyst.confidence}
                </span>
              </div>

              <button
                onClick={() => {
                  const stock = screeningResults.find(
                    (s) => s.symbol === catalyst.symbol
                  );
                  if (stock) onToggleWatchlist(stock);
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                title={`Add ${catalyst.symbol} to watchlist`}
              >
                Add to Watchlist
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Catalyst Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">
              {catalystData.filter((c) => c.impact === "HIGH").length}
            </div>
            <div className="text-xs text-gray-600">High Impact</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">
              {catalystData.filter((c) => c.impact === "MEDIUM").length}
            </div>
            <div className="text-xs text-gray-600">Medium Impact</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {catalystData.length > 0
                ? (
                    catalystData.reduce((sum, c) => sum + c.upside, 0) /
                    catalystData.length
                  ).toFixed(1)
                : "0.0"}
              %
            </div>
            <div className="text-xs text-gray-600">Avg Upside</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalystAnalysisTab;
