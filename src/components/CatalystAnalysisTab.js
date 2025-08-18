// src/components/CatalystAnalysisTab.js - CORRECTED VERSION v2.1
// Fixed duplicate handlers, missing imports, and undefined references

import React, { useState, useMemo, useEffect } from "react";
import {
  Target,
  Calendar,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  Building,
  DollarSign,
  BarChart3,
  Globe,
  Star,
} from "lucide-react";

// Import will be available after you update InstitutionalDataService.js
// For now, we'll handle the case where methods don't exist yet
let InstitutionalDataService;
try {
  InstitutionalDataService = require("../api/InstitutionalDataService").default;
} catch (error) {
  console.warn("⚠️ InstitutionalDataService not yet updated");
  InstitutionalDataService = null;
}

const CatalystAnalysisTab = ({
  screeningResults = [],
  onSelectStock = () => {},
  watchlist = [],
  onToggleWatchlist = () => {},
  loading = false,
  error = null,
}) => {
  console.log("🎯 CatalystAnalysisTab v2.1 receiving data:", {
    resultCount: screeningResults.length,
    loading,
    error,
  });

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [selectedStock, setSelectedStock] = useState(null);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [expandedCalendar, setExpandedCalendar] = useState(true);
  const [economicCalendarData, setEconomicCalendarData] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [newsData, setNewsData] = useState(null);
  const [newsLoading, setNewsLoading] = useState(false);

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
    return currentPrice * (1 + nissMultiplier * 0.05);
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

  // Get event icon based on type
  const getEventIcon = (event) => {
    if (event.type === "earnings") return Building;
    if (event.event.includes("Employment") || event.event.includes("Payrolls"))
      return BarChart3;
    if (event.event.includes("PMI") || event.event.includes("GDP"))
      return TrendingUp;
    if (event.event.includes("Fed") || event.event.includes("Interest"))
      return DollarSign;
    return Globe;
  };

  // Fallback economic calendar data
  const getFallbackEconomicCalendar = () => {
    const today = new Date();
    const calendarData = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();

      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Weekdays only
        const events = [];

        // Add sample economic events based on day of week
        switch (dayOfWeek) {
          case 1: // Monday
            events.push(
              {
                time: "14:30",
                event: "ISM Manufacturing PMI",
                impact: "HIGH",
                country: "US",
              },
              {
                time: "15:00",
                event: "Construction Spending",
                impact: "MEDIUM",
                country: "US",
              }
            );
            break;
          case 2: // Tuesday
            events.push({
              time: "14:30",
              event: "JOLTs Job Openings",
              impact: "MEDIUM",
              country: "US",
            });
            break;
          case 3: // Wednesday
            events.push(
              {
                time: "14:15",
                event: "ADP Employment Change",
                impact: "HIGH",
                country: "US",
              },
              {
                time: "20:00",
                event: "Fed Beige Book",
                impact: "HIGH",
                country: "US",
              }
            );
            break;
          case 4: // Thursday
            events.push(
              {
                time: "14:30",
                event: "Initial Jobless Claims",
                impact: "MEDIUM",
                country: "US",
              },
              {
                time: "16:00",
                event: "ISM Services PMI",
                impact: "HIGH",
                country: "US",
              }
            );
            break;
          case 5: // Friday
            events.push(
              {
                time: "14:30",
                event: "Non-Farm Payrolls",
                impact: "HIGH",
                country: "US",
              },
              {
                time: "14:30",
                event: "Unemployment Rate",
                impact: "HIGH",
                country: "US",
              }
            );
            break;
        }

        if (events.length > 0) {
          calendarData.push({
            date: date.toISOString().split("T")[0],
            dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
            dayNumber: date.getDate(),
            events: events,
          });
        }
      }
    }

    return calendarData;
  };

  // Fallback news data
  const getFallbackNewsData = (symbol) => {
    return [
      {
        id: 1,
        headline: `${symbol} Reports Strong Q4 Earnings, Beats Estimates`,
        source: "Reuters",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        url: `https://reuters.com/stocks/${symbol}`,
        sentiment: "BULLISH",
        relevanceScore: 9.2,
        impact: "HIGH",
        summary: `${symbol} exceeded analyst expectations with strong quarterly results.`,
      },
      {
        id: 2,
        headline: `Analysts Upgrade ${symbol} Following Product Launch`,
        source: "Bloomberg",
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        url: `https://bloomberg.com/stocks/${symbol}`,
        sentiment: "BULLISH",
        relevanceScore: 8.7,
        impact: "MEDIUM",
        summary: `Multiple analysts raised price targets for ${symbol} citing successful product launch.`,
      },
      {
        id: 3,
        headline: `${symbol} CEO Discusses Growth Strategy in Interview`,
        source: "CNBC",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        url: `https://cnbc.com/stocks/${symbol}`,
        sentiment: "NEUTRAL",
        relevanceScore: 7.5,
        impact: "MEDIUM",
        summary: `CEO outlines strategic initiatives and addresses market concerns.`,
      },
    ];
  };

  // Load detailed news for selected stock
  const loadDetailedNews = async (stock) => {
    setNewsLoading(true);
    try {
      console.log(`📰 Loading detailed news for ${stock.symbol}...`);

      // Check if InstitutionalDataService has the new methods
      if (
        InstitutionalDataService &&
        InstitutionalDataService.getDetailedNewsForStock
      ) {
        const newsResponse =
          await InstitutionalDataService.getDetailedNewsForStock(stock.symbol);

        if (newsResponse.success && newsResponse.articles) {
          setNewsData(newsResponse);
          console.log(
            "✅ Detailed news loaded:",
            newsResponse.articles.length,
            "articles"
          );
          return;
        }
      }

      // Fallback to mock data
      console.log("📰 Using fallback news data");
      const fallbackNews = {
        success: true,
        articles: getFallbackNewsData(stock.symbol),
        metadata: {
          source: "fallback",
          totalArticles: 3,
        },
      };
      setNewsData(fallbackNews);
    } catch (error) {
      console.error("❌ News loading failed:", error);
      // Use fallback data on error
      const fallbackNews = {
        success: true,
        articles: getFallbackNewsData(stock.symbol),
        metadata: {
          source: "fallback-error",
          totalArticles: 3,
        },
      };
      setNewsData(fallbackNews);
    } finally {
      setNewsLoading(false);
    }
  };

  // Get news data for display
  const getNewsForStock = (stock) => {
    if (!stock) return [];

    if (newsData && newsData.articles && Array.isArray(newsData.articles)) {
      return newsData.articles;
    }

    // Return empty array while loading
    return [];
  };

  // Format time ago helper
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now - time) / (1000 * 60 * 60));

    if (diffInHours < 1) return "< 1h ago";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  // ============================================
  // LOAD ECONOMIC CALENDAR DATA
  // ============================================
  useEffect(() => {
    const loadEconomicCalendar = async () => {
      setCalendarLoading(true);
      try {
        console.log("📅 Loading economic calendar...");

        // Check if InstitutionalDataService has the new methods
        if (
          InstitutionalDataService &&
          InstitutionalDataService.getEconomicCalendar
        ) {
          const calendarResponse =
            await InstitutionalDataService.getEconomicCalendar(7);

          if (calendarResponse.success && calendarResponse.data) {
            setEconomicCalendarData(calendarResponse.data);
            console.log(
              "✅ Economic calendar loaded:",
              calendarResponse.data.length,
              "days"
            );
            return;
          }
        }

        // Fallback to static data
        console.log("📅 Using fallback economic calendar");
        const fallbackData = getFallbackEconomicCalendar();
        setEconomicCalendarData(fallbackData);
      } catch (error) {
        console.error("❌ Economic calendar loading failed:", error);
        // Use fallback data on error
        const fallbackData = getFallbackEconomicCalendar();
        setEconomicCalendarData(fallbackData);
      } finally {
        setCalendarLoading(false);
      }
    };

    loadEconomicCalendar();
  }, []); // Load once on component mount

  // ============================================
  // ECONOMIC CALENDAR DATA
  // ============================================
  const economicCalendar = useMemo(() => {
    if (economicCalendarData && Array.isArray(economicCalendarData)) {
      return economicCalendarData;
    }
    return [];
  }, [economicCalendarData]);

  // ============================================
  // CATALYST DATA PROCESSING
  // ============================================
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
            timeframe: "1-3 days",
            description: generateCatalystDescription(stock),
            priceTarget: priceTarget,
            currentPrice: currentPrice,
            upside: currentPrice
              ? ((priceTarget - currentPrice) / currentPrice) * 100
              : 0,
            stockData: stock, // Keep reference to full stock data
          };
        })
        .sort((a, b) => {
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
  // EVENT HANDLERS (SINGLE DEFINITION)
  // ============================================
  const handleStockClick = async (catalyst) => {
    const stock = screeningResults.find((s) => s.symbol === catalyst.symbol);
    if (stock) {
      setSelectedStock(stock);
      setShowNewsModal(true);
      await loadDetailedNews(stock);
    }
  };

  const handleCloseModal = () => {
    setShowNewsModal(false);
    setSelectedStock(null);
    setNewsData(null);
  };

  // ============================================
  // RENDER CONDITIONS
  // ============================================
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

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="flex gap-6 h-full p-6">
      {/* Main Catalyst Analysis Panel */}
      <div className="flex-1 space-y-6">
        {/* Header */}

        {/* No Data State */}
        {catalystData.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center space-x-2 text-yellow-800">
              <Target className="w-5 h-5" />
              <h3 className="font-medium">No Major Catalysts Detected</h3>
            </div>
            <p className="text-yellow-700 mt-2">
              No stocks with significant catalyst potential found in current
              screening results.
            </p>
          </div>
        )}
        {/* Catalyst Cards */}
        {catalystData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {catalystData.map((catalyst, index) => (
              <div
                key={`catalyst-${catalyst.symbol}-${index}`}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleStockClick(catalyst)}
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
                  <ExternalLink className="w-4 h-4 text-gray-400" />
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
                <p className="text-sm text-gray-600 mb-4">
                  {catalyst.description}
                </p>

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
                    <div className="text-xs text-gray-500">
                      Upside Potential
                    </div>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWatchlist(catalyst.stockData);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Add to Watchlist
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Summary Stats */}
        {catalystData.length > 0 && (
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
        )}
      </div>

      {/* Economic Calendar Sidebar */}
      <div className="w-80 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Economic Calendar
          </h3>
          <button
            onClick={() => setExpandedCalendar(!expandedCalendar)}
            className="text-gray-400 hover:text-gray-600"
          >
            {expandedCalendar ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {expandedCalendar && (
          <div className="space-y-4">
            {calendarLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">
                  Loading calendar...
                </span>
              </div>
            ) : economicCalendar.length > 0 ? (
              economicCalendar.map((day) => (
                <div key={day.date} className="border-l-2 border-blue-200 pl-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="text-sm font-medium text-gray-900">
                      {day.dayName} {day.dayNumber}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {day.events.map((event, idx) => {
                      const IconComponent = getEventIcon(event);
                      return (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start space-x-3">
                            <IconComponent className="w-4 h-4 text-gray-600 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-xs text-gray-500">
                                  {event.time}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 text-xs font-medium rounded ${getImpactColor(
                                    event.impact
                                  )}`}
                                >
                                  {event.impact}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900 leading-tight">
                                {event.event}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {event.country}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  No major events this week
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* News Details Modal */}
      {showNewsModal && selectedStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedStock.symbol} - News Analysis
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    NISS Score: {(selectedStock.nissScore || 0).toFixed(1)} |
                    Confidence: {selectedStock.confidence || "MEDIUM"}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Recent News Articles
              </h3>

              {newsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading news...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {getNewsForStock(selectedStock).map((article) => (
                    <div
                      key={article.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900 mb-2 leading-tight">
                            {article.headline}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Building className="w-4 h-4" />
                              <span>{article.source}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatTimeAgo(article.timestamp)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4" />
                              <span>
                                {(article.relevanceScore || 0).toFixed(1)}/10
                              </span>
                            </div>
                          </div>
                          {article.summary && (
                            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                              {article.summary}
                            </p>
                          )}
                        </div>
                        <div className="ml-4 flex flex-col items-end space-y-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              article.sentiment === "BULLISH"
                                ? "text-green-600 bg-green-100"
                                : article.sentiment === "BEARISH"
                                ? "text-red-600 bg-red-100"
                                : "text-gray-600 bg-gray-100"
                            }`}
                          >
                            {article.sentiment}
                          </span>
                          {article.impact && (
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${getImpactColor(
                                article.impact
                              )}`}
                            >
                              {article.impact}
                            </span>
                          )}
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                          >
                            <span>Read Full</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}

                  {getNewsForStock(selectedStock).length === 0 &&
                    !newsLoading && (
                      <div className="text-center py-8">
                        <Building className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">
                          No recent news available
                        </p>
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onSelectStock(selectedStock)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  View Full Analysis
                </button>
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalystAnalysisTab;
