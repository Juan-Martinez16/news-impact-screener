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

  // Update market status - FIXED: Corrected time calculations
  const updateMarketStatus = (now) => {
    const nyTime = new Date(
      now.toLocaleString("en-US", { timeZone: "America/New_York" })
    );
    const hours = nyTime.getHours();
    const minutes = nyTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // Market hours in EST/EDT:
    // Pre-market: 4:00 AM - 9:30 AM (240-570 minutes)
    // Regular hours: 9:30 AM - 4:00 PM (570-960 minutes)
    // After-hours: 4:00 PM - 8:00 PM (960-1200 minutes)

    const day = nyTime.getDay();
    const isWeekend = day === 0 || day === 6;

    if (isWeekend) {
      setMarketStatus("🔴 Market Closed");
    } else if (totalMinutes >= 240 && totalMinutes < 570) {
      setMarketStatus("🟡 Pre-Market");
    } else if (totalMinutes >= 570 && totalMinutes < 960) {
      setMarketStatus("🟢 Market Open");
    } else if (totalMinutes >= 960 && totalMinutes < 1200) {
      setMarketStatus("🟡 After-Hours");
    } else {
      setMarketStatus("🔴 Market Closed");
    }
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
    } finally {
      setLoading(false);
    }
  };

  const getSector = (symbol, watchlist) => {
    for (const [sector, symbols] of Object.entries(watchlist)) {
      if (symbols.includes(symbol)) return sector;
    }
    return "unknown";
  };

  const detectPatterns = (data) => {
    const patterns = [];
    if (!data.quote) return patterns;

    const change = data.quote.changePercent || 0;
    const volume = data.quote.volume || 0;
    const avgVolume = data.quote.avgVolume || 1;

    if (Math.abs(change) > 5) patterns.push("Significant Move");
    if (volume > avgVolume * 2) patterns.push("High Volume");
    if (data.nissScore > 80) patterns.push("Strong NISS Signal");

    return patterns;
  };

  const checkForAlerts = (data) => {
    const newAlerts = [];
    Object.entries(data).forEach(([symbol, stockData]) => {
      if (
        stockData.nissScore > notificationSettings.nissThreshold &&
        stockData.quote?.changePercent > 0
      ) {
        const alert = {
          id: `${symbol}-${Date.now()}`,
          ticker: symbol,
          type: "NISS Alert",
          message: `${symbol} showing strong buy signal (NISS: ${stockData.nissScore})`,
          time: new Date(),
          severity: stockData.nissScore > 85 ? "high" : "medium",
        };
        newAlerts.push(alert);

        if (
          notificationSettings.browser &&
          Notification.permission === "granted"
        ) {
          new Notification(`JM Trading Alert: ${symbol}`, {
            body: alert.message,
            icon: "/favicon.ico",
          });
        }
      }
    });

    setAlerts((prev) => [...newAlerts, ...prev].slice(0, 50));
  };

  const updateHistoricalPerformance = (data) => {
    const performance = Object.entries(data).map(([symbol, stockData]) => ({
      ticker: symbol,
      signal: determineSignal(
        stockData.nissScore,
        stockData.quote?.changePercent || 0
      ),
      timestamp: new Date(),
      price: stockData.quote?.price || 0,
    }));

    setHistoricalPerformance((prev) => [...performance, ...prev].slice(0, 100));
  };

  const londonTime = currentTime.toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
  });

  const applyFilters = (data) => {
    return Object.entries(data).filter(([symbol, stockData]) => {
      if (filters.sector !== "all" && stockData.sector !== filters.sector) {
        return false;
      }
      if (Math.abs(stockData.nissScore) < filters.nissThreshold) {
        return false;
      }
      return true;
    });
  };

  const getNewsType = (news) => {
    if (!news || !news.headline) return "General News";
    const headline = news.headline.toLowerCase();
    if (headline.includes("earnings")) return "Earnings";
    if (headline.includes("fda") || headline.includes("approval"))
      return "FDA Update";
    if (headline.includes("analyst") || headline.includes("upgrade"))
      return "Analyst Action";
    if (headline.includes("deal") || headline.includes("merger")) return "M&A";
    return "Breaking News";
  };

  const calculateStopLoss = (price, signal, volatility) => {
    if (!price) return 0;
    const multiplier =
      volatility === "High" ? 0.03 : volatility === "Medium" ? 0.02 : 0.015;
    return signal.includes("BUY")
      ? (price * (1 - multiplier)).toFixed(2)
      : (price * (1 + multiplier)).toFixed(2);
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
    const pulseColor =
      signal === "BUY"
        ? "bg-green-400"
        : signal === "SELL"
        ? "bg-red-400"
        : "bg-gray-400";

    return (
      <div className="relative">
        <span
          className={`${bgColor} text-white px-3 py-1 rounded-full text-xs font-bold`}
        >
          {signal}
        </span>
        {confidence === "HIGH" && (
          <span className={`absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3`}>
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pulseColor} opacity-75`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${bgColor}`}
            ></span>
          </span>
        )}
      </div>
    );
  };

  const ImpactBar = ({ min, max }) => {
    const isPositive = max > 0;
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
      {/* Header with JM Branding - FIXED: Using primary variant */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <JMLogo variant="primary" height={60} />
              <div className="ml-4 pl-4 border-l border-gray-200">
                <h1 className="text-lg font-semibold text-gray-900">
                  News Impact Screener
                </h1>
              </div>
              <span
                className={`ml-4 text-sm font-medium px-3 py-1 rounded-full ${
                  marketStatus.includes("Open")
                    ? "bg-green-100 text-green-800"
                    : marketStatus.includes("Pre-Market") ||
                      marketStatus.includes("After-Hours")
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
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

      {/* Search Bar */}
      <div className="bg-white px-4 py-4 border-b">
        <div className="max-w-7xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ticker or company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Key Metrics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Signals</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {highPriorityCatalysts.length}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-[#3b82f6]" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Buy Signals</p>
                    <p className="text-2xl font-bold text-green-600">
                      {
                        highPriorityCatalysts.filter((c) => c.signal === "BUY")
                          .length
                      }
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sell Signals</p>
                    <p className="text-2xl font-bold text-red-600">
                      {
                        highPriorityCatalysts.filter((c) => c.signal === "SELL")
                          .length
                      }
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg NISS Score</p>
                    <p className="text-2xl font-bold text-[#1e40af]">
                      {highPriorityCatalysts.length > 0
                        ? (
                            highPriorityCatalysts.reduce(
                              (sum, c) => sum + Math.abs(c.nissScore),
                              0
                            ) / highPriorityCatalysts.length
                          ).toFixed(0)
                        : 0}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-[#1e40af]" />
                </div>
              </div>
            </div>

            {/* Trading Schedule */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-[#1e40af]" />
                Trading Schedule (London Time)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(tradingSchedule).map(([key, schedule]) => (
                  <div
                    key={key}
                    className={`p-4 rounded-lg ${
                      key === "optimal"
                        ? "bg-[#f0f4ff] border-2 border-[#3b82f6]"
                        : "bg-gray-50"
                    }`}
                  >
                    <p className="font-medium text-sm">{schedule.label}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {schedule.start} - {schedule.end}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Opportunities */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Top Trading Opportunities
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Symbol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        NISS Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Signal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Change
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stop Loss
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-4 text-center">
                          <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b82f6]"></div>
                          </div>
                        </td>
                      </tr>
                    ) : searchFiltered.length === 0 ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          No trading opportunities found
                        </td>
                      </tr>
                    ) : (
                      searchFiltered.slice(0, 10).map((catalyst) => (
                        <tr
                          key={catalyst.ticker}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {catalyst.ticker}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {catalyst.company}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`text-sm font-bold ${
                                catalyst.nissScore > 70
                                  ? "text-green-600"
                                  : catalyst.nissScore > 50
                                  ? "text-blue-600"
                                  : catalyst.nissScore < -50
                                  ? "text-red-600"
                                  : "text-gray-600"
                              }`}
                            >
                              {catalyst.nissScore}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <SignalBadge
                              signal={catalyst.signal}
                              confidence={catalyst.confidence}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${catalyst.currentPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`text-sm font-medium ${
                                catalyst.changePercent > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {catalyst.changePercent > 0 ? "+" : ""}
                              {catalyst.changePercent.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${catalyst.stopLoss}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-[#3b82f6] hover:text-[#1e40af]">
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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
                        nissThreshold: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="flex items-end">
                  <button className="w-full px-4 py-2 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#1e40af] transition-colors">
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>

            {/* High Priority Catalysts */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  High Priority Catalysts
                </h2>
              </div>
              <div className="p-6">
                {searchFiltered.map((catalyst) => (
                  <div
                    key={catalyst.ticker}
                    className="mb-6 pb-6 border-b last:border-b-0"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {catalyst.ticker}{" "}
                          <span className="text-sm font-normal text-gray-600">
                            - {catalyst.company}
                          </span>
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {catalyst.event} • {catalyst.marketCap} •{" "}
                          {catalyst.sector}
                        </p>
                      </div>
                      <SignalBadge
                        signal={catalyst.signal}
                        confidence={catalyst.confidence}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          NISS Score / RSI
                        </p>
                        <p className="text-lg font-bold text-[#1e40af]">
                          {catalyst.nissScore} / {catalyst.rsi}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Current Price / Stop Loss
                        </p>
                        <p className="text-lg font-semibold">
                          ${catalyst.currentPrice.toFixed(2)} / $
                          {catalyst.stopLoss}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Volume / Volatility
                        </p>
                        <p className="text-lg font-semibold">
                          {catalyst.volume} / {catalyst.volatility}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">
                        Expected Impact Range
                      </p>
                      <ImpactBar
                        min={catalyst.expectedImpact.min}
                        max={catalyst.expectedImpact.max}
                      />
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Latest News:</strong> {catalyst.newsHeadline}
                      </p>
                      <p className="text-xs text-gray-500">
                        Source: {catalyst.newsSource} • Probability:{" "}
                        {(catalyst.probability * 100).toFixed(0)}%
                      </p>
                    </div>

                    {catalyst.patterns.length > 0 && (
                      <div className="mt-3 flex gap-2">
                        {catalyst.patterns.map((pattern, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-[#f0f4ff] text-[#1e40af] rounded text-xs font-medium"
                          >
                            {pattern}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "earnings" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Upcoming Earnings
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ticker
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
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {upcomingEarnings.map((earning) => (
                      <tr key={earning.ticker}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {earning.ticker}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1e40af]">
                          {earning.implied}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Red Flags */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Red Flags - Potential Risks
                </h2>
              </div>
              <div className="p-6">
                {redFlags.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No significant red flags detected
                  </p>
                ) : (
                  <div className="space-y-4">
                    {redFlags.map((flag, idx) => (
                      <div
                        key={idx}
                        className="flex items-start p-4 bg-red-50 rounded-lg border border-red-200"
                      >
                        <Shield className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900">
                            {flag.ticker} - {flag.flag}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {flag.details}
                          </p>
                          <span
                            className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded ${
                              flag.severity === "CRITICAL"
                                ? "bg-red-600 text-white"
                                : "bg-red-500 text-white"
                            }`}
                          >
                            {flag.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "alerts" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Alert Settings
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      Browser Notifications
                    </p>
                    <p className="text-sm text-gray-600">
                      Get notified when NISS score exceeds threshold
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setNotificationSettings({
                        ...notificationSettings,
                        browser: !notificationSettings.browser,
                      });
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      notificationSettings.browser
                        ? "bg-[#3b82f6]"
                        : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        notificationSettings.browser
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NISS Score Threshold
                  </label>
                  <input
                    type="number"
                    value={notificationSettings.nissThreshold}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        nissThreshold: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Recent Alerts
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {alerts.length === 0 ? (
                  <p className="p-6 text-center text-gray-500">No alerts yet</p>
                ) : (
                  alerts.slice(0, 20).map((alert) => (
                    <div key={alert.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {alert.ticker} - {alert.type}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {alert.message}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            alert.severity === "high"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {alert.time.toLocaleTimeString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "performance" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Signal Performance Tracking
              </h2>
              <p className="text-gray-600">
                Track the historical performance of NISS signals
              </p>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Signals</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {historicalPerformance.length}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600">Successful</p>
                  <p className="text-2xl font-bold text-green-600">
                    {
                      historicalPerformance.filter(
                        (p) => p.signal.confidence === "HIGH"
                      ).length
                    }
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600">Win Rate</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {historicalPerformance.length > 0
                      ? (
                          (historicalPerformance.filter(
                            (p) => p.signal.confidence === "HIGH"
                          ).length /
                            historicalPerformance.length) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NewsImpactScreener;
