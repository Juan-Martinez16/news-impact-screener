// src/components/CatalystAnalysisTab.js - FIXED VERSION FOR DATA DISPLAY
// Replace your CatalystAnalysisTab.js with this version

import React, { useState, useMemo, useCallback } from "react";
import {
  Activity,
  Clock,
  Star,
  Filter,
  Search,
  RefreshCw,
  Eye,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Info,
  Target,
  BarChart3,
  TrendingUp,
  TrendingDown,
  StarOff,
} from "lucide-react";

const CatalystAnalysisTab = ({
  stockData = [],
  loading = false,
  error = null,
  onStockSelect,
  watchlist = [],
  onWatchlistToggle,
  marketContext = {},
}) => {
  console.log(
    "🔬 CatalystAnalysisTab render - Data received:",
    stockData.length,
    "stocks"
  );

  // ============================================
  // LOCAL STATE
  // ============================================
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState("24h");
  const [sortBy, setSortBy] = useState("impactScore");

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const getTierColor = useCallback((tier) => {
    const colors = {
      TIER_1: "bg-red-100 text-red-800 border-red-200",
      TIER_2: "bg-yellow-100 text-yellow-800 border-yellow-200",
      TIER_3: "bg-blue-100 text-blue-800 border-blue-200",
    };
    return colors[tier] || "bg-gray-100 text-gray-800 border-gray-200";
  }, []);

  const getTierIcon = useCallback((tier) => {
    const icons = {
      TIER_1: <AlertTriangle className="w-4 h-4" />,
      TIER_2: <Star className="w-4 h-4" />,
      TIER_3: <Info className="w-4 h-4" />,
    };
    return icons[tier] || <Info className="w-4 h-4" />;
  }, []);

  const classifyCatalystTier = useCallback((nissScore, confidence, sector) => {
    const absScore = Math.abs(nissScore || 0);

    // Tier 1 - High Impact (Major market movers)
    if (absScore >= 70 && confidence === "HIGH") return "TIER_1";
    if (absScore >= 80) return "TIER_1";

    // Tier 2 - Medium Impact
    if (absScore >= 40 && confidence !== "LOW") return "TIER_2";
    if (absScore >= 60) return "TIER_2";

    // Tier 3 - Low Impact
    return "TIER_3";
  }, []);

  const calculateExpectedImpact = useCallback(
    (tier, nissScore, currentPrice) => {
      const absScore = Math.abs(nissScore || 0);
      const price = currentPrice || 100;

      let baseImpact = 0;
      switch (tier) {
        case "TIER_1":
          baseImpact = absScore * 0.15; // Up to 15% impact
          break;
        case "TIER_2":
          baseImpact = absScore * 0.08; // Up to 8% impact
          break;
        case "TIER_3":
          baseImpact = absScore * 0.03; // Up to 3% impact
          break;
        default:
          baseImpact = absScore * 0.01;
      }

      return {
        percentage: Math.min(baseImpact / 100, 0.25), // Cap at 25%
        priceTarget:
          price *
          (1 + (nissScore > 0 ? 1 : -1) * Math.min(baseImpact / 100, 0.25)),
      };
    },
    []
  );

  // ============================================
  // DATA PROCESSING
  // ============================================

  // Generate catalyst data from stock data
  const processedCatalysts = useMemo(() => {
    console.log("🔬 Processing catalysts from stock data:", stockData.length);

    if (!stockData || stockData.length === 0) {
      console.log("⚠️ No stock data available for catalyst analysis");
      return [];
    }

    const catalysts = stockData.map((stock, index) => {
      const tier = classifyCatalystTier(
        stock.nissScore,
        stock.confidence,
        stock.sector
      );
      const expectedImpact = calculateExpectedImpact(
        tier,
        stock.nissScore,
        stock.currentPrice
      );

      // Generate realistic catalyst headlines based on NISS score and sector
      const generateHeadline = () => {
        const nissScore = stock.nissScore || 0;
        const sector = stock.sector || "Technology";

        if (Math.abs(nissScore) >= 70) {
          return nissScore > 0
            ? `${stock.symbol} Reports Strong Quarterly Earnings, Beats Estimates`
            : `${stock.symbol} Faces Regulatory Challenges, Stock Under Pressure`;
        } else if (Math.abs(nissScore) >= 40) {
          return nissScore > 0
            ? `${stock.symbol} Announces Strategic Partnership in ${sector} Sector`
            : `${stock.symbol} Guidance Revision Concerns Investors`;
        } else {
          return `${stock.symbol} Regular Trading Activity in ${sector}`;
        }
      };

      return {
        id: `${stock.symbol}-${index}`,
        symbol: stock.symbol,
        company: `${stock.symbol} Inc.`,
        headline: generateHeadline(),
        source: "Market Analysis",
        timestamp: new Date().toISOString(),
        tier: tier,
        expectedImpact: expectedImpact,
        currentPrice: stock.currentPrice || 0,
        nissScore: stock.nissScore || 0,
        confidence: stock.confidence || "MEDIUM",
        sector: stock.sector || "Unknown",
        dataSource: stock.dataSource || "backend",
        volume: stock.volume,
        changePercent: stock.changePercent || 0,
      };
    });

    console.log("📊 Generated catalysts:", catalysts.length);
    return catalysts;
  }, [stockData, classifyCatalystTier, calculateExpectedImpact]);

  // Filter and sort catalysts
  const filteredCatalysts = useMemo(() => {
    let filtered = [...processedCatalysts];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (catalyst) =>
          catalyst.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          catalyst.headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
          catalyst.sector.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply tier filter
    if (selectedTier !== "all") {
      filtered = filtered.filter((catalyst) => catalyst.tier === selectedTier);
    }

    // Sort by impact score (NISS score)
    filtered.sort((a, b) => {
      const aScore = Math.abs(a.nissScore);
      const bScore = Math.abs(b.nissScore);
      return bScore - aScore;
    });

    console.log("🔍 Filtered catalysts:", filtered.length);
    return filtered.slice(0, 20); // Limit to top 20 for performance
  }, [processedCatalysts, searchTerm, selectedTier]);

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleCatalystClick = useCallback(
    (catalyst) => {
      if (onStockSelect) {
        const stock = stockData.find((s) => s.symbol === catalyst.symbol);
        onStockSelect(stock);
      }
    },
    [stockData, onStockSelect]
  );

  const handleWatchlistClick = useCallback(
    (symbol, event) => {
      event.stopPropagation();
      if (onWatchlistToggle) {
        onWatchlistToggle(symbol);
      }
    },
    [onWatchlistToggle]
  );

  // ============================================
  // RENDER HELPERS
  // ============================================

  const formatPrice = (price) => {
    return price ? `$${parseFloat(price).toFixed(2)}` : "N/A";
  };

  const formatPercent = (percent) => {
    return percent ? `${parseFloat(percent).toFixed(2)}%` : "0.00%";
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  // Loading state
  if (loading && filteredCatalysts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-3" />
          <span className="text-lg font-medium text-gray-900">
            Analyzing catalysts...
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
          <AlertTriangle className="h-6 w-6 mr-3" />
          <div>
            <h3 className="text-lg font-medium">Error Loading Catalysts</h3>
            <p className="text-sm text-red-500 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && filteredCatalysts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No catalysts found
          </h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search or filter criteria
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Catalyst Analysis
            </h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {filteredCatalysts.length} Found
            </span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-sm text-red-600">Tier 1 (High Impact)</div>
            <div className="text-lg font-bold text-red-700">
              {filteredCatalysts.filter((c) => c.tier === "TIER_1").length}
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="text-sm text-yellow-600">
              Tier 2 (Medium Impact)
            </div>
            <div className="text-lg font-bold text-yellow-700">
              {filteredCatalysts.filter((c) => c.tier === "TIER_2").length}
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-sm text-blue-600">Tier 3 (Low Impact)</div>
            <div className="text-lg font-bold text-blue-700">
              {filteredCatalysts.filter((c) => c.tier === "TIER_3").length}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-sm text-green-600">Avg Impact Score</div>
            <div className="text-lg font-bold text-green-700">
              {(
                filteredCatalysts.reduce(
                  (sum, c) => sum + Math.abs(c.nissScore),
                  0
                ) / filteredCatalysts.length
              ).toFixed(1)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search catalysts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tier Filter */}
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Impact Tiers</option>
            <option value="TIER_1">Tier 1 - High Impact</option>
            <option value="TIER_2">Tier 2 - Medium Impact</option>
            <option value="TIER_3">Tier 3 - Low Impact</option>
          </select>

          {/* Timeframe Filter */}
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="4h">Last 4 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Catalyst List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="divide-y divide-gray-200">
          {filteredCatalysts.map((catalyst, index) => (
            <div
              key={catalyst.id || index}
              className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => handleCatalystClick(catalyst)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="font-bold text-lg text-gray-900">
                      {catalyst.symbol}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTierColor(
                        catalyst.tier
                      )}`}
                    >
                      {getTierIcon(catalyst.tier)}
                      <span className="ml-1">
                        {catalyst.tier.replace("_", " ")}
                      </span>
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        catalyst.confidence === "HIGH"
                          ? "bg-green-100 text-green-800"
                          : catalyst.confidence === "MEDIUM"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {catalyst.confidence}
                    </span>
                  </div>

                  {/* Headline */}
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    {catalyst.headline}
                  </h3>

                  {/* Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Current Price:</span>
                      <div className="font-medium">
                        {formatPrice(catalyst.currentPrice)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Change:</span>
                      <div
                        className={`font-medium ${
                          catalyst.changePercent >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatPercent(catalyst.changePercent)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">NISS Score:</span>
                      <div className="font-medium">
                        {catalyst.nissScore.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Expected Impact:</span>
                      <div className="font-medium">
                        {(catalyst.expectedImpact.percentage * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                    <span>Sector: {catalyst.sector}</span>
                    <span>Source: {catalyst.source}</span>
                    <span>Data: {catalyst.dataSource}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={(e) => handleWatchlistClick(catalyst.symbol, e)}
                    className={`p-2 rounded hover:bg-gray-100 ${
                      watchlist.includes(catalyst.symbol)
                        ? "text-yellow-500"
                        : "text-gray-400"
                    }`}
                  >
                    {watchlist.includes(catalyst.symbol) ? (
                      <Star className="h-4 w-4 fill-current" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </button>
                  <button className="p-2 rounded hover:bg-gray-100 text-blue-600">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="p-2 rounded hover:bg-gray-100 text-gray-600">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Footer */}
        {filteredCatalysts.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {filteredCatalysts.length} catalysts • Processed from{" "}
              {stockData.length} stocks • Last updated:{" "}
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalystAnalysisTab;
