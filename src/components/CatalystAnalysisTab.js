// src/components/CatalystAnalysisTab.js - OPTIMIZED VERSION
// Reduced state complexity, improved performance, real data processing

import React, { useState, useMemo, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
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
  console.log("🔬 CatalystAnalysisTab v3.2.0 - OPTIMIZED");

  // ============================================
  // SIMPLIFIED STATE MANAGEMENT (6 states only)
  // ============================================
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState("24h");
  const [sortBy, setSortBy] = useState("impactScore");
  const [sortDirection, setSortDirection] = useState("desc");
  const [maxResults, setMaxResults] = useState(50); // Performance limit

  // ============================================
  // CATALYST PROCESSING (OPTIMIZED FOR PERFORMANCE)
  // ============================================

  // Process catalysts from real stock data
  const processedCatalysts = useMemo(() => {
    console.log(`🔬 Processing catalysts from ${stockData.length} stocks...`);

    if (!stockData.length) return [];

    const catalysts = [];

    // Limit processing to prevent performance issues
    const stocksToProcess = stockData.slice(0, 100); // Limit to 100 stocks

    stocksToProcess.forEach((stock) => {
      if (stock.recentNews && Array.isArray(stock.recentNews)) {
        stock.recentNews.forEach((news) => {
          if (!news || !news.headline) return;

          // Classify catalyst tier based on headline analysis
          const tier = classifyCatalystTier(news.headline, stock.sector);

          // Only include significant catalysts
          if (tier !== "IGNORE") {
            catalysts.push({
              id: `${stock.symbol}-${news.timestamp}`,
              symbol: stock.symbol,
              company: stock.company,
              headline: news.headline,
              source: news.source,
              timestamp: news.timestamp,
              tier: tier,
              expectedImpact: calculateExpectedImpact(
                tier,
                stock.nissScore,
                stock.currentPrice
              ),
              confidence: stock.confidence,
              sector: stock.sector,
              currentPrice: stock.currentPrice,
              nissScore: stock.nissScore,
              url: news.url,
              sentiment: news.sentiment || 0,
              impactScore: news.impactScore || 0,
              relevance: news.relevance || 0,
            });
          }
        });
      }
    });

    console.log(`✅ Processed ${catalysts.length} catalysts from real data`);
    return catalysts;
  }, [stockData]); // Only depends on stockData

  // Filter and sort catalysts
  const filteredCatalysts = useMemo(() => {
    let filtered = processedCatalysts;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (catalyst) =>
          catalyst.headline.toLowerCase().includes(term) ||
          catalyst.symbol.toLowerCase().includes(term) ||
          catalyst.company.toLowerCase().includes(term)
      );
    }

    // Tier filter
    if (selectedTier !== "all") {
      filtered = filtered.filter((catalyst) => catalyst.tier === selectedTier);
    }

    // Timeframe filter
    const now = new Date();
    const timeframePeriod = getTimeframePeriod(selectedTimeframe);
    if (timeframePeriod) {
      filtered = filtered.filter((catalyst) => {
        const catalystTime = new Date(catalyst.timestamp);
        return now - catalystTime <= timeframePeriod;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === "asc" ? comparison : -comparison;
    });

    // Limit results for performance
    return filtered.slice(0, maxResults);
  }, [
    processedCatalysts,
    searchTerm,
    selectedTier,
    selectedTimeframe,
    sortBy,
    sortDirection,
    maxResults,
  ]);

  // ============================================
  // HELPER FUNCTIONS (OPTIMIZED)
  // ============================================

  const classifyCatalystTier = useCallback((headline, sector) => {
    if (!headline) return "IGNORE";

    const headlineText = headline.toLowerCase();

    // Tier 1: Highest impact catalysts
    const tier1Keywords = [
      "fda approval",
      "fda approves",
      "merger",
      "acquisition",
      "acquired",
      "earnings beat",
      "earnings surprise",
      "ceo",
      "cfo",
      "bankruptcy",
      "split",
      "dividend increase",
      "buyback",
    ];

    // Tier 2: High impact catalysts
    const tier2Keywords = [
      "upgrade",
      "downgrade",
      "target",
      "partnership",
      "collaboration",
      "launch",
      "product",
      "patent",
      "clinical trial",
      "guidance",
      "revenue",
      "profit",
    ];

    // Tier 3: Medium impact catalysts
    const tier3Keywords = [
      "executive",
      "management",
      "contract",
      "agreement",
      "regulatory",
      "compliance",
      "investment",
      "expansion",
      "hiring",
    ];

    if (tier1Keywords.some((keyword) => headlineText.includes(keyword))) {
      return "TIER_1";
    } else if (
      tier2Keywords.some((keyword) => headlineText.includes(keyword))
    ) {
      return "TIER_2";
    } else if (
      tier3Keywords.some((keyword) => headlineText.includes(keyword))
    ) {
      return "TIER_3";
    }

    return "IGNORE";
  }, []);

  const calculateExpectedImpact = useCallback(
    (tier, nissScore, currentPrice) => {
      const baseVolatility = 0.02; // 2% base volatility

      const tierMultipliers = {
        TIER_1: { min: 0.05, max: 0.15, probability: 0.8 },
        TIER_2: { min: 0.02, max: 0.08, probability: 0.6 },
        TIER_3: { min: 0.01, max: 0.04, probability: 0.4 },
      };

      const multiplier = tierMultipliers[tier] || {
        min: 0,
        max: 0,
        probability: 0,
      };
      const nissImpact = (Math.abs(nissScore) / 100) * 0.5; // NISS influence

      return {
        minPrice: currentPrice * (1 + multiplier.min + nissImpact * 0.5),
        maxPrice: currentPrice * (1 + multiplier.max + nissImpact * 1.0),
        probability: multiplier.probability,
        tier: tier,
      };
    },
    []
  );

  const getTimeframePeriod = useCallback((timeframe) => {
    const periods = {
      "1h": 3600000,
      "4h": 14400000,
      "24h": 86400000,
      "7d": 604800000,
      "30d": 2592000000,
    };
    return periods[timeframe] || null;
  }, []);

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

  // ============================================
  // EVENT HANDLERS (STABLE)
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
  // RENDER METHOD
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-600" />
              Catalyst Analysis
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Real-time catalyst identification and impact analysis
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {filteredCatalysts.length} catalysts found
            </span>
            {loading && (
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search catalysts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tier Filter */}
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Tiers</option>
            <option value="TIER_1">Tier 1 (High Impact)</option>
            <option value="TIER_2">Tier 2 (Medium Impact)</option>
            <option value="TIER_3">Tier 3 (Low Impact)</option>
          </select>

          {/* Timeframe Filter */}
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1h">Last Hour</option>
            <option value="4h">Last 4 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortDirection}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split("-");
              setSortBy(field);
              setSortDirection(direction);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="impactScore-desc">Impact Score (High to Low)</option>
            <option value="impactScore-asc">Impact Score (Low to High)</option>
            <option value="timestamp-desc">Newest First</option>
            <option value="timestamp-asc">Oldest First</option>
            <option value="nissScore-desc">NISS Score (High to Low)</option>
            <option value="nissScore-asc">NISS Score (Low to High)</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Catalyst List */}
      <div className="space-y-4">
        {filteredCatalysts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Catalysts Found
            </h3>
            <p className="text-gray-600">
              {loading
                ? "Loading catalyst data from real APIs..."
                : "No catalysts match your current filters. Try adjusting the timeframe or tier selection."}
            </p>
          </div>
        ) : (
          filteredCatalysts.map((catalyst) => (
            <div
              key={catalyst.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleCatalystClick(catalyst)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="font-bold text-lg text-gray-900">
                      {catalyst.symbol}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getTierColor(
                        catalyst.tier
                      )}`}
                    >
                      {getTierIcon(catalyst.tier)}
                      <span className="ml-1">
                        {catalyst.tier.replace("_", " ")}
                      </span>
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
                    {catalyst.headline}
                  </h3>

                  {/* Metadata */}
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(catalyst.timestamp).toLocaleString()}
                    </span>
                    <span>{catalyst.source}</span>
                    <span>{catalyst.sector}</span>
                  </div>

                  {/* Impact Analysis */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Current Price
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${catalyst.currentPrice?.toFixed(2) || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        NISS Score
                      </p>
                      <p
                        className={`text-lg font-semibold ${
                          catalyst.nissScore > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {catalyst.nissScore?.toFixed(1) || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Expected Range
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        $
                        {catalyst.expectedImpact?.minPrice?.toFixed(2) || "N/A"}{" "}
                        - $
                        {catalyst.expectedImpact?.maxPrice?.toFixed(2) || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Probability
                      </p>
                      <p className="text-lg font-semibold text-blue-600">
                        {(catalyst.expectedImpact?.probability * 100)?.toFixed(
                          0
                        ) || 0}
                        %
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-2 ml-4">
                  <button
                    onClick={(e) => handleWatchlistClick(catalyst.symbol, e)}
                    className={`p-2 rounded-md transition-colors ${
                      watchlist.includes(catalyst.symbol)
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title={
                      watchlist.includes(catalyst.symbol)
                        ? "Remove from watchlist"
                        : "Add to watchlist"
                    }
                  >
                    <Star
                      className={`w-4 h-4 ${
                        watchlist.includes(catalyst.symbol)
                          ? "fill-current"
                          : ""
                      }`}
                    />
                  </button>

                  {catalyst.url && (
                    <a
                      href={catalyst.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      title="View original article"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More Button */}
      {filteredCatalysts.length >= maxResults && (
        <div className="text-center">
          <button
            onClick={() => setMaxResults((prev) => prev + 25)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Load More Catalysts
          </button>
        </div>
      )}
    </div>
  );
};

export default CatalystAnalysisTab;
