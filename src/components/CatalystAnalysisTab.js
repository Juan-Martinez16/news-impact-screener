import React, { useState, useMemo } from "react";
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
} from "lucide-react";

const CatalystAnalysisTab = ({
  stockData,
  searchQuery,
  setSearchQuery,
  loading,
  screeningResults = [],
}) => {
  // State for catalyst tab
  const [catalystView, setCatalystView] = useState("live");
  const [catalystFilter, setCatalystFilter] = useState("all");
  const [timeframe, setTimeframe] = useState("24h");
  const [expandedCatalyst, setExpandedCatalyst] = useState(null);
  const [sortBy, setSortBy] = useState("impact");

  // Helper functions
  function getCompanyName(symbol) {
    const names = {
      VKTX: "Viking Therapeutics",
      SMCI: "Super Micro Computer",
      PLTR: "Palantir Technologies",
      TSLA: "Tesla Inc",
      NVDA: "NVIDIA Corporation",
      AAPL: "Apple Inc.",
      MSFT: "Microsoft Corporation",
      GOOGL: "Alphabet Inc.",
      AMD: "Advanced Micro Devices",
      META: "Meta Platforms",
      MRNA: "Moderna Inc.",
      BNTX: "BioNTech SE",
      RIVN: "Rivian Automotive",
      LCID: "Lucid Motors",
    };
    return names[symbol] || `${symbol} Inc.`;
  }

  function categorizeNewsEvent(newsItem) {
    const headline = (newsItem.headline || newsItem.title || "").toLowerCase();

    if (headline.includes("earnings") || headline.includes("quarterly"))
      return "Earnings";
    if (headline.includes("fda") || headline.includes("approval"))
      return "FDA/Regulatory";
    if (headline.includes("partnership") || headline.includes("deal"))
      return "Partnership";
    if (headline.includes("acquisition") || headline.includes("merger"))
      return "M&A";
    if (headline.includes("upgrade") || headline.includes("downgrade"))
      return "Analyst Action";
    if (headline.includes("clinical") || headline.includes("trial"))
      return "Clinical Trial";
    if (headline.includes("ceo") || headline.includes("executive"))
      return "Executive Change";
    if (headline.includes("product") || headline.includes("launch"))
      return "Product Launch";

    return "Market News";
  }

  function calculateExpectedImpact(newsItem, nissScore, changePercent) {
    const baseImpact = Math.abs(nissScore) / 10;
    const sentimentMultiplier = newsItem.sentiment
      ? Math.abs(newsItem.sentiment) * 2
      : 1;
    const volatilityBoost = Math.abs(changePercent || 0) / 2;

    const impact = (baseImpact + volatilityBoost) * sentimentMultiplier;

    return {
      min:
        nissScore > 0 ? Math.max(2, impact * 0.5) : -Math.max(5, impact * 1.2),
      max:
        nissScore > 0 ? Math.max(8, impact * 1.5) : -Math.max(2, impact * 0.4),
      confidence: impact > 10 ? "HIGH" : impact > 5 ? "MEDIUM" : "LOW",
    };
  }

  function calculateProbability(confidence, sentiment) {
    let baseProb =
      confidence === "HIGH" ? 0.75 : confidence === "MEDIUM" ? 0.6 : 0.45;
    const sentimentBoost = Math.abs(sentiment || 0) * 0.15;
    return Math.min(0.95, baseProb + sentimentBoost);
  }

  function getEventTimeframe(newsItem) {
    const event = categorizeNewsEvent(newsItem);
    const timeframes = {
      Earnings: "1-2 days",
      "FDA/Regulatory": "1-3 days",
      Partnership: "1 day",
      "M&A": "1-5 days",
      "Analyst Action": "1-2 days",
      "Clinical Trial": "1-3 days",
      "Executive Change": "2-5 days",
      "Product Launch": "1-3 days",
      "Market News": "1 day",
    };
    return timeframes[event] || "1-2 days";
  }

  function determineSignal(nissScore) {
    if (nissScore > 75) return "STRONG BUY";
    if (nissScore > 60) return "BUY";
    if (nissScore < -60) return "SELL";
    if (nissScore < -75) return "STRONG SELL";
    return "HOLD";
  }

  function determineConfidence(nissScore) {
    if (Math.abs(nissScore) > 75) return "HIGH";
    if (Math.abs(nissScore) > 60) return "MEDIUM";
    return "LOW";
  }

  function calculatePricePosition(quote) {
    if (!quote) return "Unknown";
    // Simplified calculation - in real implementation would use SMA data
    const change = quote.changePercent || 0;
    if (change > 2) return "Above Key Levels";
    if (change < -2) return "Below Key Levels";
    return "At Key Levels";
  }

  function getSourceCredibility(source) {
    const credibilityMap = {
      Reuters: 95,
      Bloomberg: 95,
      WSJ: 90,
      "Financial Times": 90,
      CNBC: 80,
      MarketWatch: 75,
      "Yahoo Finance": 70,
      "Seeking Alpha": 65,
      "The Motley Fool": 60,
    };
    return credibilityMap[source] || 50;
  }

  function isBreakingNews(newsItem) {
    const publishTime = newsItem.datetime
      ? new Date(newsItem.datetime * 1000)
      : new Date();
    const now = new Date();
    const hoursSincePublished = (now - publishTime) / (1000 * 60 * 60);
    return hoursSincePublished < 2;
  }

  function calculateMarketRelevance(newsItem, sector) {
    const headline = (newsItem.headline || "").toLowerCase();
    const sectorKeywords = {
      technology: ["tech", "software", "cloud", "ai", "chip"],
      healthcare: ["drug", "fda", "clinical", "therapy", "medical"],
      automotive: ["ev", "electric", "vehicle", "auto", "battery"],
    };

    const keywords = sectorKeywords[sector?.toLowerCase()] || [];
    const relevanceScore = keywords.reduce((score, keyword) => {
      return headline.includes(keyword) ? score + 20 : score;
    }, 50);

    return Math.min(100, relevanceScore);
  }

  function generateUpcomingCatalysts() {
    return [
      {
        id: "upcoming-1",
        ticker: "TSLA",
        company: "Tesla Inc",
        sector: "Automotive",
        event: "Earnings",
        headline: "Tesla Q3 2025 Earnings Release",
        source: "Tesla IR",
        publishedAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        sentiment: 0,
        nissScore: 0,
        confidence: "MEDIUM",
        currentPrice: 245.5,
        expectedImpact: { min: -8, max: 12, confidence: "MEDIUM" },
        probability: 0.65,
        timeframe: "1-2 days",
        signal: "WATCH",
        sourceCredibility: 95,
        breakingNews: false,
        marketRelevance: 85,
        isUpcoming: true,
        volumeRatio: "1.0",
        pricePosition: "At Key Levels",
      },
      {
        id: "upcoming-2",
        ticker: "MRNA",
        company: "Moderna Inc",
        sector: "Healthcare",
        event: "FDA/Regulatory",
        headline: "FDA Decision on New mRNA Vaccine Platform Expected",
        source: "FDA",
        publishedAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        sentiment: 0.3,
        nissScore: 0,
        confidence: "HIGH",
        currentPrice: 68.2,
        expectedImpact: { min: -5, max: 25, confidence: "HIGH" },
        probability: 0.8,
        timeframe: "1-3 days",
        signal: "WATCH",
        sourceCredibility: 98,
        breakingNews: false,
        marketRelevance: 90,
        isUpcoming: true,
        volumeRatio: "1.0",
        pricePosition: "At Key Levels",
      },
    ];
  }

  // FIXED: Enhanced catalyst data processing
  const processedCatalysts = useMemo(() => {
    const catalysts = [];

    // Process screening results if available (from InstitutionalDataService)
    if (screeningResults && screeningResults.length > 0) {
      screeningResults.forEach((stock) => {
        // Enhanced destructuring to handle InstitutionalDataService structure
        const {
          symbol,
          nissScore = 0,
          nissData = {},
          tradeSetup = {},
          quote = {},
          news = [],
          sector = "Unknown",
          company,
        } = stock;

        // Create catalyst entries for each significant news item
        news.slice(0, 3).forEach((newsItem, index) => {
          const catalyst = {
            id: `${symbol}-${index}`,
            ticker: symbol,
            company: company || getCompanyName(symbol),
            sector: sector,
            event: categorizeNewsEvent(newsItem),
            headline: newsItem.headline || newsItem.title || "No headline",
            source: newsItem.source || "Unknown",
            publishedAt: newsItem.datetime
              ? new Date(newsItem.datetime * 1000)
              : new Date(),
            sentiment: newsItem.sentiment || 0,

            // Core Analysis - using InstitutionalDataService data
            nissScore: nissScore,
            confidence: nissData?.confidence || determineConfidence(nissScore),
            currentPrice: quote?.price || 0,
            changePercent: quote?.changePercent || 0,
            volume: quote?.volume || 0,
            avgVolume: quote?.avgVolume || quote?.volume || 0,

            // Impact Assessment
            expectedImpact: calculateExpectedImpact(
              newsItem,
              nissScore,
              quote?.changePercent
            ),
            probability: calculateProbability(
              nissData?.confidence,
              newsItem.sentiment
            ),
            timeframe: getEventTimeframe(newsItem),

            // Trading Setup from InstitutionalDataService
            signal: tradeSetup?.action || determineSignal(nissScore),
            entry: tradeSetup?.entry || quote?.price,
            stopLoss: tradeSetup?.stopLoss,
            targets: tradeSetup?.targets || [],
            riskReward: tradeSetup?.riskReward || 0,

            // Key Metrics
            volumeRatio:
              quote?.volume && quote?.avgVolume
                ? (quote.volume / quote.avgVolume).toFixed(1)
                : "1.0",
            pricePosition: calculatePricePosition(quote),

            // News Quality Metrics
            sourceCredibility: getSourceCredibility(newsItem.source),
            breakingNews: isBreakingNews(newsItem),
            marketRelevance: calculateMarketRelevance(newsItem, sector),

            // Additional context
            url: newsItem.url,
            related: newsItem.related || [],
          };

          catalysts.push(catalyst);
        });
      });
    }

    // ALSO PROCESS stockData for backward compatibility (legacy DataService format)
    if (stockData && Object.keys(stockData).length > 0) {
      Object.entries(stockData).forEach(([symbol, data]) => {
        // Only add if not already in screeningResults
        const existsInScreening = screeningResults.some(
          (s) => s.symbol === symbol
        );
        if (!existsInScreening && data.news && data.news.length > 0) {
          // Process legacy stockData structure
          data.news.slice(0, 2).forEach((newsItem, index) => {
            const catalyst = {
              id: `${symbol}-legacy-${index}`,
              ticker: symbol,
              company: getCompanyName(symbol),
              sector: data.sector || "Unknown",
              event: categorizeNewsEvent(newsItem),
              headline: newsItem.headline || newsItem.title || "No headline",
              source: newsItem.source || "Unknown",
              publishedAt: newsItem.datetime
                ? new Date(newsItem.datetime * 1000)
                : new Date(),
              sentiment: newsItem.sentiment || 0,

              // Use legacy data structure
              nissScore: data.nissScore || 0,
              confidence: determineConfidence(data.nissScore || 0),
              currentPrice: data.quote?.price || 0,
              changePercent: data.quote?.changePercent || 0,
              volume: data.quote?.volume || 0,
              avgVolume: data.quote?.avgVolume || data.quote?.volume || 0,

              // Impact Assessment
              expectedImpact: calculateExpectedImpact(
                newsItem,
                data.nissScore || 0,
                data.quote?.changePercent
              ),
              probability: calculateProbability(
                determineConfidence(data.nissScore || 0),
                newsItem.sentiment
              ),
              timeframe: getEventTimeframe(newsItem),

              // Trading Setup
              signal: determineSignal(data.nissScore || 0),
              entry: data.quote?.price,
              stopLoss: null,
              targets: [],
              riskReward: 0,

              // Key Metrics
              volumeRatio:
                data.quote?.volume && data.quote?.avgVolume
                  ? (data.quote.volume / data.quote.avgVolume).toFixed(1)
                  : "1.0",
              pricePosition: calculatePricePosition(data.quote),

              // News Quality Metrics
              sourceCredibility: getSourceCredibility(newsItem.source),
              breakingNews: isBreakingNews(newsItem),
              marketRelevance: calculateMarketRelevance(newsItem, data.sector),

              // Additional context
              url: newsItem.url,
              related: newsItem.related || [],
            };

            catalysts.push(catalyst);
          });
        }
      });
    }

    // Add mock upcoming catalysts for demonstration
    const upcomingCatalysts = generateUpcomingCatalysts();

    return [...catalysts, ...upcomingCatalysts];
  }, [screeningResults, stockData]); // Both dependencies are important

  // Rest of Part 2 stays the same...
  // Filter and sort catalysts
  const filteredCatalysts = useMemo(() => {
    let filtered = processedCatalysts;

    // Filter by view type
    if (catalystView === "live") {
      const now = new Date();
      const cutoff = new Date(
        now.getTime() -
          (timeframe === "24h" ? 24 : timeframe === "7d" ? 168 : 1) *
            60 *
            60 *
            1000
      );
      filtered = filtered.filter((c) => c.publishedAt >= cutoff);
    } else if (catalystView === "calendar") {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(
        (c) => c.publishedAt >= now && c.publishedAt <= futureDate
      );
    }

    // Filter by catalyst type
    if (catalystFilter !== "all") {
      filtered = filtered.filter((c) =>
        c.event.toLowerCase().includes(catalystFilter)
      );
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.headline.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort catalysts
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "impact":
          return (
            Math.abs(b.expectedImpact.max) - Math.abs(a.expectedImpact.max)
          );
        case "confidence":
          const confMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          return confMap[b.confidence] - confMap[a.confidence];
        case "time":
          return b.publishedAt - a.publishedAt;
        case "niss":
          return Math.abs(b.nissScore) - Math.abs(a.nissScore);
        default:
          return (
            Math.abs(b.expectedImpact.max) - Math.abs(a.expectedImpact.max)
          );
      }
    });

    return filtered;
  }, [
    processedCatalysts,
    catalystView,
    catalystFilter,
    timeframe,
    searchQuery,
    sortBy,
  ]);

  // Render catalyst impact visualization
  const ImpactChart = ({ impact, signal }) => {
    const maxImpact = Math.max(Math.abs(impact.min), Math.abs(impact.max));
    const positiveWidth = impact.max > 0 ? (impact.max / maxImpact) * 100 : 0;
    const negativeWidth =
      impact.min < 0 ? (Math.abs(impact.min) / maxImpact) * 100 : 0;

    // Confidence-based coloring
    const getColorIntensity = (confidence) => {
      switch (confidence) {
        case "HIGH":
          return "opacity-100";
        case "MEDIUM":
          return "opacity-70";
        case "LOW":
          return "opacity-40";
        default:
          return "opacity-40";
      }
    };

    return (
      <div className="flex items-center space-x-2 mt-1">
        <span className="text-xs text-gray-500 w-8">
          {impact.min.toFixed(0)}%
        </span>
        <div className="flex-1 h-4 bg-gray-200 rounded relative">
          {/* Zero line - always visible */}
          <div className="absolute left-1/2 top-0 w-0.5 h-full bg-gray-600 transform -translate-x-1/2 z-10" />

          {negativeWidth > 0 && (
            <div
              className={`absolute left-0 top-0 h-full bg-red-400 rounded-l ${getColorIntensity(
                impact.confidence
              )}`}
              style={{ width: `${negativeWidth / 2}%`, right: "50%" }}
            />
          )}
          {positiveWidth > 0 && (
            <div
              className={`absolute right-0 top-0 h-full bg-green-400 rounded-r ${getColorIntensity(
                impact.confidence
              )}`}
              style={{ width: `${positiveWidth / 2}%`, left: "50%" }}
            />
          )}
        </div>
        <span className="text-xs text-gray-500 w-8">
          +{impact.max.toFixed(0)}%
        </span>
      </div>
    );
  };

  // Render signal badge with color coding
  const SignalBadge = ({ signal, confidence }) => {
    const getSignalColors = () => {
      if (signal.includes("BUY") || signal === "LONG")
        return "bg-green-500 text-white";
      if (signal.includes("SELL") || signal === "SHORT")
        return "bg-red-500 text-white";
      if (signal === "WATCH") return "bg-yellow-500 text-white";
      return "bg-gray-500 text-white";
    };

    const getConfidenceColors = () => {
      switch (confidence) {
        case "HIGH":
          return "text-green-600 bg-green-50";
        case "MEDIUM":
          return "text-yellow-600 bg-yellow-50";
        case "LOW":
          return "text-red-600 bg-red-50";
        default:
          return "text-gray-600 bg-gray-50";
      }
    };

    return (
      <div className="flex items-center space-x-2">
        <span
          className={`px-2 py-1 rounded-full text-xs font-bold ${getSignalColors()}`}
        >
          {signal}
        </span>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColors()}`}
        >
          {confidence}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Catalyst Analytics Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Catalyst Analysis
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Real-time news impact analysis with institutional-grade scoring
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Zap className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm text-blue-600">Active Catalysts</p>
                <p className="text-xl font-bold text-blue-900">
                  {filteredCatalysts.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm text-green-600">Bullish Signals</p>
                <p className="text-xl font-bold text-green-900">
                  {
                    filteredCatalysts.filter((c) => c.signal.includes("BUY"))
                      .length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
              <div>
                <p className="text-sm text-red-600">Bearish Signals</p>
                <p className="text-xl font-bold text-red-900">
                  {
                    filteredCatalysts.filter((c) => c.signal.includes("SELL"))
                      .length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Star className="h-5 w-5 text-purple-600 mr-2" />
              <div>
                <p className="text-sm text-purple-600">High Confidence</p>
                <p className="text-xl font-bold text-purple-900">
                  {
                    filteredCatalysts.filter((c) => c.confidence === "HIGH")
                      .length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Bell className="h-5 w-5 text-orange-600 mr-2" />
              <div>
                <p className="text-sm text-orange-600">Breaking News</p>
                <p className="text-xl font-bold text-orange-900">
                  {filteredCatalysts.filter((c) => c.breakingNews).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Feed - 60% width */}
        <div className="lg:col-span-7">
          {/* Controls */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* View Toggle */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                {[{ key: "live", label: "Live Feed", icon: Activity }].map(
                  ({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setCatalystView(key)}
                      className={`px-3 py-2 text-sm font-medium rounded-md flex items-center space-x-1 transition-colors ${
                        catalystView === key
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </button>
                  )
                )}
              </div>

              {/* Filters */}
              <select
                value={catalystFilter}
                onChange={(e) => setCatalystFilter(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2"
              >
                <option value="all">All Events</option>
                <option value="earnings">Earnings</option>
                <option value="fda">FDA/Regulatory</option>
                <option value="partnership">Partnerships</option>
                <option value="analyst">Analyst Actions</option>
                <option value="clinical">Clinical Trials</option>
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
                <option value="impact">Expected Impact</option>
                <option value="confidence">Confidence Level</option>
                <option value="time">Time Published</option>
                <option value="niss">NISS Score</option>
              </select>
            </div>
          </div>

          {/* Live Feed Content */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Live Catalyst Feed
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {filteredCatalysts.length} catalysts found
              </p>
            </div>

            <div className="divide-y divide-gray-200 max-h-[800px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Analyzing catalysts...</p>
                </div>
              ) : filteredCatalysts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Newspaper className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No catalysts found matching your criteria</p>
                  <p className="text-sm mt-1">
                    Try adjusting your filters or search terms
                  </p>
                </div>
              ) : (
                filteredCatalysts.map((catalyst) => (
                  <div
                    key={catalyst.id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">
                                {catalyst.ticker}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {catalyst.company}
                              </p>
                            </div>
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                              {catalyst.event}
                            </span>
                            <SignalBadge
                              signal={catalyst.signal}
                              confidence={catalyst.confidence}
                            />
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              ${catalyst.currentPrice?.toFixed(2) || "N/A"}
                            </p>
                            <p
                              className={`text-sm font-medium ${
                                catalyst.changePercent > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {catalyst.changePercent > 0 ? "+" : ""}
                              {catalyst.changePercent?.toFixed(2) || 0}%
                            </p>
                          </div>
                        </div>

                        {/* News Headline */}
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <h5 className="font-medium text-gray-900 mb-1">
                            {catalyst.headline}
                          </h5>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="font-medium">
                              {catalyst.source}
                            </span>
                            <span>{catalyst.publishedAt.toLocaleString()}</span>
                            <span className="flex items-center">
                              <Star className="h-3 w-3 mr-1" />
                              Credibility: {catalyst.sourceCredibility}%
                            </span>
                            {catalyst.breakingNews && (
                              <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full">
                                BREAKING
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Impact Analysis */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">
                              Expected Impact
                            </p>
                            <ImpactChart
                              impact={catalyst.expectedImpact}
                              signal={catalyst.signal}
                            />
                            <p className="text-xs text-gray-600">
                              Probability:{" "}
                              {(catalyst.probability * 100).toFixed(0)}% |
                              Timeframe: {catalyst.timeframe}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">
                              Key Metrics
                            </p>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span>NISS Score:</span>
                                <span
                                  className={`font-bold ${
                                    catalyst.nissScore > 60
                                      ? "text-green-600"
                                      : catalyst.nissScore < -60
                                      ? "text-red-600"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {catalyst.nissScore.toFixed(0)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Volume Ratio:</span>
                                <span>{catalyst.volumeRatio}x</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Price Position:</span>
                                <span className="text-gray-600">
                                  {catalyst.pricePosition}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Sentiment:</span>
                                <span
                                  className={`${
                                    catalyst.sentiment > 0.3
                                      ? "text-green-600"
                                      : catalyst.sentiment < -0.3
                                      ? "text-red-600"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {catalyst.sentiment?.toFixed(2) || "Neutral"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Link to Source */}
                        {catalyst.url && (
                          <div className="mt-4 pt-4 border-t">
                            <a
                              href={catalyst.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center"
                            >
                              Read Full Article
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {/* Calendar Sidebar - 35% width */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Upcoming Events
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Next 7 days calendar
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {/* Upcoming Earnings */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Earnings This Week
                </h4>
                <div className="space-y-3">
                  {[
                    {
                      ticker: "TSLA",
                      date: "Jul 24",
                      time: "21:30 BST",
                      consensus: "$0.85",
                      whisper: "$0.92",
                      implied: "±6.2%",
                    },
                    {
                      ticker: "MSFT",
                      date: "Jul 25",
                      time: "22:00 BST",
                      consensus: "$2.95",
                      whisper: "$3.02",
                      implied: "±4.8%",
                    },
                    {
                      ticker: "META",
                      date: "Jul 26",
                      time: "21:00 BST",
                      consensus: "$4.52",
                      whisper: "$4.68",
                      implied: "±7.1%",
                    },
                    {
                      ticker: "PLTR",
                      date: "Jul 29",
                      time: "21:00 BST",
                      consensus: "$0.14",
                      whisper: "$0.16",
                      implied: "±8.5%",
                    },
                  ].map((earning) => (
                    <div
                      key={earning.ticker}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">
                          {earning.ticker}
                        </span>
                        <span className="text-sm text-gray-600">
                          {earning.date} • {earning.time}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Consensus:</span>
                          <div className="font-medium">{earning.consensus}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Whisper:</span>
                          <div className="font-medium text-blue-600">
                            {earning.whisper}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Implied Move:</span>
                          <div className="font-medium text-purple-600">
                            {earning.implied}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FDA/Regulatory Events */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Target className="h-4 w-4 mr-1" />
                  Regulatory Events
                </h4>
                <div className="space-y-3">
                  {[
                    {
                      ticker: "MRNA",
                      event: "FDA Vaccine Decision",
                      date: "Jul 23",
                      impact: "High",
                      probability: "75%",
                    },
                    {
                      ticker: "VKTX",
                      event: "Clinical Trial Results",
                      date: "Jul 27",
                      impact: "Very High",
                      probability: "85%",
                    },
                  ].map((event, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">
                          {event.ticker}
                        </span>
                        <span className="text-sm text-gray-600">
                          {event.date}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        {event.event}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`px-2 py-1 rounded-full ${
                            event.impact === "Very High"
                              ? "bg-red-100 text-red-600"
                              : "bg-orange-100 text-orange-600"
                          }`}
                        >
                          {event.impact} Impact
                        </span>
                        <span className="text-gray-600">
                          {event.probability} probability
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Events */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <BarChart2 className="h-4 w-4 mr-1" />
                  Market Events
                </h4>
                <div className="space-y-3">
                  {[
                    {
                      event: "Fed Interest Rate Decision",
                      date: "Jul 31",
                      time: "19:00 BST",
                      impact: "Market-wide",
                    },
                    {
                      event: "Non-Farm Payrolls",
                      date: "Aug 2",
                      time: "13:30 BST",
                      impact: "Market-wide",
                    },
                  ].map((event, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">
                          {event.event}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {event.date} • {event.time}
                        </span>
                        <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs">
                          {event.impact}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trading Schedule */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Today's Schedule (BST)
                </h4>
                <div className="space-y-2">
                  {[
                    {
                      label: "US Pre-Market",
                      time: "09:00 - 14:30",
                      status: "closed",
                    },
                    {
                      label: "US Main Session",
                      time: "14:30 - 21:00",
                      status: "open",
                    },
                    {
                      label: "US After Hours",
                      time: "21:00 - 01:00",
                      status: "upcoming",
                    },
                  ].map((session, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {session.label}
                        </span>
                        <div className="text-xs text-gray-600">
                          {session.time}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          session.status === "open"
                            ? "bg-green-100 text-green-600"
                            : session.status === "upcoming"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {session.status.charAt(0).toUpperCase() +
                          session.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalystAnalysisTab;
