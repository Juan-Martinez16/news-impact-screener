// src/components/CatalystAnalysisTab.js
// ENHANCED: Removed all dataService.js dependencies, using only InstitutionalDataService
// Improved UI/UX with better loading states and real-time data

import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  TrendingFlat,
} from "lucide-react";
import InstitutionalDataService from "../api/InstitutionalDataService";

const CatalystAnalysisTab = ({
  screeningResults = [],
  filters = {},
  refreshTrigger = 0, // Add this prop to trigger refreshes from parent
}) => {
  // Enhanced state management
  const [catalystView, setCatalystView] = useState("live");
  const [catalystFilter, setCatalystFilter] = useState("all");
  const [timeframe, setTimeframe] = useState("24h");
  const [expandedCatalyst, setExpandedCatalyst] = useState(null);
  const [sortBy, setSortBy] = useState("impact");
  const [sortDirection, setSortDirection] = useState("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // New state for real-time data
  const [additionalCatalysts, setAdditionalCatalysts] = useState([]);
  const [marketEvents, setMarketEvents] = useState([]);
  const [upcomingEarnings, setUpcomingEarnings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  // Enhanced catalyst categorization based on real patterns
  const categorizeNewsEvent = useCallback((newsItem) => {
    if (!newsItem || !newsItem.headline) return "Market News";

    const headline = newsItem.headline.toLowerCase();
    const categorization = {
      Earnings: [
        "earnings",
        "quarterly",
        "q1",
        "q2",
        "q3",
        "q4",
        "revenue",
        "eps",
        "guidance",
        "forecast",
        "results",
      ],
      "FDA/Regulatory": [
        "fda",
        "approval",
        "clinical",
        "trial",
        "phase",
        "drug",
        "regulatory",
        "clearance",
        "ce mark",
      ],
      Partnership: [
        "partnership",
        "collaboration",
        "agreement",
        "deal",
        "joint venture",
        "strategic alliance",
      ],
      "M&A": [
        "merger",
        "acquisition",
        "acquire",
        "takeover",
        "buyout",
        "purchase",
        "consolidation",
      ],
      "Analyst Action": [
        "upgrade",
        "downgrade",
        "price target",
        "rating",
        "analyst",
        "coverage",
        "initiates",
        "reiterates",
      ],
      "Clinical Trial": [
        "clinical",
        "trial",
        "study",
        "data",
        "results",
        "endpoint",
        "patient",
        "treatment",
      ],
      "Executive Change": [
        "ceo",
        "cfo",
        "executive",
        "board",
        "management",
        "appoint",
        "resign",
        "retirement",
      ],
      "Product Launch": [
        "launch",
        "release",
        "announce",
        "unveil",
        "introduce",
        "new product",
        "innovation",
      ],
      "Legal/Regulatory": [
        "lawsuit",
        "litigation",
        "sec",
        "investigation",
        "probe",
        "settlement",
        "violation",
      ],
      "Financial Update": [
        "dividend",
        "buyback",
        "share repurchase",
        "capital",
        "debt",
        "financing",
        "offering",
      ],
    };

    for (const [category, keywords] of Object.entries(categorization)) {
      if (keywords.some((keyword) => headline.includes(keyword))) {
        return category;
      }
    }

    return "Market News";
  }, []);

  // Calculate expected impact based on real metrics
  const calculateExpectedImpact = useCallback(
    (newsItem, nissScore, changePercent, technicals) => {
      if (!newsItem || !nissScore) {
        return { min: 0, max: 0, confidence: "LOW" };
      }

      // Base impact from NISS score (institutional-grade calculation)
      const baseImpact = Math.abs(nissScore) / 10;

      // Sentiment multiplier - use actual sentiment if available
      const sentiment = newsItem.sentiment || 0;
      const sentimentMultiplier = 1 + Math.abs(sentiment) * 0.5;

      // Volatility boost from current price action
      const volatilityBoost = Math.abs(changePercent || 0) / 2;

      // Technical confirmation
      const technicalBoost =
        technicals?.momentum > 70 ? 1.2 : technicals?.momentum < 30 ? 0.8 : 1.0;

      // Calculate raw impact
      const rawImpact =
        (baseImpact + volatilityBoost) * sentimentMultiplier * technicalBoost;

      // Determine direction and range
      const direction = nissScore > 0 ? 1 : -1;
      const confidence =
        Math.abs(nissScore) > 75
          ? "HIGH"
          : Math.abs(nissScore) > 60
          ? "MEDIUM"
          : "LOW";

      // Calculate min/max with realistic ranges
      const impactRange = {
        HIGH: { min: 0.5, max: 1.5 },
        MEDIUM: { min: 0.3, max: 1.0 },
        LOW: { min: 0.1, max: 0.5 },
      };

      const range = impactRange[confidence];
      const avgImpact = rawImpact * direction;

      return {
        min: avgImpact * range.min,
        max: avgImpact * range.max,
        confidence: confidence,
        probability: calculateProbability(confidence, sentiment),
      };
    },
    []
  );

  // Calculate probability based on confidence and sentiment
  const calculateProbability = useCallback((confidence, sentiment) => {
    const baseProb = {
      HIGH: 0.75,
      MEDIUM: 0.6,
      LOW: 0.45,
    };

    const prob = baseProb[confidence] || 0.5;
    const sentimentBoost = Math.min(0.15, Math.abs(sentiment || 0) * 0.15);

    return Math.min(0.95, Math.max(0.05, prob + sentimentBoost));
  }, []);

  // Get event timeframe based on catalyst type
  const getEventTimeframe = useCallback(
    (newsItem) => {
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
        "Legal/Regulatory": "2-7 days",
        "Financial Update": "1-2 days",
        "Market News": "1 day",
      };
      return timeframes[event] || "1-2 days";
    },
    [categorizeNewsEvent]
  );

  // Source credibility scoring
  const getSourceCredibility = useCallback((source) => {
    if (!source) return 50;

    const credibilityMap = {
      Reuters: 95,
      Bloomberg: 95,
      "Wall Street Journal": 90,
      "Financial Times": 90,
      CNBC: 85,
      MarketWatch: 80,
      "Barron's": 85,
      Forbes: 75,
      "Yahoo Finance": 70,
      "Seeking Alpha": 65,
      "The Motley Fool": 60,
      Benzinga: 55,
      InvestorPlace: 55,
    };

    // Check if source contains any of the credible sources
    const sourceUpper = source.toUpperCase();
    for (const [key, value] of Object.entries(credibilityMap)) {
      if (sourceUpper.includes(key.toUpperCase())) {
        return value;
      }
    }

    return 50; // Default credibility
  }, []);

  // Check if news is breaking (within last 2 hours)
  const isBreakingNews = useCallback((newsItem) => {
    if (!newsItem || !newsItem.datetime) return false;

    const publishTime = newsItem.datetime * 1000; // Convert to milliseconds
    const now = Date.now();
    const hoursSincePublished = (now - publishTime) / (1000 * 60 * 60);

    return hoursSincePublished < 2;
  }, []);

  // Calculate market relevance based on sector and current market conditions
  const calculateMarketRelevance = useCallback(
    (newsItem, sector, marketRegime) => {
      if (!newsItem || !newsItem.headline) return 50;

      const headline = newsItem.headline.toLowerCase();
      const sectorKeywords = {
        technology: [
          "tech",
          "software",
          "cloud",
          "ai",
          "chip",
          "semiconductor",
          "data",
          "cyber",
        ],
        healthcare: [
          "drug",
          "fda",
          "clinical",
          "therapy",
          "medical",
          "biotech",
          "pharma",
          "vaccine",
        ],
        automotive: [
          "ev",
          "electric",
          "vehicle",
          "auto",
          "battery",
          "autonomous",
          "tesla",
        ],
        financial: [
          "bank",
          "fed",
          "interest",
          "loan",
          "mortgage",
          "fintech",
          "crypto",
          "payment",
        ],
        energy: [
          "oil",
          "gas",
          "renewable",
          "solar",
          "wind",
          "energy",
          "pipeline",
          "drilling",
        ],
        retail: [
          "consumer",
          "retail",
          "e-commerce",
          "sales",
          "inventory",
          "supply chain",
        ],
        industrial: [
          "manufacturing",
          "industrial",
          "aerospace",
          "defense",
          "infrastructure",
        ],
      };

      let relevanceScore = 50; // Base score

      // Check sector-specific keywords
      const keywords = sectorKeywords[sector?.toLowerCase()] || [];
      const keywordMatches = keywords.filter((keyword) =>
        headline.includes(keyword)
      ).length;
      relevanceScore += keywordMatches * 10;

      // Market regime adjustments
      if (marketRegime) {
        if (
          marketRegime.volatility === "high" &&
          headline.includes("volatility")
        ) {
          relevanceScore += 20;
        }
        if (
          marketRegime.trend === "bullish" &&
          (headline.includes("growth") || headline.includes("expansion"))
        ) {
          relevanceScore += 15;
        }
        if (
          marketRegime.trend === "bearish" &&
          (headline.includes("concern") || headline.includes("risk"))
        ) {
          relevanceScore += 15;
        }
      }

      // Cap at 100
      return Math.min(100, relevanceScore);
    },
    []
  );
  // Fetch additional market data from InstitutionalDataService
  const fetchAdditionalMarketData = useCallback(async () => {
    try {
      setRefreshing(true);

      // Get market regime for context
      await InstitutionalDataService.updateMarketRegime();
      const marketRegime = InstitutionalDataService.marketRegime;

      // Fetch earnings calendar (you would need to add this to InstitutionalDataService)
      // For now, we'll use the existing data structure
      const earningsData = await fetchUpcomingEarnings();
      setUpcomingEarnings(earningsData);

      // Fetch market events
      const events = await fetchMarketEvents();
      setMarketEvents(events);

      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      console.error("Error fetching additional market data:", err);
      setError("Failed to fetch market data");
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Fetch upcoming earnings from API
  const fetchUpcomingEarnings = async () => {
    // This would be replaced with actual API call through InstitutionalDataService
    // For now, return empty array to avoid mock data
    try {
      // Example: const earnings = await InstitutionalDataService.getUpcomingEarnings();
      return [];
    } catch (error) {
      console.error("Error fetching earnings:", error);
      return [];
    }
  };

  // Fetch market events from API
  const fetchMarketEvents = async () => {
    // This would be replaced with actual API call through InstitutionalDataService
    try {
      // Example: const events = await InstitutionalDataService.getMarketEvents();
      return [];
    } catch (error) {
      console.error("Error fetching market events:", error);
      return [];
    }
  };

  // Refresh data on mount and when filters change
  useEffect(() => {
    fetchAdditionalMarketData();
  }, [filters, refreshTrigger]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAdditionalMarketData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchAdditionalMarketData]);

  // Calculate price position relative to key technical levels
  const calculatePricePosition = useCallback((quote, technicals) => {
    if (!quote || !quote.price) return "Unknown";

    const price = quote.price;
    const sma20 = technicals?.sma20;
    const sma50 = technicals?.sma50;
    const sma200 = technicals?.sma200;

    if (
      sma200 &&
      price > sma200 &&
      sma50 &&
      price > sma50 &&
      sma20 &&
      price > sma20
    ) {
      return "Above All MAs";
    } else if (
      sma200 &&
      price < sma200 &&
      sma50 &&
      price < sma50 &&
      sma20 &&
      price < sma20
    ) {
      return "Below All MAs";
    } else if (sma20 && price > sma20) {
      return "Above Short-term MA";
    } else if (sma20 && price < sma20) {
      return "Below Short-term MA";
    }

    // Check relative to day's range
    const dayRange = quote.high - quote.low;
    const positionInRange = (price - quote.low) / dayRange;

    if (positionInRange > 0.8) return "Near Day High";
    if (positionInRange < 0.2) return "Near Day Low";

    return "Mid-Range";
  }, []);
  // Enhanced catalyst data processing with real API data
  const processedCatalysts = useMemo(() => {
    const catalysts = [];

    // Process screening results from InstitutionalDataService
    if (screeningResults && screeningResults.length > 0) {
      screeningResults.forEach((stock) => {
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
          marketCap,
        } = stock;

        // Only process stocks with news
        if (news && news.length > 0) {
          // Limit to most relevant news items (top 3 by recency and relevance)
          const sortedNews = [...news]
            .sort((a, b) => {
              // Sort by datetime (most recent first)
              const timeA = a.datetime || 0;
              const timeB = b.datetime || 0;
              return timeB - timeA;
            })
            .slice(0, 3);

          sortedNews.forEach((newsItem, index) => {
            // Skip if no headline
            if (!newsItem.headline && !newsItem.title) return;

            const catalyst = {
              id: `${symbol}-${newsItem.datetime || index}-${index}`,
              ticker: symbol,
              company: company || symbol,
              sector: sector,
              marketCap: marketCap,

              // News data
              event: categorizeNewsEvent(newsItem),
              headline: newsItem.headline || newsItem.title || "No headline",
              summary: newsItem.summary || "",
              source: newsItem.source || "Unknown",
              publishedAt: newsItem.datetime
                ? new Date(newsItem.datetime * 1000)
                : new Date(),
              url: newsItem.url || "",

              // Sentiment and scoring
              sentiment: newsItem.sentiment || 0,
              relevanceScore:
                newsItem.relevanceScore ||
                calculateMarketRelevance(
                  newsItem,
                  sector,
                  InstitutionalDataService.marketRegime
                ),

              // Core Analysis from InstitutionalDataService
              nissScore: nissScore,
              confidence: nissData?.confidence || "LOW",
              currentPrice: quote?.price || 0,
              changePercent: quote?.changePercent || 0,
              volume: quote?.volume || 0,
              avgVolume: quote?.avgVolume || quote?.volume || 0,

              // Impact Assessment
              expectedImpact: calculateExpectedImpact(
                newsItem,
                nissScore,
                quote?.changePercent,
                technicals
              ),
              probability: calculateProbability(
                nissData?.confidence,
                newsItem.sentiment
              ),
              timeframe: getEventTimeframe(newsItem),

              // Trading Setup from InstitutionalDataService
              signal:
                tradeSetup?.action ||
                (nissScore > 60 ? "LONG" : nissScore < -60 ? "SHORT" : "HOLD"),
              entry: tradeSetup?.entry || quote?.price,
              stopLoss: tradeSetup?.stopLoss,
              targets: tradeSetup?.targets || [],
              riskReward: tradeSetup?.riskReward || 0,
              reasoning: tradeSetup?.reasoning || "",

              // Technical indicators
              technicals: technicals || {},

              // Key Metrics
              volumeRatio:
                quote?.volume && quote?.avgVolume
                  ? (quote.volume / quote.avgVolume).toFixed(1)
                  : "1.0",
              pricePosition: calculatePricePosition(quote, technicals),

              // News Quality Metrics
              sourceCredibility: getSourceCredibility(newsItem.source),
              breakingNews: isBreakingNews(newsItem),
              marketRelevance: calculateMarketRelevance(
                newsItem,
                sector,
                InstitutionalDataService.marketRegime
              ),

              // NISS Components for detailed view
              nissComponents: nissData?.components || {},

              // Additional metadata
              isRealTime: true,
              lastUpdate: new Date(),
            };

            catalysts.push(catalyst);
          });
        }
      });
    }

    // Sort by recency and relevance
    return catalysts.sort((a, b) => {
      // First sort by breaking news
      if (a.breakingNews && !b.breakingNews) return -1;
      if (!a.breakingNews && b.breakingNews) return 1;

      // Then by publish time
      return b.publishedAt - a.publishedAt;
    });
  }, [
    screeningResults,
    categorizeNewsEvent,
    calculateExpectedImpact,
    calculateProbability,
    getEventTimeframe,
    getSourceCredibility,
    isBreakingNews,
    calculateMarketRelevance,
  ]);

  // Enhanced filtering and sorting
  const filteredCatalysts = useMemo(() => {
    let filtered = processedCatalysts;

    // Filter by view type (live feed shows recent, calendar shows upcoming)
    if (catalystView === "live") {
      const now = new Date();
      const cutoff = new Date(
        now.getTime() -
          (timeframe === "1h"
            ? 1
            : timeframe === "24h"
            ? 24
            : timeframe === "7d"
            ? 168
            : 1) *
            60 *
            60 *
            1000
      );
      filtered = filtered.filter((c) => c.publishedAt >= cutoff);
    }

    // Filter by catalyst type
    if (catalystFilter !== "all") {
      filtered = filtered.filter((c) =>
        c.event.toLowerCase().includes(catalystFilter.toLowerCase())
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.ticker.toLowerCase().includes(query) ||
          c.company.toLowerCase().includes(query) ||
          c.headline.toLowerCase().includes(query) ||
          c.sector.toLowerCase().includes(query)
      );
    }

    // Apply confidence filter from parent
    if (filters.minConfidence) {
      filtered = filtered.filter((c) => {
        if (filters.minConfidence === "HIGH") return c.confidence === "HIGH";
        if (filters.minConfidence === "MEDIUM") return c.confidence !== "LOW";
        return true;
      });
    }

    // Sort catalysts
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "impact":
          comparison =
            Math.abs(b.expectedImpact.max) - Math.abs(a.expectedImpact.max);
          break;
        case "confidence":
          const confMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          comparison = confMap[b.confidence] - confMap[a.confidence];
          break;
        case "time":
          comparison = b.publishedAt - a.publishedAt;
          break;
        case "niss":
          comparison = Math.abs(b.nissScore) - Math.abs(a.nissScore);
          break;
        case "relevance":
          comparison = b.marketRelevance - a.marketRelevance;
          break;
        case "volume":
          comparison = parseFloat(b.volumeRatio) - parseFloat(a.volumeRatio);
          break;
        default:
          comparison = b.publishedAt - a.publishedAt;
      }

      return sortDirection === "desc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    processedCatalysts,
    catalystView,
    catalystFilter,
    timeframe,
    searchQuery,
    sortBy,
    sortDirection,
    filters,
  ]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const stats = {
      total: filteredCatalysts.length,
      breaking: filteredCatalysts.filter((c) => c.breakingNews).length,
      bullish: filteredCatalysts.filter(
        (c) => c.signal === "LONG" || c.signal === "BUY"
      ).length,
      bearish: filteredCatalysts.filter(
        (c) => c.signal === "SHORT" || c.signal === "SELL"
      ).length,
      highConfidence: filteredCatalysts.filter((c) => c.confidence === "HIGH")
        .length,
      byEvent: {},
      avgNissScore: 0,
      topSectors: [],
    };

    // Calculate average NISS score
    if (filteredCatalysts.length > 0) {
      stats.avgNissScore =
        filteredCatalysts.reduce((sum, c) => sum + Math.abs(c.nissScore), 0) /
        filteredCatalysts.length;
    }

    // Count by event type
    filteredCatalysts.forEach((c) => {
      stats.byEvent[c.event] = (stats.byEvent[c.event] || 0) + 1;
    });

    // Top sectors by catalyst count
    const sectorCounts = {};
    filteredCatalysts.forEach((c) => {
      sectorCounts[c.sector] = (sectorCounts[c.sector] || 0) + 1;
    });
    stats.topSectors = Object.entries(sectorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([sector, count]) => ({ sector, count }));

    return stats;
  }, [filteredCatalysts]);
  // Enhanced Impact Chart Component
  const ImpactChart = ({ impact, signal }) => {
    if (!impact) return null;

    const maxImpact = Math.max(Math.abs(impact.min), Math.abs(impact.max));
    const scale = maxImpact > 0 ? 100 / maxImpact : 1;

    const positiveWidth =
      impact.max > 0 ? Math.min(impact.max * scale, 100) : 0;
    const negativeWidth =
      impact.min < 0 ? Math.min(Math.abs(impact.min) * scale, 100) : 0;

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
      <div className="w-full">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-xs text-gray-500 w-12 text-right">
            {impact.min.toFixed(1)}%
          </span>
          <div className="flex-1 h-4 bg-gray-200 rounded-full relative overflow-hidden">
            {/* Zero line */}
            <div className="absolute left-1/2 top-0 w-0.5 h-full bg-gray-400 transform -translate-x-1/2 z-10" />

            {/* Negative impact */}
            {negativeWidth > 0 && (
              <div
                className={`absolute right-1/2 top-0 h-full bg-red-500 ${getColorIntensity(
                  impact.confidence
                )}`}
                style={{ width: `${negativeWidth / 2}%` }}
              />
            )}

            {/* Positive impact */}
            {positiveWidth > 0 && (
              <div
                className={`absolute left-1/2 top-0 h-full bg-green-500 ${getColorIntensity(
                  impact.confidence
                )}`}
                style={{ width: `${positiveWidth / 2}%` }}
              />
            )}
          </div>
          <span className="text-xs text-gray-500 w-12">
            +{impact.max.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>Probability: {(impact.probability * 100).toFixed(0)}%</span>
          <span>{impact.confidence} confidence</span>
        </div>
      </div>
    );
  };

  // Enhanced Signal Badge Component
  const SignalBadge = ({ signal, confidence, riskReward }) => {
    const getSignalStyle = () => {
      if (signal === "LONG" || signal === "BUY" || signal === "STRONG BUY") {
        return {
          bg: confidence === "HIGH" ? "bg-green-600" : "bg-green-500",
          text: "text-white",
          icon: <TrendingUp className="h-3 w-3" />,
        };
      } else if (
        signal === "SHORT" ||
        signal === "SELL" ||
        signal === "STRONG SELL"
      ) {
        return {
          bg: confidence === "HIGH" ? "bg-red-600" : "bg-red-500",
          text: "text-white",
          icon: <TrendingDown className="h-3 w-3" />,
        };
      } else if (signal === "HOLD") {
        return {
          bg: "bg-gray-500",
          text: "text-white",
          icon: <TrendingFlat className="h-3 w-3" />,
        };
      }
      return {
        bg: "bg-yellow-500",
        text: "text-white",
        icon: <AlertCircle className="h-3 w-3" />,
      };
    };

    const style = getSignalStyle();

    return (
      <div className="flex items-center space-x-2">
        <span
          className={`${style.bg} ${style.text} px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1`}
        >
          {style.icon}
          <span>{signal}</span>
        </span>
        {confidence && (
          <span
            className={`text-xs font-medium ${
              confidence === "HIGH"
                ? "text-green-600"
                : confidence === "MEDIUM"
                ? "text-yellow-600"
                : "text-gray-600"
            }`}
          >
            {confidence}
          </span>
        )}
        {riskReward > 0 && (
          <span className="text-xs text-blue-600 font-medium">
            R:R {riskReward.toFixed(1)}
          </span>
        )}
      </div>
    );
  };

  // News Source Badge Component
  const SourceBadge = ({ source, credibility, isBreaking }) => {
    const getCredibilityColor = () => {
      if (credibility >= 90) return "text-green-600 bg-green-50";
      if (credibility >= 75) return "text-blue-600 bg-blue-50";
      if (credibility >= 60) return "text-yellow-600 bg-yellow-50";
      return "text-gray-600 bg-gray-50";
    };

    return (
      <div className="flex items-center space-x-2">
        <span className={`text-xs px-2 py-1 rounded ${getCredibilityColor()}`}>
          {source}
        </span>
        {isBreaking && (
          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 font-medium animate-pulse">
            BREAKING
          </span>
        )}
        <div className="flex items-center text-xs text-gray-500">
          <Shield className="h-3 w-3 mr-1" />
          {credibility}%
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-6">
      {/* Enhanced Header with Real-time Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Catalyst Analysis
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Real-time institutional-grade news impact analysis
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              Last update: {lastRefresh.toLocaleTimeString()}
            </div>
            <button
              onClick={fetchAdditionalMarketData}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Zap className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm text-blue-600">Active Catalysts</p>
                <p className="text-xl font-bold text-blue-900">
                  {summaryStats.total}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {summaryStats.breaking} breaking
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
                  {summaryStats.bullish}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {summaryStats.highConfidence} high conf
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
                  {summaryStats.bearish}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Star className="h-5 w-5 text-purple-600 mr-2" />
              <div>
                <p className="text-sm text-purple-600">Avg NISS</p>
                <p className="text-xl font-bold text-purple-900">
                  {summaryStats.avgNissScore.toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Bell className="h-5 w-5 text-orange-600 mr-2" />
              <div>
                <p className="text-sm text-orange-600">Top Sector</p>
                <p className="text-lg font-bold text-orange-900">
                  {summaryStats.topSectors[0]?.sector || "N/A"}
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  {summaryStats.topSectors[0]?.count || 0} events
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Event Type Distribution */}
        {Object.keys(summaryStats.byEvent).length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">
                Event Distribution
              </h3>
              <span className="text-xs text-gray-500">Last {timeframe}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summaryStats.byEvent)
                .sort(([, a], [, b]) => b - a)
                .map(([event, count]) => (
                  <span
                    key={event}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {event}: {count}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area - Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Feed - Main Content */}
        <div className="lg:col-span-8">
          {/* Enhanced Controls */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search Bar */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by symbol, company, or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
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
                <option value="m&a">M&A</option>
                <option value="analyst">Analyst Actions</option>
                <option value="clinical">Clinical Trials</option>
                <option value="product">Product Launch</option>
                <option value="executive">Executive Change</option>
                <option value="legal">Legal/Regulatory</option>
                <option value="financial">Financial Update</option>
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
                <option value="time">Time (Recent First)</option>
                <option value="impact">Expected Impact</option>
                <option value="confidence">Confidence Level</option>
                <option value="niss">NISS Score</option>
                <option value="relevance">Market Relevance</option>
                <option value="volume">Volume Activity</option>
              </select>

              <button
                onClick={() =>
                  setSortDirection(sortDirection === "desc" ? "asc" : "desc")
                }
                className="p-2 border rounded-lg hover:bg-gray-50"
                title={`Sort ${
                  sortDirection === "desc" ? "ascending" : "descending"
                }`}
              >
                {sortDirection === "desc" ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          {/* Live Feed Content */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Live Catalyst Feed
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {loading ? (
                  <span className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading catalysts...
                  </span>
                ) : error ? (
                  <span className="text-red-600">{error}</span>
                ) : (
                  `${filteredCatalysts.length} catalysts found`
                )}
              </p>
            </div>

            <div className="divide-y divide-gray-200 max-h-[800px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                  <p className="mt-2 text-gray-600">
                    Analyzing market catalysts...
                  </p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                  <p className="text-red-600">{error}</p>
                  <button
                    onClick={fetchAdditionalMarketData}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Retry
                  </button>
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
                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() =>
                      setExpandedCatalyst(
                        expandedCatalyst?.id === catalyst.id ? null : catalyst
                      )
                    }
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
                                {catalyst.company} • {catalyst.sector}
                              </p>
                            </div>
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                              {catalyst.event}
                            </span>
                            <SignalBadge
                              signal={catalyst.signal}
                              confidence={catalyst.confidence}
                              riskReward={catalyst.riskReward}
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
                                  : catalyst.changePercent < 0
                                  ? "text-red-600"
                                  : "text-gray-600"
                              }`}
                            >
                              {catalyst.changePercent > 0 ? "+" : ""}
                              {catalyst.changePercent?.toFixed(2) || 0}%
                            </p>
                          </div>
                        </div>

                        {/* News Headline */}
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <h5 className="font-medium text-gray-900 mb-2 line-clamp-2">
                            {catalyst.headline}
                          </h5>
                          {catalyst.summary &&
                            expandedCatalyst?.id === catalyst.id && (
                              <p className="text-sm text-gray-700 mb-2">
                                {catalyst.summary}
                              </p>
                            )}
                          <div className="flex items-center justify-between">
                            <SourceBadge
                              source={catalyst.source}
                              credibility={catalyst.sourceCredibility}
                              isBreaking={catalyst.breakingNews}
                            />
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <span>
                                {catalyst.publishedAt.toLocaleString()}
                              </span>
                              {catalyst.url && (
                                <a
                                  href={catalyst.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
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
                                <span
                                  className={
                                    parseFloat(catalyst.volumeRatio) > 2
                                      ? "font-bold"
                                      : ""
                                  }
                                >
                                  {catalyst.volumeRatio}x
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Price Position:</span>
                                <span className="text-gray-600">
                                  {catalyst.pricePosition}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Market Relevance:</span>
                                <span
                                  className={`font-medium ${
                                    catalyst.marketRelevance > 80
                                      ? "text-green-600"
                                      : catalyst.marketRelevance > 60
                                      ? "text-blue-600"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {catalyst.marketRelevance}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Expanded Details */}
                        {expandedCatalyst?.id === catalyst.id && (
                          <div className="mt-4 pt-4 border-t space-y-4">
                            {/* Trading Setup */}
                            {catalyst.signal !== "HOLD" && (
                              <div className="bg-blue-50 p-4 rounded-lg">
                                <h6 className="text-sm font-semibold text-blue-900 mb-2">
                                  Trading Setup
                                </h6>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <span className="text-blue-700">
                                      Entry:
                                    </span>
                                    <p className="font-bold text-blue-900">
                                      ${catalyst.entry?.toFixed(2) || "Market"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-blue-700">
                                      Stop Loss:
                                    </span>
                                    <p className="font-bold text-red-600">
                                      ${catalyst.stopLoss?.toFixed(2) || "N/A"}
                                    </p>
                                  </div>
                                  {catalyst.targets &&
                                    catalyst.targets.length > 0 && (
                                      <div>
                                        <span className="text-blue-700">
                                          Target 1:
                                        </span>
                                        <p className="font-bold text-green-600">
                                          $
                                          {catalyst.targets[0]?.price?.toFixed(
                                            2
                                          ) || "N/A"}
                                        </p>
                                      </div>
                                    )}
                                  <div>
                                    <span className="text-blue-700">
                                      R:R Ratio:
                                    </span>
                                    <p className="font-bold text-blue-900">
                                      1:
                                      {catalyst.riskReward?.toFixed(1) || "N/A"}
                                    </p>
                                  </div>
                                </div>
                                {catalyst.reasoning && (
                                  <p className="text-sm text-blue-800 mt-2">
                                    {catalyst.reasoning}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* NISS Components */}
                            {catalyst.nissComponents &&
                              Object.keys(catalyst.nissComponents).length >
                                0 && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                  <h6 className="text-sm font-semibold text-gray-900 mb-2">
                                    NISS Score Components
                                  </h6>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {Object.entries(
                                      catalyst.nissComponents
                                    ).map(([key, value]) => (
                                      <div key={key} className="text-xs">
                                        <span className="text-gray-600 capitalize">
                                          {key
                                            .replace(/([A-Z])/g, " $1")
                                            .trim()}
                                          :
                                        </span>
                                        <div className="flex items-center mt-1">
                                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                            <div
                                              className={`h-2 rounded-full ${
                                                value > 70
                                                  ? "bg-green-500"
                                                  : value > 50
                                                  ? "bg-blue-500"
                                                  : value > 30
                                                  ? "bg-yellow-500"
                                                  : "bg-red-500"
                                              }`}
                                              style={{
                                                width: `${Math.min(
                                                  value,
                                                  100
                                                )}%`,
                                              }}
                                            />
                                          </div>
                                          <span className="font-medium w-8">
                                            {value?.toFixed(0)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {/* Technical Indicators */}
                            {catalyst.technicals &&
                              Object.keys(catalyst.technicals).length > 0 && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                  <h6 className="text-sm font-semibold text-gray-900 mb-2">
                                    Technical Indicators
                                  </h6>
                                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                                    {catalyst.technicals.rsi && (
                                      <div>
                                        <span className="text-gray-600">
                                          RSI:
                                        </span>
                                        <p
                                          className={`font-bold ${
                                            catalyst.technicals.rsi > 70
                                              ? "text-red-600"
                                              : catalyst.technicals.rsi < 30
                                              ? "text-green-600"
                                              : "text-gray-900"
                                          }`}
                                        >
                                          {catalyst.technicals.rsi.toFixed(0)}
                                        </p>
                                      </div>
                                    )}
                                    {catalyst.technicals.atr && (
                                      <div>
                                        <span className="text-gray-600">
                                          ATR:
                                        </span>
                                        <p className="font-bold">
                                          ${catalyst.technicals.atr.toFixed(2)}
                                        </p>
                                      </div>
                                    )}
                                    {catalyst.technicals.adx && (
                                      <div>
                                        <span className="text-gray-600">
                                          ADX:
                                        </span>
                                        <p className="font-bold">
                                          {catalyst.technicals.adx.toFixed(0)}
                                        </p>
                                      </div>
                                    )}
                                    {catalyst.technicals.macd !== undefined && (
                                      <div>
                                        <span className="text-gray-600">
                                          MACD:
                                        </span>
                                        <p
                                          className={`font-bold ${
                                            catalyst.technicals.macd >
                                            catalyst.technicals.macdSignal
                                              ? "text-green-600"
                                              : "text-red-600"
                                          }`}
                                        >
                                          {catalyst.technicals.macd >
                                          catalyst.technicals.macdSignal
                                            ? "Bullish"
                                            : "Bearish"}
                                        </p>
                                      </div>
                                    )}
                                    {catalyst.technicals.sma20 && (
                                      <div>
                                        <span className="text-gray-600">
                                          SMA20:
                                        </span>
                                        <p className="font-bold">
                                          $
                                          {catalyst.technicals.sma20.toFixed(2)}
                                        </p>
                                      </div>
                                    )}
                                    {catalyst.technicals.sma50 && (
                                      <div>
                                        <span className="text-gray-600">
                                          SMA50:
                                        </span>
                                        <p className="font-bold">
                                          $
                                          {catalyst.technicals.sma50.toFixed(2)}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* Market Cap Info */}
                            {catalyst.marketCap && (
                              <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg">
                                <span className="text-gray-600">
                                  Market Cap:
                                </span>
                                <span className="font-bold">
                                  {catalyst.marketCap >= 1e12
                                    ? `$${(catalyst.marketCap / 1e12).toFixed(
                                        1
                                      )}T`
                                    : catalyst.marketCap >= 1e9
                                    ? `$${(catalyst.marketCap / 1e9).toFixed(
                                        1
                                      )}B`
                                    : catalyst.marketCap >= 1e6
                                    ? `$${(catalyst.marketCap / 1e6).toFixed(
                                        1
                                      )}M`
                                    : `$${(catalyst.marketCap / 1e3).toFixed(
                                        1
                                      )}K`}
                                </span>
                              </div>
                            )}

                            {/* Additional Targets if available */}
                            {catalyst.targets &&
                              catalyst.targets.length > 1 && (
                                <div className="bg-green-50 p-4 rounded-lg">
                                  <h6 className="text-sm font-semibold text-green-900 mb-2">
                                    Price Targets
                                  </h6>
                                  <div className="space-y-2">
                                    {catalyst.targets.map((target, idx) => (
                                      <div
                                        key={idx}
                                        className="flex justify-between items-center text-sm"
                                      >
                                        <div className="flex items-center">
                                          <Target className="h-3 w-3 mr-2 text-green-600" />
                                          <span className="text-green-700">
                                            Target {target.level}:
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <span className="font-bold text-green-900">
                                            ${target.price?.toFixed(2)}
                                          </span>
                                          <span className="text-xs text-green-600 ml-2">
                                            ({target.action})
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {/* Sentiment Analysis */}
                            {catalyst.sentiment !== undefined && (
                              <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg">
                                <span className="text-gray-600">
                                  News Sentiment:
                                </span>
                                <div className="flex items-center">
                                  <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                    <div
                                      className={`h-2 rounded-full ${
                                        catalyst.sentiment > 0
                                          ? "bg-green-500"
                                          : "bg-red-500"
                                      }`}
                                      style={{
                                        width: `${
                                          Math.abs(catalyst.sentiment) * 100
                                        }%`,
                                        marginLeft:
                                          catalyst.sentiment < 0 ? "auto" : 0,
                                      }}
                                    />
                                  </div>
                                  <span
                                    className={`font-bold ${
                                      catalyst.sentiment > 0.3
                                        ? "text-green-600"
                                        : catalyst.sentiment < -0.3
                                        ? "text-red-600"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {catalyst.sentiment.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Expand/Collapse Indicator */}
                        <div className="mt-3 text-center">
                          <button className="text-xs text-blue-600 hover:text-blue-800">
                            {expandedCatalyst?.id === catalyst.id ? (
                              <span className="flex items-center justify-center">
                                <ChevronDown className="h-4 w-4 mr-1" />
                                Show Less
                              </span>
                            ) : (
                              <span className="flex items-center justify-center">
                                <ChevronRight className="h-4 w-4 mr-1" />
                                Show More Details
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {/* Calendar Sidebar - Right Column */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-lg shadow sticky top-4">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Market Calendar
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Upcoming events & schedule
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200 max-h-[700px] overflow-y-auto">
              {/* Upcoming Earnings Section */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Earnings This Week
                </h4>
                {refreshing ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : upcomingEarnings.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingEarnings.map((earning, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900">
                            {earning.symbol}
                          </span>
                          <span className="text-sm text-gray-600">
                            {earning.date} • {earning.time}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Consensus:</span>
                            <div className="font-medium">
                              ${earning.consensus}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Previous:</span>
                            <div className="font-medium">
                              ${earning.previous}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Est. Move:</span>
                            <div className="font-medium text-purple-600">
                              ±{earning.impliedMove}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">
                      No earnings data available
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Check back later for updates
                    </p>
                  </div>
                )}
              </div>

              {/* Market Events Section */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <BarChart2 className="h-4 w-4 mr-1" />
                  Market Events
                </h4>
                {refreshing ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : marketEvents.length > 0 ? (
                  <div className="space-y-3">
                    {marketEvents.map((event, idx) => (
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
                        {event.description && (
                          <p className="text-xs text-gray-600 mt-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">
                      No scheduled market events
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Economic calendar will update automatically
                    </p>
                  </div>
                )}
              </div>
              {/* Trading Schedule */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Today's Schedule (ET)
                </h4>
                <div className="space-y-2">
                  {[
                    {
                      label: "US Pre-Market",
                      time: "04:00 - 09:30 ET",
                      status: getMarketStatus("premarket"),
                    },
                    {
                      label: "US Main Session",
                      time: "09:30 - 16:00 ET",
                      status: getMarketStatus("regular"),
                    },
                    {
                      label: "US After Hours",
                      time: "16:00 - 20:00 ET",
                      status: getMarketStatus("afterhours"),
                    },
                  ].map((session, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
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

              {/* Most Active Sectors */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Activity className="h-4 w-4 mr-1" />
                  Most Active Sectors
                </h4>
                {summaryStats.topSectors.length > 0 ? (
                  <div className="space-y-2">
                    {summaryStats.topSectors.map((sector, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-700 capitalize">
                          {sector.sector}
                        </span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(
                                  (sector.count / summaryStats.total) * 100,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-8 text-right">
                            {sector.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-2">
                    No sector data available
                  </p>
                )}
              </div>

              {/* Market Regime Indicators */}
              <div className="p-4 bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Shield className="h-4 w-4 mr-1" />
                  Market Regime
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Volatility:</span>
                    <span
                      className={`font-medium ${
                        InstitutionalDataService.marketRegime.volatility ===
                        "high"
                          ? "text-red-600"
                          : InstitutionalDataService.marketRegime.volatility ===
                            "low"
                          ? "text-green-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {InstitutionalDataService.marketRegime.volatility.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Trend:</span>
                    <span
                      className={`font-medium flex items-center ${
                        InstitutionalDataService.marketRegime.trend ===
                        "bullish"
                          ? "text-green-600"
                          : InstitutionalDataService.marketRegime.trend ===
                            "bearish"
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {InstitutionalDataService.marketRegime.trend ===
                      "bullish" ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : InstitutionalDataService.marketRegime.trend ===
                        "bearish" ? (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingFlat className="h-3 w-3 mr-1" />
                      )}
                      {InstitutionalDataService.marketRegime.trend.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Breadth:</span>
                    <span
                      className={`font-medium ${
                        InstitutionalDataService.marketRegime.breadth ===
                        "advancing"
                          ? "text-green-600"
                          : InstitutionalDataService.marketRegime.breadth ===
                            "declining"
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {InstitutionalDataService.marketRegime.breadth.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              {/* Quick Stats */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Session Statistics
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-600">Avg NISS Score:</span>
                    <p className="font-bold text-gray-900">
                      {summaryStats.avgNissScore.toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-600">High Confidence:</span>
                    <p className="font-bold text-gray-900">
                      {summaryStats.total > 0
                        ? (
                            (summaryStats.highConfidence / summaryStats.total) *
                            100
                          ).toFixed(0)
                        : 0}
                      %
                    </p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-600">Breaking News:</span>
                    <p className="font-bold text-red-600">
                      {summaryStats.breaking}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-600">Bull/Bear Ratio:</span>
                    <p className="font-bold text-gray-900">
                      {summaryStats.bearish > 0
                        ? (summaryStats.bullish / summaryStats.bearish).toFixed(
                            1
                          )
                        : summaryStats.bullish > 0
                        ? "∞"
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Catalyst Type Legend */}
              <div className="p-4 bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Catalyst Types
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-gray-600">
                      Positive catalysts (BUY signals)
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-gray-600">
                      Negative catalysts (SELL signals)
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                    <span className="text-gray-600">Neutral events (HOLD)</span>
                  </div>
                </div>
              </div>

              {/* Data Sources Info */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Data Sources
                </h4>
                <p className="text-xs text-gray-600">
                  Real-time data from institutional-grade providers including
                  Alpha Vantage, Finnhub, and Polygon.io
                </p>
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <Info className="h-3 w-3 mr-1" />
                  <span>Updates every 5 minutes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to determine market status
const getMarketStatus = (session) => {
  const now = new Date();
  const nyTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const hours = nyTime.getHours();
  const minutes = nyTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const day = nyTime.getDay();

  // Weekend check
  if (day === 0 || day === 6) return "closed";

  switch (session) {
    case "premarket":
      if (totalMinutes >= 240 && totalMinutes < 570) return "open";
      if (totalMinutes < 240) return "upcoming";
      return "closed";
    case "regular":
      if (totalMinutes >= 570 && totalMinutes < 960) return "open";
      if (totalMinutes < 570) return "upcoming";
      return "closed";
    case "afterhours":
      if (totalMinutes >= 960 && totalMinutes < 1200) return "open";
      if (totalMinutes < 960) return "upcoming";
      return "closed";
    default:
      return "closed";
  }
};

export default CatalystAnalysisTab;
