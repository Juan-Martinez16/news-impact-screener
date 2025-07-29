// src/components/CatalystAnalysisTab.js - FIXED VERSION
// Optimized to prevent browser hanging and performance issues

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  AlertCircle,
  ExternalLink,
  Filter,
  BarChart2,
  Zap,
  Target,
  DollarSign,
  Star,
  Info,
  ChevronDown,
  ChevronRight,
  Newspaper,
  Activity,
  RefreshCw,
  Bell,
  Search,
  Shield,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Minus,
} from "lucide-react";

const CatalystAnalysisTab = ({
  stocks = [], // FIXED: Use stocks prop instead of screeningResults
  selectedStock,
  setSelectedStock,
  alerts = [],
  marketRegime = {},
  loading = false,
  backendHealth = true,
  serviceStatus = {},
  connectionStatus = "connected",
}) => {
  // FIXED: Simplified state management to prevent excessive re-renders
  const [catalystView, setCatalystView] = useState("live");
  const [catalystFilter, setCatalystFilter] = useState("all");
  const [timeframe, setTimeframe] = useState("24h");
  const [expandedCatalyst, setExpandedCatalyst] = useState(null);
  const [sortBy, setSortBy] = useState("time"); // FIXED: Default to time-based sorting
  const [sortDirection, setSortDirection] = useState("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);

  // FIXED: Add processing state and refs for cleanup
  const [isProcessing, setIsProcessing] = useState(false);
  const processingTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  // FIXED: Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  // FIXED: Simplified and memoized helper functions with proper dependencies
  const categorizeNewsEvent = useCallback((newsItem) => {
    if (!newsItem?.headline && !newsItem?.title) return "Market News";

    const headline = (newsItem.headline || newsItem.title || "").toLowerCase();
    
    // FIXED: Simplified categorization to prevent performance issues
    const categories = {
      "Earnings": ["earnings", "quarterly", "q1", "q2", "q3", "q4", "revenue", "eps"],
      "FDA/Regulatory": ["fda", "approval", "clinical", "trial", "drug"],
      "M&A": ["merger", "acquisition", "acquire", "takeover", "buyout"],
      "Analyst Action": ["upgrade", "downgrade", "price target", "analyst"],
      "Partnership": ["partnership", "collaboration", "agreement", "deal"],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => headline.includes(keyword))) {
        return category;
      }
    }

    return "Market News";
  }, []);

  const calculateExpectedImpact = useCallback((newsItem, nissScore, changePercent) => {
    // FIXED: Simplified calculation to prevent performance issues
    const baseImpact = Math.abs(nissScore || 0) / 20; // Reduced complexity
    const sentiment = newsItem?.sentiment || 0;
    const volatilityBoost = Math.abs(changePercent || 0) / 5;
    
    const rawImpact = (baseImpact + volatilityBoost) * (1 + Math.abs(sentiment) * 0.3);
    const direction = (nissScore || 0) > 0 ? 1 : -1;
    
    const confidence = Math.abs(nissScore || 0) > 70 ? "HIGH" : 
                     Math.abs(nissScore || 0) > 50 ? "MEDIUM" : "LOW";

    return {
      min: rawImpact * 0.3 * direction,
      max: rawImpact * 1.2 * direction,
      confidence,
      probability: confidence === "HIGH" ? 0.8 : confidence === "MEDIUM" ? 0.6 : 0.4
    };
  }, []);

  const getSourceCredibility = useCallback((source) => {
    if (!source) return 50;
    
    // FIXED: Simplified credibility mapping
    const credibilityMap = {
      "reuters": 95, "bloomberg": 95, "wall street journal": 90,
      "cnbc": 85, "marketwatch": 80, "yahoo finance": 70
    };
    
    const sourceKey = source.toLowerCase();
    for (const [key, value] of Object.entries(credibilityMap)) {
      if (sourceKey.includes(key)) return value;
    }
    
    return 50;
  }, []);

  const isBreakingNews = useCallback((newsItem) => {
    if (!newsItem?.datetime) return false;
    const publishTime = (newsItem.datetime * 1000) || Date.now();
    const hoursSincePublished = (Date.now() - publishTime) / (1000 * 60 * 60);
    return hoursSincePublished < 2;
  }, []);

  // FIXED: Optimized catalyst processing with performance safeguards
  const processedCatalysts = useMemo(() => {
    if (!Array.isArray(stocks) || stocks.length === 0) {
      console.log("⚠️ No valid stock data for catalyst processing");
      return [];
    }

    setIsProcessing(true);
    
    // FIXED: Add timeout to prevent infinite processing
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    
    processingTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setIsProcessing(false);
      }
    }, 100);

    try {
      const catalysts = [];
      
      // FIXED: Limit processing to prevent browser hanging
      const stocksToProcess = stocks.slice(0, 50); // Process max 50 stocks
      
      console.log(`🔍 Processing ${stocksToProcess.length} stocks for catalysts`);

      stocksToProcess.forEach((stock, stockIndex) => {
        // FIXED: Add performance check - skip if processing takes too long
        if (stockIndex > 30 && catalysts.length > 100) {
          console.log("⏸️ Stopping catalyst processing to prevent performance issues");
          return;
        }

        const {
          symbol,
          nissScore = 0,
          nissData = {},
          tradeSetup = {},
          quote = {},
          news = [],
          technicals = {},
          sector = "Unknown",
          company,
          price
        } = stock;

        // FIXED: Only process stocks with news and limit news items
        if (news && news.length > 0) {
          const newsToProcess = news.slice(0, 2); // Max 2 news items per stock
          
          newsToProcess.forEach((newsItem, newsIndex) => {
            if (!newsItem?.headline && !newsItem?.title) return;

            const publishedAt = newsItem.datetime 
              ? new Date(newsItem.datetime * 1000) 
              : new Date();

            const catalyst = {
              id: `${symbol}-${newsIndex}-${stockIndex}`,
              ticker: symbol,
              company: company || symbol,
              sector: sector,
              
              // News data
              event: categorizeNewsEvent(newsItem),
              headline: newsItem.headline || newsItem.title || "No headline",
              source: newsItem.source || "Unknown",
              publishedAt: publishedAt,
              url: newsItem.url || "",
              
              // Scoring (simplified)
              sentiment: newsItem.sentiment || 0,
              nissScore: nissScore,
              confidence: nissData?.confidence || "LOW",
              currentPrice: quote?.price || price || 0,
              changePercent: quote?.changePercent || 0,
              volume: quote?.volume || 0,
              
              // Impact assessment (simplified)
              expectedImpact: calculateExpectedImpact(newsItem, nissScore, quote?.changePercent),
              timeframe: "1-2 days", // Simplified
              
              // Trading signal (simplified)
              signal: tradeSetup?.action || (nissScore > 60 ? "BUY" : nissScore < -60 ? "SELL" : "HOLD"),
              entry: tradeSetup?.entryPrice || quote?.price || price,
              stopLoss: tradeSetup?.stopLoss,
              targets: tradeSetup?.targets || [],
              riskReward: tradeSetup?.riskReward || 0,
              
              // Quality metrics (simplified)
              sourceCredibility: getSourceCredibility(newsItem.source),
              breakingNews: isBreakingNews(newsItem),
              
              // Metadata
              lastUpdate: new Date(),
            };

            catalysts.push(catalyst);
          });
        }
      });

      console.log(`📊 Processed ${catalysts.length} catalysts successfully`);
      
      // FIXED: Sort only by time to prevent complex sorting performance issues
      return catalysts.sort((a, b) => {
        if (a.breakingNews && !b.breakingNews) return -1;
        if (!a.breakingNews && b.breakingNews) return 1;
        return b.publishedAt - a.publishedAt;
      });
      
    } catch (error) {
      console.error("❌ Error processing catalysts:", error);
      setError("Failed to process catalyst data");
      return [];
    } finally {
      if (mountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [stocks, categorizeNewsEvent, calculateExpectedImpact, getSourceCredibility, isBreakingNews]);

  // FIXED: Simplified filtering with performance optimization
  const filteredCatalysts = useMemo(() => {
    if (!processedCatalysts || processedCatalysts.length === 0) return [];

    let filtered = [...processedCatalysts];

    // FIXED: Limit initial display to prevent performance issues
    filtered = filtered.slice(0, 100); // Max 100 catalysts displayed

    // Apply timeframe filter
    if (timeframe !== "7d") {
      const now = new Date();
      const cutoffHours = timeframe === "1h" ? 1 : 24;
      const cutoff = new Date(now.getTime() - cutoffHours * 60 * 60 * 1000);
      filtered = filtered.filter(c => c.publishedAt >= cutoff);
    }

    // Apply catalyst type filter
    if (catalystFilter !== "all") {
      filtered = filtered.filter(c => 
        c.event.toLowerCase().includes(catalystFilter.toLowerCase())
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(c =>
        c.ticker.toLowerCase().includes(query) ||
        c.company.toLowerCase().includes(query) ||
        c.headline.toLowerCase().includes(query)
      );
    }

    // FIXED: Simplified sorting to prevent performance issues
    if (sortBy === "impact") {
      filtered.sort((a, b) => {
        const aImpact = Math.abs(a.expectedImpact?.max || 0);
        const bImpact = Math.abs(b.expectedImpact?.max || 0);
        return sortDirection === "desc" ? bImpact - aImpact : aImpact - bImpact;
      });
    } else if (sortBy === "niss") {
      filtered.sort((a, b) => {
        const aScore = Math.abs(a.nissScore || 0);
        const bScore = Math.abs(b.nissScore || 0);
        return sortDirection === "desc" ? bScore - aScore : aScore - bScore;
      });
    }
    // Default: keep time-based sorting from processedCatalysts

    return filtered;
  }, [processedCatalysts, timeframe, catalystFilter, searchQuery, sortBy, sortDirection]);

  // FIXED: Simplified summary stats
  const summaryStats = useMemo(() => {
    const total = filteredCatalysts.length;
    const breaking = filteredCatalysts.filter(c => c.breakingNews).length;
    const bullish = filteredCatalysts.filter(c => c.signal === "BUY").length;
    const bearish = filteredCatalysts.filter(c => c.signal === "SELL").length;
    const highConfidence = filteredCatalysts.filter(c => c.confidence === "HIGH").length;

    return {
      total,
      breaking,
      bullish,
      bearish,
      highConfidence,
      avgNissScore: total > 0 ? 
        filteredCatalysts.reduce((sum, c) => sum + Math.abs(c.nissScore || 0), 0) / total : 0
    };
  }, [filteredCatalysts]);

  // FIXED: Simplified components to prevent rendering issues
  const ImpactChart = ({ impact }) => {
    if (!impact) return <span className="text-xs text-gray-500">No impact data</span>;

    const maxImpact = Math.max(Math.abs(impact.min || 0), Math.abs(impact.max || 0));
    if (maxImpact === 0) return <span className="text-xs text-gray-500">Neutral</span>;

    return (
      <div className="text-xs">
        <div className="flex justify-between">
          <span className="text-red-600">{(impact.min || 0).toFixed(1)}%</span>
          <span className="text-green-600">+{(impact.max || 0).toFixed(1)}%</span>
        </div>
        <div className="text-gray-500 mt-1">
          {(impact.probability * 100).toFixed(0)}% probability
        </div>
      </div>
    );
  };

  const SignalBadge = ({ signal, confidence }) => {
    const getStyle = () => {
      if (signal === "BUY") return "bg-green-100 text-green-800";
      if (signal === "SELL") return "bg-red-100 text-red-800";
      return "bg-gray-100 text-gray-800";
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStyle()}`}>
        {signal}
      </span>
    );
  };

  // FIXED: Show loading state properly
  if (loading || isProcessing) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
        <p className="mt-2 text-gray-600">
          {isProcessing ? "Processing catalysts..." : "Loading data..."}
        </p>
      </div>
    );
  }

  // FIXED: Show error state
  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => setError(null)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* FIXED: Simplified header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Catalyst Analysis</h2>
            <p className="text-sm text-gray-600 mt-1">
              News impact analysis for {stocks.length} stocks
            </p>
          </div>
        </div>

        {/* FIXED: Simplified stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-xl font-bold text-blue-900">{summaryStats.total}</div>
            <div className="text-sm text-blue-600">Active Catalysts</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-xl font-bold text-green-900">{summaryStats.bullish}</div>
            <div className="text-sm text-green-600">Bullish Signals</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-xl font-bold text-red-900">{summaryStats.bearish}</div>
            <div className="text-sm text-red-600">Bearish Signals</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-xl font-bold text-purple-900">{summaryStats.avgNissScore.toFixed(0)}</div>
            <div className="text-sm text-purple-600">Avg NISS</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-xl font-bold text-orange-900">{summaryStats.breaking}</div>
            <div className="text-sm text-orange-600">Breaking News</div>
          </div>
        </div>
      </div>

      {/* FIXED: Simplified controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search catalysts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={catalystFilter}
            onChange={(e) => setCatalystFilter(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2"
          >
            <option value="all">All Events</option>
            <option value="earnings">Earnings</option>
            <option value="fda">FDA/Regulatory</option>
            <option value="partnership">Partnerships</option>
            <option value="m&a">M&A</option>
            <option value="analyst">Analyst Actions</option>
          </select>

          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2"
          >
            <option value="time">Recent First</option>
            <option value="impact">By Impact</option>
            <option value="niss">By NISS Score</option>
          </select>
        </div>
      </div>

      {/* FIXED: Simplified catalyst feed */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Live Catalyst Feed</h3>
          <p className="text-sm text-gray-600 mt-1">
            {filteredCatalysts.length} catalysts found
          </p>
        </div>

        <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
          {filteredCatalysts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Newspaper className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No catalysts found matching your criteria</p>
            </div>
          ) : (
            filteredCatalysts.map((catalyst) => (
              <div
                key={catalyst.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{catalyst.ticker}</h4>
                      <p className="text-sm text-gray-600">{catalyst.company}</p>
                    </div>
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                      {catalyst.event}
                    </span>
                    <SignalBadge signal={catalyst.signal} confidence={catalyst.confidence} />
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      ${catalyst.currentPrice?.toFixed(2) || "N/A"}
                    </p>
                    <p className={`text-sm font-medium ${
                      (catalyst.changePercent || 0) > 0 ? "text-green-600" : 
                      (catalyst.changePercent || 0) < 0 ? "text-red-600" : "text-gray-600"
                    }`}>
                      {(catalyst.changePercent || 0) > 0 ? "+" : ""}{(catalyst.changePercent || 0).toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">{catalyst.headline}</h5>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{catalyst.source}</span>
                    <span>{catalyst.publishedAt.toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Expected Impact</p>
                    <ImpactChart impact={catalyst.expectedImpact} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Key Metrics</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>NISS Score:</span>
                        <span className="font-bold">{(catalyst.nissScore || 0).toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence:</span>
                        <span>{catalyst.confidence}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Source Quality:</span>
                        <span>{catalyst.sourceCredibility}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalystAnalysisTab;