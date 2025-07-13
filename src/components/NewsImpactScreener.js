import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Activity,
  DollarSign,
  Bell,
  Search,
  ExternalLink,
  Shield,
  Target,
  Zap,
  Filter,
  Mail,
  Smartphone,
  Webhook,
} from "lucide-react";
import DataService from "../api/dataService";
import { determineSignal } from "../utils/calculations";
import { JMLogo, brandColors } from "./JMBranding";

const NewsImpactScreener = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [stockData, setStockData] = useState({});
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [marketStatus, setMarketStatus] = useState("");
  const [historicalPerformance, setHistoricalPerformance] = useState([]);
  const [filters, setFilters] = useState({
    marketCap: "all",
    sector: "all",
    nissThreshold: 50,
  });
  const [notificationSettings, setNotificationSettings] = useState({
    browser: false,
    nissThreshold: 75,
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      updateMarketStatus(now);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Update market status
  const updateMarketStatus = (now) => {
    const nyTime = now.toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour24: true,
      hour: "2-digit",
      minute: "2-digit",
    });
    const [hours, minutes] = nyTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes < 240) setMarketStatus("🔴 Market Closed");
    else if (totalMinutes < 570) setMarketStatus("🟡 Pre-Market");
    else if (totalMinutes < 960) setMarketStatus("🟢 Market Open");
    else if (totalMinutes < 1200) setMarketStatus("🟡 After-Hours");
    else setMarketStatus("🔴 Market Closed");
  };

  // Load stock data
  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Expanded watchlist by sector
      const watchlist = {
        biotech: ["VKTX", "MRNA", "BNTX"],
        tech: ["PLTR", "NVDA", "AMD", "SMCI"],
        megaCap: ["AAPL", "MSFT", "GOOGL", "META"],
        ev: ["TSLA", "RIVN", "LCID"],
      };

      const allSymbols = Object.values(watchlist).flat();
      const promises = allSymbols.map((symbol) =>
        DataService.getStockData(symbol)
      );
      const results = await Promise.all(promises);

      const data = {};
      results.forEach((result) => {
        if (result.quote) {
          data[result.symbol] = {
            ...result,
            sector: getSector(result.symbol, watchlist),
            patterns: detectPatterns(result),
          };
        }
      });

      setStockData(data);
      checkForAlerts(data);
      updateHistoricalPerformance(data);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const getSector = (symbol, watchlist) => {
    for (const [sector, symbols] of Object.entries(watchlist)) {
      if (symbols.includes(symbol)) return sector;
    }
    return "other";
  };

  const detectPatterns = (stockData) => {
    const patterns = [];
    const { quote } = stockData;

    if (!quote) return patterns;

    // Breakout detection
    const priceRange = quote.high - quote.low;
    const breakoutThreshold = quote.price * 0.03; // 3% move

    if (quote.price > quote.previousClose + breakoutThreshold) {
      patterns.push({
        type: "breakout",
        direction: "bullish",
        strength: "high",
      });
    } else if (quote.price < quote.previousClose - breakoutThreshold) {
      patterns.push({
        type: "breakdown",
        direction: "bearish",
        strength: "high",
      });
    }

    // Support/Resistance levels
    patterns.push({
      type: "levels",
      resistance: quote.high,
      support: quote.low,
      current: quote.price,
    });

    return patterns;
  };

  const checkForAlerts = (data) => {
    const newAlerts = [];
    Object.entries(data).forEach(([symbol, stock]) => {
      // High NISS alerts
      if (stock.nissScore > notificationSettings.nissThreshold) {
        const alert = {
          id: Date.now() + Math.random(),
          type: "buy",
          title: `${symbol} - Strong Buy Signal`,
          message: `NISS Score: ${
            stock.nissScore
          }. Price: $${stock.quote?.price.toFixed(2)}`,
          timestamp: new Date().toLocaleTimeString("en-GB"),
          symbol,
        };
        newAlerts.push(alert);

        // Browser notification
        if (
          notificationSettings.browser &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification(alert.title, {
            body: alert.message,
            icon: "/icon.png",
          });
        }
      }

      // Pattern alerts
      stock.patterns?.forEach((pattern) => {
        if (pattern.type === "breakout" || pattern.type === "breakdown") {
          newAlerts.push({
            id: Date.now() + Math.random(),
            type:
              pattern.direction === "bullish" ? "pattern-buy" : "pattern-sell",
            title: `${symbol} - ${pattern.type} Detected`,
            message: `Technical ${pattern.type} with ${pattern.strength} strength`,
            timestamp: new Date().toLocaleTimeString("en-GB"),
            symbol,
          });
        }
      });
    });

    setAlerts((prev) => [...newAlerts, ...prev].slice(0, 20));
  };

  const updateHistoricalPerformance = (data) => {
    // Track signal success rate (mock data for demonstration)
    const performance = Object.entries(data).map(([symbol, stock]) => ({
      symbol,
      signalDate: new Date().toISOString(),
      nissScore: stock.nissScore,
      initialPrice: stock.quote?.price,
      signal:
        stock.nissScore > 70 ? "BUY" : stock.nissScore < -60 ? "SELL" : "HOLD",
    }));

    setHistoricalPerformance((prev) => [...performance, ...prev].slice(0, 100));
  };

  // Calculate stop loss
  const calculateStopLoss = (price, signal, volatility) => {
    const baseStop = signal === "BUY" ? 0.95 : 1.05; // 5% stop loss
    const volAdjustment =
      volatility === "High" ? 0.02 : volatility === "Medium" ? 0.01 : 0;
    const stopMultiplier =
      signal === "BUY" ? baseStop - volAdjustment : baseStop + volAdjustment;
    return price * stopMultiplier;
  };

  // Format London time
  const londonTime = currentTime.toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Get most impactful news
  const getMostImpactfulNews = () => {
    const allNews = [];
    Object.entries(stockData).forEach(([symbol, data]) => {
      data.news.forEach((article) => {
        allNews.push({
          ...article,
          symbol,
          impact: Math.abs(data.nissScore),
        });
      });
    });
    return allNews.sort((a, b) => b.impact - a.impact).slice(0, 5);
  };

  // Apply filters
  const applyFilters = (data) => {
    return Object.entries(data).filter(([symbol, stock]) => {
      if (
        filters.marketCap !== "all" &&
        getMarketCapCategory(symbol) !== filters.marketCap
      )
        return false;
      if (filters.sector !== "all" && stock.sector !== filters.sector)
        return false;
      if (Math.abs(stock.nissScore) < filters.nissThreshold) return false;
      return true;
    });
  };

  const getMarketCapCategory = (symbol) => {
    const megaCap = ["AAPL", "MSFT", "GOOGL", "NVDA", "META", "TSLA"];
    const largeCap = ["PLTR", "AMD"];
    const midCap = ["SMCI"];
    const smallCap = ["VKTX", "MRNA", "BNTX", "RIVN", "LCID"];

    if (megaCap.includes(symbol)) return "mega";
    if (largeCap.includes(symbol)) return "large";
    if (midCap.includes(symbol)) return "mid";
    if (smallCap.includes(symbol)) return "small";
    return "unknown";
  };

  // Helper functions
  const getNewsType = (news) => {
    const headline = news.headline.toLowerCase();
    if (headline.includes("earnings") || headline.includes("revenue"))
      return "Earnings Update";
    if (headline.includes("fda") || headline.includes("approval"))
      return "Regulatory News";
    if (
      headline.includes("deal") ||
      headline.includes("acquisition") ||
      headline.includes("merger")
    )
      return "M&A Activity";
    if (headline.includes("ceo") || headline.includes("executive"))
      return "Executive Change";
    if (headline.includes("lawsuit") || headline.includes("investigation"))
      return "Legal Update";
    if (headline.includes("product") || headline.includes("launch"))
      return "Product News";
    return "Corporate Update";
  };

  const getCompanyName = (symbol) => {
    const names = {
      VKTX: "Viking Therapeutics",
      SMCI: "Super Micro Computer",
      PLTR: "Palantir Technologies",
      TSLA: "Tesla Inc.",
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
  };

  const getMarketCapEstimate = (symbol) => {
    const caps = {
      VKTX: "$3.2B",
      SMCI: "$25B",
      PLTR: "$45B",
      TSLA: "$950B",
      NVDA: "$1.2T",
      AAPL: "$3.0T",
      MSFT: "$2.9T",
      GOOGL: "$1.8T",
      AMD: "$230B",
      META: "$1.1T",
      MRNA: "$70B",
      BNTX: "$20B",
      RIVN: "$15B",
      LCID: "$8B",
    };
    return caps[symbol] || "$10B+";
  };

  const calculateRSI = (quote) => {
    if (!quote) return 50;
    const change = quote.changePercent || 0;
    return Math.max(0, Math.min(100, 50 + change * 3.5));
  };

  const calculateVolatility = (quote) => {
    if (!quote) return "Medium";
    const dayRange = ((quote.high - quote.low) / quote.price) * 100;
    if (dayRange > 5) return "High";
    if (dayRange > 2) return "Medium";
    return "Low";
  };

  // Convert to high priority catalysts
  const filteredData = applyFilters(stockData);
  const highPriorityCatalysts = filteredData
    .map(([symbol, data]) => {
      const signal = determineSignal(
        data.nissScore,
        data.quote?.changePercent || 0
      );
      const topNews = data.news[0];
      const newsType = topNews ? getNewsType(topNews) : "Price Movement";
      const volatility = calculateVolatility(data.quote);
      const stopLoss = calculateStopLoss(
        data.quote?.price || 0,
        signal.signal,
        volatility
      );

      return {
        ticker: symbol,
        company: getCompanyName(symbol),
        sector: data.sector,
        event: newsType,
        newsHeadline: topNews?.headline || "No recent news",
        newsSource: topNews?.source || "Market Data",
        date: new Date().toISOString().split("T")[0],
        nissScore: data.nissScore,
        expectedImpact: {
          min: signal.signal.includes("BUY") ? 5 : -15,
          max: signal.signal.includes("BUY") ? 20 : -5,
        },
        probability:
          signal.confidence === "HIGH"
            ? 0.75
            : signal.confidence === "MEDIUM"
            ? 0.65
            : 0.5,
        currentPrice: data.quote?.price || 0,
        signal: signal.signal.includes("BUY")
          ? "BUY"
          : signal.signal.includes("SELL")
          ? "SELL"
          : "HOLD",
        confidence: signal.confidence,
        marketCap: getMarketCapEstimate(symbol),
        volume: data.quote?.volume
          ? (data.quote.volume / 1000000).toFixed(1) + "M"
          : "N/A",
        rsi: calculateRSI(data.quote),
        volatility,
        stopLoss,
        changePercent: data.quote?.changePercent || 0,
        news: data.news,
        patterns: data.patterns,
      };
    })
    .sort((a, b) => Math.abs(b.nissScore) - Math.abs(a.nissScore));

  // Filtered by search
  const searchFiltered = highPriorityCatalysts.filter(
    (catalyst) =>
      searchQuery === "" ||
      catalyst.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      catalyst.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upcomingEarnings = [
    {
      ticker: "PLTR",
      date: "2025-07-29",
      time: "21:00 BST",
      consensus: "$0.14",
      whisper: "$0.16",
      implied: "±8.5%",
    },
    {
      ticker: "TSLA",
      date: "2025-07-24",
      time: "21:30 BST",
      consensus: "$0.85",
      whisper: "$0.92",
      implied: "±6.2%",
    },
    {
      ticker: "MSFT",
      date: "2025-07-25",
      time: "22:00 BST",
      consensus: "$2.95",
      whisper: "$3.02",
      implied: "±4.8%",
    },
    {
      ticker: "META",
      date: "2025-07-26",
      time: "21:00 BST",
      consensus: "$4.52",
      whisper: "$4.68",
      implied: "±7.1%",
    },
  ];

  const redFlags = Object.entries(stockData)
    .filter(
      ([_, data]) => data.nissScore < -50 || data.quote?.changePercent < -5
    )
    .map(([symbol, data]) => ({
      ticker: symbol,
      flag:
        data.nissScore < -60
          ? "High NISS Sell Signal"
          : "Significant Price Drop",
      date: new Date().toISOString().split("T")[0],
      severity: data.nissScore < -70 ? "CRITICAL" : "HIGH",
      details: `Price: $${data.quote?.price.toFixed(
        2
      )}, Change: ${data.quote?.changePercent.toFixed(2)}%`,
    }));

  // Trading schedule for London
  const tradingSchedule = {
    preMarket: { start: "09:00", end: "14:30", label: "US Pre-Market" },
    mainSession: { start: "14:30", end: "21:00", label: "US Main Session" },
    afterHours: { start: "21:00", end: "01:00", label: "US After Hours" },
    optimal: {
      start: "14:30",
      end: "17:00",
      label: "Optimal Trading (High Volume)",
    },
  };

  const SignalBadge = ({ signal, confidence }) => {
    const bgColor =
      signal === "BUY"
        ? "bg-green-500"
        : signal === "SELL"
        ? "bg-red-500"
        : "bg-gray-500";
    const confidenceOpacity =
      confidence === "HIGH"
        ? ""
        : confidence === "MEDIUM"
        ? "opacity-75"
        : "opacity-50";

    return (
      <span
        className={`px-3 py-1 rounded-full text-white text-sm font-bold ${bgColor} ${confidenceOpacity}`}
      >
        {signal}
      </span>
    );
  };

  const ImpactChart = ({ min, max, signal }) => {
    const isPositive = signal === "BUY";
    const color = isPositive ? "bg-[#10b981]" : "bg-[#ef4444]";
    const width = Math.abs(max - min);

    return (
      <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`absolute h-full ${color} opacity-75`}
          style={{
            left: isPositive ? "50%" : `${50 + min}%`,
            width: `${width / 2}%`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-semibold">
          <span>{min}%</span>
          <span>{max}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with JM Branding */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <JMLogo variant="horizontal" height={40} />
              <div className="ml-4 pl-4 border-l border-gray-200">
                <h1 className="text-lg font-semibold text-gray-900">
                  News Impact Screener
                </h1>
              </div>
              <span className="ml-4 text-sm font-medium px-2 py-1 rounded-full bg-gray-100">
                {marketStatus}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <Clock className="inline h-4 w-4 mr-1" />
                London: {londonTime}
              </div>
              <div className="text-sm text-gray-600">
                NYSE:{" "}
                {currentTime.toLocaleTimeString("en-US", {
                  timeZone: "America/New_York",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              "dashboard",
              "catalysts",
              "earnings",
              "alerts",
              "performance",
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? "border-[#1e40af] text-[#1e40af]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard View */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Trading Schedule Alert - Only on Dashboard */}
            <div className="bg-[#f0f4ff] border border-[#e0e7ff] rounded-lg p-4">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-[#1e40af] mr-2" />
                <h3 className="text-sm font-medium text-[#1e40af]">
                  London Trading Schedule
                </h3>
              </div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {Object.entries(tradingSchedule).map(([key, schedule]) => (
                  <div
                    key={key}
                    className={
                      key === "optimal" ? "font-semibold text-[#1e40af]" : ""
                    }
                  >
                    <span className="font-medium text-gray-700">
                      {schedule.label}:
                    </span>
                    <span className="ml-2 text-gray-600">
                      {schedule.start} - {schedule.end}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Buy Signals</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {
                        highPriorityCatalysts.filter((c) => c.signal === "BUY")
                          .length
                      }
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <TrendingDown className="h-8 w-8 text-red-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Sell Signals</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {
                        highPriorityCatalysts.filter((c) => c.signal === "SELL")
                          .length
                      }
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <Zap className="h-8 w-8 text-yellow-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">High NISS ({">"}70)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {
                        highPriorityCatalysts.filter((c) => c.nissScore > 70)
                          .length
                      }
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-8 w-8 text-orange-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Red Flags</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {redFlags.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search stocks, news, or events..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="px-4 py-2 bg-gradient-to-r from-[#1e40af] to-[#3b82f6] text-white rounded-lg hover:from-[#1a3a9f] hover:to-[#3575e0] text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5">
                View Details
              </button>
            </div>

            {/* Top Movers */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Top Movers & Signals
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Highest impact stocks based on NISS Score
                </p>
              </div>
              <div className="divide-y">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e40af] mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading data...</p>
                  </div>
                ) : searchFiltered.slice(0, 5).length > 0 ? (
                  searchFiltered.slice(0, 5).map((catalyst) => (
                    <div
                      key={catalyst.ticker}
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {catalyst.ticker}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {catalyst.company}
                            </p>
                          </div>
                          <SignalBadge
                            signal={catalyst.signal}
                            confidence={catalyst.confidence}
                          />
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            ${catalyst.currentPrice.toFixed(2)}
                          </p>
                          <p
                            className={`text-sm ${
                              catalyst.changePercent > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {catalyst.changePercent > 0 ? "+" : ""}
                            {catalyst.changePercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    No significant movers found
                  </div>
                )}
              </div>
            </div>

            {/* Recent News Impact */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  High Impact News
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Latest news driving market movements
                </p>
              </div>
              <div className="divide-y">
                {getMostImpactfulNews().map((news, idx) => (
                  <div key={idx} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <span className="font-semibold text-gray-900 mr-2">
                            {news.symbol}
                          </span>
                          <span className="text-xs text-gray-500">
                            {news.source}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{news.headline}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(news.datetime * 1000).toLocaleString(
                            "en-GB"
                          )}
                        </p>
                      </div>
                      <div className="ml-4">
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Red Flags Alert */}
            {redFlags.length > 0 && (
              <div className="bg-red-50 rounded-lg shadow">
                <div className="px-6 py-4 border-b border-red-100">
                  <h2 className="text-lg font-semibold text-red-900 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Red Flags Detected
                  </h2>
                </div>
                <div className="divide-y divide-red-100">
                  {redFlags.slice(0, 3).map((flag) => (
                    <div key={flag.ticker} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-red-900">
                            {flag.ticker}
                          </span>
                          <span className="ml-3 text-red-700">{flag.flag}</span>
                          <p className="text-sm text-red-600 mt-1">
                            {flag.details}
                          </p>
                        </div>
                        <div className="text-sm text-red-600">
                          Severity:{" "}
                          <span className="font-semibold">{flag.severity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Catalysts View */}
        {activeTab === "catalysts" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Filter Catalysts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Market Cap
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={filters.marketCap}
                    onChange={(e) =>
                      setFilters({ ...filters, marketCap: e.target.value })
                    }
                  >
                    <option value="all">All Caps</option>
                    <option value="mega">Mega Cap ($200B+)</option>
                    <option value="large">Large Cap ($10B-$200B)</option>
                    <option value="mid">Mid Cap ($2B-$10B)</option>
                    <option value="small">Small Cap (&lt;$2B)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Sector
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={filters.sector}
                    onChange={(e) =>
                      setFilters({ ...filters, sector: e.target.value })
                    }
                  >
                    <option value="all">All Sectors</option>
                    <option value="tech">Technology</option>
                    <option value="biotech">Biotech</option>
                    <option value="megaCap">Mega Cap Tech</option>
                    <option value="ev">Electric Vehicles</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Min NISS Score
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={filters.nissThreshold}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        nissThreshold: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="flex items-end">
                  <button
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    onClick={() =>
                      setFilters({
                        marketCap: "all",
                        sector: "all",
                        nissThreshold: 50,
                      })
                    }
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  All Active Catalysts
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {searchFiltered.length} catalysts with NISS score
                  above {filters.nissThreshold}
                </p>
              </div>
              <div className="divide-y">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading catalysts...</p>
                  </div>
                ) : searchFiltered.length > 0 ? (
                  searchFiltered.map((catalyst) => (
                    <div key={catalyst.ticker} className="p-6 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {catalyst.ticker}
                            </h3>
                            <span className="ml-2 text-sm text-gray-600">
                              {catalyst.company}
                            </span>
                            <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                              {catalyst.sector}
                            </span>
                            <div className="ml-4">
                              <SignalBadge
                                signal={catalyst.signal}
                                confidence={catalyst.confidence}
                              />
                            </div>
                          </div>

                          {/* News Information */}
                          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              Latest News:
                            </p>
                            <p className="text-sm text-gray-600">
                              {catalyst.newsHeadline}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Source: {catalyst.newsSource} | Type:{" "}
                              {catalyst.event}
                            </p>
                          </div>

                          {/* Pattern Detection */}
                          {catalyst.patterns &&
                            catalyst.patterns.length > 0 && (
                              <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm font-medium text-blue-700 mb-1">
                                  Technical Patterns:
                                </p>
                                {catalyst.patterns.map((pattern, idx) => (
                                  <p
                                    key={idx}
                                    className="text-xs text-blue-600"
                                  >
                                    {pattern.type === "breakout" &&
                                      `🚀 Bullish breakout detected`}
                                    {pattern.type === "breakdown" &&
                                      `⚠️ Bearish breakdown detected`}
                                    {pattern.type === "levels" &&
                                      `Support: $${pattern.support.toFixed(
                                        2
                                      )} | Resistance: $${pattern.resistance.toFixed(
                                        2
                                      )}`}
                                  </p>
                                ))}
                              </div>
                            )}

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-4">
                            <div>
                              <span className="text-gray-600">
                                Current Price:
                              </span>
                              <span className="ml-2 font-medium">
                                ${catalyst.currentPrice.toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Change:</span>
                              <span
                                className={`ml-2 font-medium ${
                                  catalyst.changePercent > 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {catalyst.changePercent > 0 ? "+" : ""}
                                {catalyst.changePercent.toFixed(2)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Stop Loss:</span>
                              <span className="ml-2 font-medium text-red-600">
                                ${catalyst.stopLoss.toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Volume:</span>
                              <span className="ml-2 font-medium">
                                {catalyst.volume}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Volatility:</span>
                              <span
                                className={`ml-2 font-medium ${
                                  catalyst.volatility === "High"
                                    ? "text-red-600"
                                    : catalyst.volatility === "Medium"
                                    ? "text-yellow-600"
                                    : "text-green-600"
                                }`}
                              >
                                {catalyst.volatility}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-gray-600">
                                Expected Impact:
                              </span>
                              <ImpactChart
                                min={catalyst.expectedImpact.min}
                                max={catalyst.expectedImpact.max}
                                signal={catalyst.signal}
                              />
                            </div>
                            <div className="flex items-center space-x-6 text-sm">
                              <div>
                                <span className="text-gray-600">
                                  NISS Score:
                                </span>
                                <span className="ml-2 font-bold text-[#1e40af]">
                                  {catalyst.nissScore}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">RSI:</span>
                                <span className="ml-2 font-medium">
                                  {catalyst.rsi.toFixed(0)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">
                                  Market Cap:
                                </span>
                                <span className="ml-2 font-medium">
                                  {catalyst.marketCap}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">
                                  News Count:
                                </span>
                                <span className="ml-2 font-medium">
                                  {catalyst.news.length}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="ml-6 text-right">
                          <div
                            className={`text-2xl font-bold ${
                              catalyst.signal === "BUY"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {catalyst.signal === "BUY" ? "+" : ""}
                            {catalyst.expectedImpact.min}% to{" "}
                            {catalyst.signal === "BUY" ? "+" : ""}
                            {catalyst.expectedImpact.max}%
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Probability:{" "}
                            {(catalyst.probability * 100).toFixed(0)}%
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Risk/Reward: 1:
                            {Math.abs(
                              catalyst.expectedImpact.max /
                                catalyst.expectedImpact.min
                            ).toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    No catalysts match your filter criteria
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Earnings View */}
        {activeTab === "earnings" && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Upcoming Earnings
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Next 7 days earnings calendar (BST times)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time (BST)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Consensus EPS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Whisper EPS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Implied Move
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Beat Probability
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {upcomingEarnings.map((earning) => {
                    const beatProb =
                      (parseFloat(earning.whisper.slice(1)) /
                        parseFloat(earning.consensus.slice(1)) -
                        1) *
                      100;
                    return (
                      <tr key={earning.ticker} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {earning.ticker}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getCompanyName(earning.ticker)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {earning.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {earning.time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {earning.consensus}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {earning.whisper}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {earning.implied}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              beatProb > 5
                                ? "bg-green-100 text-green-800"
                                : beatProb < -5
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {beatProb > 0 ? "+" : ""}
                            {beatProb.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Alerts View */}
        {activeTab === "alerts" && (
          <div className="space-y-6">
            {/* Notification Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Notification Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      Browser Notifications
                    </p>
                    <p className="text-sm text-gray-600">
                      Get alerts when high-impact signals are detected
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setNotificationSettings({
                        ...notificationSettings,
                        browser: !notificationSettings.browser,
                      })
                    }
                    className={`relative inline-flex items-center h-6 rounded-full w-11 ${
                      notificationSettings.browser
                        ? "bg-[#1e40af]"
                        : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block w-4 h-4 transform transition bg-white rounded-full ${
                        notificationSettings.browser
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NISS Alert Threshold
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={notificationSettings.nissThreshold}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        nissThreshold: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Alert Thresholds */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Alert Thresholds
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-green-900">Buy Signal</p>
                    <p className="text-sm text-green-700">
                      NISS Score {">"} 75
                    </p>
                  </div>
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-red-900">Sell Signal</p>
                    <p className="text-sm text-red-700">NISS Score &lt; -60</p>
                  </div>
                  <Target className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="font-medium text-yellow-900">Pattern Alert</p>
                    <p className="text-sm text-yellow-700">
                      Breakout/Breakdown
                    </p>
                  </div>
                  <Activity className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Recent Alerts
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Real-time trading signals and notifications
                </p>
              </div>
              <div className="divide-y divide-gray-200">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <div key={alert.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-start">
                        <div
                          className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                            alert.type === "buy"
                              ? "bg-green-100"
                              : alert.type === "sell"
                              ? "bg-red-100"
                              : alert.type === "pattern-buy"
                              ? "bg-blue-100"
                              : "bg-yellow-100"
                          }`}
                        >
                          {alert.type === "buy" ||
                          alert.type === "pattern-buy" ? (
                            <TrendingUp
                              className={`h-5 w-5 ${
                                alert.type === "buy"
                                  ? "text-green-600"
                                  : "text-[#1e40af]"
                              }`}
                            />
                          ) : (
                            <TrendingDown
                              className={`h-5 w-5 ${
                                alert.type === "sell"
                                  ? "text-red-600"
                                  : "text-yellow-600"
                              }`}
                            />
                          )}
                        </div>
                        <div className="ml-4 flex-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {alert.title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {alert.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {alert.timestamp}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center text-gray-500">
                    <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p>
                      No alerts yet. Alerts will appear when significant trading
                      signals are detected.
                    </p>
                    <p className="text-sm mt-2">
                      Monitoring {Object.keys(stockData).length} stocks for
                      opportunities...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Performance View */}
        {activeTab === "performance" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Signal Performance Tracking
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">
                    {
                      historicalPerformance.filter((p) => p.signal === "BUY")
                        .length
                    }
                  </p>
                  <p className="text-sm text-gray-600">Total Buy Signals</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">
                    {
                      historicalPerformance.filter((p) => p.signal === "SELL")
                        .length
                    }
                  </p>
                  <p className="text-sm text-gray-600">Total Sell Signals</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">
                    {(
                      (historicalPerformance.filter((p) => p.nissScore > 75)
                        .length /
                        historicalPerformance.length) *
                      100
                    ).toFixed(0)}
                    %
                  </p>
                  <p className="text-sm text-gray-600">High Confidence Rate</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Symbol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Signal Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        NISS Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Signal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Entry Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {historicalPerformance.slice(0, 10).map((perf, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {perf.symbol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(perf.signalDate).toLocaleDateString(
                            "en-GB"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {perf.nissScore}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              perf.signal === "BUY"
                                ? "bg-green-100 text-green-800"
                                : perf.signal === "SELL"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {perf.signal}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${perf.initialPrice?.toFixed(2) || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NewsImpactScreener;
