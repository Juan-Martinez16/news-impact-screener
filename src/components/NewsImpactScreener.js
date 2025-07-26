import React, { useState, useEffect } from "react";
import CatalystAnalysisTab from "./CatalystAnalysisTab";
import PerformanceTrackingTab from "./PerformanceTrackingTab";
import CatalystMetricsDebugger from "./CatalystMetricsDebugger";
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
  BarChart2,
  Info,
  RefreshCw,
  Download,
  Settings,
  ChevronRight,
} from "lucide-react";
import InstitutionalDataService from "../api/InstitutionalDataService";
import { JMLogo, brandColors } from "./JMBranding";

const NewsImpactScreener = () => {
  // Core state management
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [stockData, setStockData] = useState({});
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [marketStatus, setMarketStatus] = useState("");
  const [historicalPerformance, setHistoricalPerformance] = useState([]);
  const [backendHealth, setBackendHealth] = useState(true);

  // Enhanced institutional filters
  const [filters, setFilters] = useState({
    marketCap: "all",
    sector: "all",
    nissThreshold: 75, // Higher threshold for institutional grade
    minConfidence: "MEDIUM",
    minVolume: 1000000,
    minPrice: 5,
    maxPrice: null,
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    browser: false,
    nissThreshold: 75,
    minConfidence: "HIGH",
  });

  // Institutional-grade state
  const [marketRegime, setMarketRegime] = useState({
    volatility: "normal",
    trend: "neutral",
    breadth: "mixed",
  });
  const [screeningResults, setScreeningResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 minutes
  const [isScreening, setIsScreening] = useState(false);
  const [sortBy, setSortBy] = useState("nissScore");
  const [sortDirection, setSortDirection] = useState("desc");

  // Market timing and status
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
  // Add this useEffect after your existing ones:
  useEffect(() => {
    // Check backend health on component mount
    const checkBackend = async () => {
      try {
        const isHealthy = await InstitutionalDataService.checkBackendHealth();
        setBackendHealth(isHealthy);

        if (!isHealthy) {
          console.warn("Backend is not responding, using fallback data");
        }
      } catch (error) {
        console.error("Backend health check failed:", error);
        setBackendHealth(false);
      }
    };

    checkBackend();

    // Check backend health every 5 minutes
    const healthCheckInterval = setInterval(checkBackend, 5 * 60 * 1000);

    return () => clearInterval(healthCheckInterval);
  }, []);
  // Enhanced market status with institutional trading windows
  const updateMarketStatus = (now) => {
    const nyTime = new Date(
      now.toLocaleString("en-US", { timeZone: "America/New_York" })
    );
    const hours = nyTime.getHours();
    const minutes = nyTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const day = nyTime.getDay();
    const isWeekend = day === 0 || day === 6;

    if (isWeekend) {
      setMarketStatus("🔴 Market Closed");
    } else if (totalMinutes >= 240 && totalMinutes < 570) {
      setMarketStatus("🟡 Pre-Market (Institutional Active)");
    } else if (totalMinutes >= 570 && totalMinutes < 960) {
      // Enhanced status for institutional trading windows
      if (totalMinutes >= 570 && totalMinutes < 600) {
        setMarketStatus("🟢 Market Open - Opening Volatility");
      } else if (totalMinutes >= 600 && totalMinutes < 930) {
        setMarketStatus("🟢 Market Open - Institutional Prime Time");
      } else if (totalMinutes >= 930 && totalMinutes < 960) {
        setMarketStatus("🟢 Market Open - Closing Volatility");
      } else {
        setMarketStatus("🟢 Market Open");
      }
    } else if (totalMinutes >= 960 && totalMinutes < 1200) {
      setMarketStatus("🟡 After-Hours (Limited Institutional)");
    } else {
      setMarketStatus("🔴 Market Closed");
    }
  };

  // Enhanced data loading with institutional screening
  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, filters]);

  // Market regime monitoring
  useEffect(() => {
    InstitutionalDataService.updateMarketRegime();
    const interval = setInterval(async () => {
      await InstitutionalDataService.updateMarketRegime();
      setMarketRegime(InstitutionalDataService.marketRegime);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Institutional-grade data loading

  // Enhanced data loading with institutional screening
  const loadAllData = async () => {
    setLoading(true);
    try {
      if (!isScreening) {
        setIsScreening(true);

        let results;

        // Try backend screening first, fallback to client-side
        if (backendHealth) {
          try {
            // Try to use backend screening if available
            results = await InstitutionalDataService.screenAllStocks(filters);
          } catch (error) {
            console.warn("Backend screening failed, using client-side:", error);
            results = await InstitutionalDataService.screenAllStocks(filters);
            setBackendHealth(false);
          }
        } else {
          results = await InstitutionalDataService.screenAllStocks(filters);
        }

        setScreeningResults(results);

        // Convert to legacy format for backward compatibility
        const data = {};
        results.forEach((result) => {
          data[result.symbol] = {
            ...result,
            patterns: detectInstitutionalPatterns(result),
          };
        });

        setStockData(data);
        checkForInstitutionalAlerts(results);
        updatePerformanceTracking(results);
        setIsScreening(false);
      }
    } catch (error) {
      console.error("Error loading institutional data:", error);
      setIsScreening(false);
      setBackendHealth(false);
    } finally {
      setLoading(false);
    }
  };
  // Enhanced institutional pattern detection
  const detectInstitutionalPatterns = (data) => {
    const patterns = [];
    if (!data.quote || !data.nissData) return patterns;

    const { quote, nissData, tradeSetup } = data;
    const change = quote.changePercent || 0;
    const volume = quote.volume || 0;
    const avgVolume = quote.avgVolume || volume;
    const { score, confidence, components } = nissData;

    // Institutional-grade patterns based on cheat sheet
    if (Math.abs(score) > 75 && confidence === "HIGH") {
      patterns.push("Strong Institutional Signal");
    }

    if (volume > avgVolume * 3) {
      patterns.push("Unusual Volume Surge");
    }

    if (components.options > 80) {
      patterns.push("Smart Money Options Flow");
    }

    if (components.newsImpact > 70 && components.volume > 60) {
      patterns.push("News + Volume Confirmation");
    }

    if (tradeSetup?.riskReward > 2.5) {
      patterns.push("High Risk/Reward Setup");
    }

    if (Math.abs(change) > 5 && volume > avgVolume * 2) {
      patterns.push("Institutional Breakout");
    }

    // Market regime patterns
    if (marketRegime.volatility === "high" && confidence === "HIGH") {
      patterns.push("High Volatility Alpha");
    }

    return patterns;
  };

  // Enhanced alert system for institutional signals
  const checkForInstitutionalAlerts = (results) => {
    const newAlerts = [];

    results.forEach((stockData) => {
      const { symbol, nissScore, nissData, tradeSetup, quote } = stockData;

      // Strong buy/sell signals (institutional grade)
      if (
        Math.abs(nissScore) > notificationSettings.nissThreshold &&
        nissData.confidence === "HIGH"
      ) {
        const alertType = nissScore > 0 ? "STRONG BUY" : "STRONG SELL";
        const alert = {
          id: `${symbol}-institutional-${Date.now()}`,
          ticker: symbol,
          type: `Institutional ${alertType}`,
          message: `${symbol} institutional signal: ${alertType} (NISS: ${nissScore.toFixed(
            0
          )}, R:R: ${tradeSetup?.riskReward?.toFixed(1) || "N/A"})`,
          time: new Date(),
          severity: "high",
          details:
            tradeSetup?.reasoning || "Multi-factor institutional confirmation",
          action: tradeSetup?.action,
          entry: tradeSetup?.entry,
          stopLoss: tradeSetup?.stopLoss,
          targets: tradeSetup?.targets,
        };

        newAlerts.push(alert);

        // Browser notification for high-confidence signals
        if (
          notificationSettings.browser &&
          Notification.permission === "granted"
        ) {
          new Notification(`JM Institutional Alert: ${symbol}`, {
            body: `${alertType} Signal - NISS: ${nissScore.toFixed(
              0
            )} | Entry: $${tradeSetup?.entry?.toFixed(2) || "N/A"}`,
            icon: "/favicon.ico",
            tag: symbol, // Prevents duplicate notifications
          });
        }
      }

      // Options flow alerts
      if (nissData?.components?.options > 80) {
        newAlerts.push({
          id: `${symbol}-options-${Date.now()}`,
          ticker: symbol,
          type: "Smart Money Flow",
          message: `Institutional options activity in ${symbol} (Score: ${nissData.components.options.toFixed(
            0
          )})`,
          time: new Date(),
          severity: "medium",
          details: `Options component suggests smart money positioning`,
        });
      }

      // Volume surge alerts
      if (quote.volume > quote.avgVolume * 3 && Math.abs(nissScore) > 60) {
        newAlerts.push({
          id: `${symbol}-volume-${Date.now()}`,
          ticker: symbol,
          type: "Volume Breakout",
          message: `${symbol} volume surge: ${(
            quote.volume / quote.avgVolume
          ).toFixed(1)}x average`,
          time: new Date(),
          severity: "medium",
          details: `Volume confirms institutional interest`,
        });
      }

      // Market regime alerts
      if (marketRegime.volatility === "high" && Math.abs(nissScore) > 85) {
        newAlerts.push({
          id: `${symbol}-regime-${Date.now()}`,
          ticker: symbol,
          type: "High Volatility Alpha",
          message: `${symbol} strong signal in high volatility regime`,
          time: new Date(),
          severity: "high",
          details: `Signal strength validated by market conditions`,
        });
      }
    });

    setAlerts((prev) => [...newAlerts, ...prev].slice(0, 100));
  };

  // Enhanced performance tracking
  const updatePerformanceTracking = (results) => {
    const performance = results
      .filter((stock) => Math.abs(stock.nissScore) > 60) // Only track significant signals
      .map((stockData) => ({
        ticker: stockData.symbol,
        signal: stockData.tradeSetup,
        nissData: stockData.nissData,
        timestamp: new Date(),
        price: stockData.quote?.price || 0,
        marketRegime: { ...marketRegime },
        components: stockData.nissData?.components || {},
      }));

    setHistoricalPerformance((prev) => [...performance, ...prev].slice(0, 200));
  };

  // Helper functions for display
  const londonTime = currentTime.toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Enhanced filtering with institutional criteria
  const applyInstitutionalFilters = (data) => {
    return data.filter((stockData) => {
      // Basic filters
      if (filters.sector !== "all" && stockData.sector !== filters.sector)
        return false;

      // FIXED: Handle both positive and negative NISS scores
      const nissScore = stockData.nissScore;
      const threshold = filters.nissThreshold;

      // Include stocks with:
      // 1. Positive NISS scores above threshold (BUY opportunities)
      // 2. Negative NISS scores below -threshold (SELL opportunities)
      const meetsThreshold = nissScore >= threshold || nissScore <= -threshold;

      if (!meetsThreshold) return false;

      // Institutional confidence filter
      if (filters.minConfidence) {
        const confidence = stockData.nissData?.confidence;
        if (filters.minConfidence === "HIGH" && confidence !== "HIGH")
          return false;
        if (filters.minConfidence === "MEDIUM" && confidence === "LOW")
          return false;
      }

      // Market cap filter
      if (filters.marketCap !== "all") {
        const mcap = stockData.marketCap;
        if (filters.marketCap === "mega" && mcap < 200e9) return false;
        if (filters.marketCap === "large" && (mcap < 10e9 || mcap > 200e9))
          return false;
        if (filters.marketCap === "mid" && (mcap < 2e9 || mcap > 10e9))
          return false;
        if (filters.marketCap === "small" && mcap > 2e9) return false;
      }

      // Volume and price filters
      if (stockData.quote?.volume < filters.minVolume) return false;
      if (stockData.quote?.price < filters.minPrice) return false;
      if (filters.maxPrice && stockData.quote?.price > filters.maxPrice)
        return false;

      return true;
    });
  };

  // Get available sectors from screening results
  const getAvailableSectors = () => {
    const sectors = new Set(screeningResults.map((stock) => stock.sector));
    return Array.from(sectors).sort();
  };

  // Format market cap
  const formatMarketCap = (mcap) => {
    if (!mcap) return "N/A";
    if (mcap >= 1e12) return `$${(mcap / 1e12).toFixed(1)}T`;
    if (mcap >= 1e9) return `$${(mcap / 1e9).toFixed(1)}B`;
    if (mcap >= 1e6) return `$${(mcap / 1e6).toFixed(1)}M`;
    return `$${(mcap / 1e3).toFixed(1)}K`;
  };

  // Format numbers
  const formatNumber = (num) => {
    if (!num) return "N/A";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
    return num.toFixed(2);
  };

  // Sort and filter results
  const sortedResults = [...screeningResults].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case "nissScore":
        aVal = Math.abs(a.nissScore);
        bVal = Math.abs(b.nissScore);
        break;
      case "confidence":
        const confMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        aVal = confMap[a.nissData?.confidence || "LOW"];
        bVal = confMap[b.nissData?.confidence || "LOW"];
        break;
      case "volume":
        aVal = a.quote?.volume || 0;
        bVal = b.quote?.volume || 0;
        break;
      case "changePercent":
        aVal = Math.abs(a.quote?.changePercent || 0);
        bVal = Math.abs(b.quote?.changePercent || 0);
        break;
      case "riskReward":
        aVal = a.tradeSetup?.riskReward || 0;
        bVal = b.tradeSetup?.riskReward || 0;
        break;
      default:
        aVal = Math.abs(a.nissScore);
        bVal = Math.abs(b.nissScore);
    }
    return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
  });

  // Apply filters and search
  const filteredResults = applyInstitutionalFilters(sortedResults);
  const searchFiltered = filteredResults.filter(
    (stock) =>
      searchQuery === "" ||
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.sector?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get market regime badges
  const getRegimeBadges = () => {
    const { volatility, trend, breadth } = marketRegime;
    const badges = [];

    if (volatility === "high")
      badges.push({ text: "High Vol", color: "bg-red-100 text-red-800" });
    else if (volatility === "low")
      badges.push({ text: "Low Vol", color: "bg-green-100 text-green-800" });

    if (trend === "bullish")
      badges.push({ text: "Bullish", color: "bg-green-100 text-green-800" });
    else if (trend === "bearish")
      badges.push({ text: "Bearish", color: "bg-red-100 text-red-800" });

    if (breadth === "advancing")
      badges.push({ text: "Broad Rally", color: "bg-blue-100 text-blue-800" });
    else if (breadth === "declining")
      badges.push({
        text: "Broad Decline",
        color: "bg-orange-100 text-orange-800",
      });

    return badges;
  };

  // Trading schedule for London-based users
  const tradingSchedule = {
    preMarket: { start: "09:00", end: "14:30", label: "US Pre-Market" },
    mainSession: { start: "14:30", end: "21:00", label: "US Main Session" },
    afterHours: { start: "21:00", end: "01:00", label: "US After Hours" },
    optimal: {
      start: "14:30",
      end: "17:00",
      label: "Optimal Institutional Trading",
    },
  };
  // Enhanced Signal Badge Component
  const SignalBadge = ({ signal, confidence, riskReward, nissScore }) => {
    // Determine signal strength based on institutional criteria
    const getSignalStrength = () => {
      if (confidence === "HIGH" && Math.abs(nissScore) > 75) return "STRONG";
      if (confidence === "MEDIUM" && Math.abs(nissScore) > 60)
        return "MODERATE";
      return "WEAK";
    };

    const strength = getSignalStrength();
    const signalText =
      signal === "LONG" ? "BUY" : signal === "SHORT" ? "SELL" : signal;

    // Color scheme based on strength and direction
    const getColors = () => {
      if (signal === "LONG" || signal === "BUY") {
        return strength === "STRONG"
          ? { bg: "bg-green-600", pulse: "bg-green-400", text: "text-white" }
          : { bg: "bg-green-500", pulse: "bg-green-300", text: "text-white" };
      } else if (signal === "SHORT" || signal === "SELL") {
        return strength === "STRONG"
          ? { bg: "bg-red-600", pulse: "bg-red-400", text: "text-white" }
          : { bg: "bg-red-500", pulse: "bg-red-300", text: "text-white" };
      }
      return { bg: "bg-gray-500", pulse: "bg-gray-300", text: "text-white" };
    };

    const colors = getColors();

    return (
      <div className="relative flex items-center gap-2">
        <span
          className={`${colors.bg} ${colors.text} px-3 py-1 rounded-full text-xs font-bold relative`}
        >
          {signalText}
          {strength === "STRONG" && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.pulse} opacity-75`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${colors.bg}`}
              ></span>
            </span>
          )}
        </span>

        <div className="flex flex-col items-start">
          <span className="text-xs font-semibold text-gray-700">
            {confidence}
          </span>
          {riskReward && riskReward > 2 && (
            <span className="text-xs text-blue-600 font-semibold">
              R:R {riskReward.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Export to CSV function
  const exportToCSV = () => {
    const headers = [
      "Symbol",
      "Company",
      "Sector",
      "NISS Score",
      "Confidence",
      "Signal",
      "Price",
      "Change %",
      "Entry",
      "Stop Loss",
      "R:R",
      "Volume",
      "Market Cap",
    ];

    const rows = searchFiltered.map((stock) => [
      stock.symbol,
      stock.company || "",
      stock.sector,
      stock.nissScore.toFixed(0),
      stock.nissData?.confidence || "",
      stock.tradeSetup?.action || "HOLD",
      stock.quote?.price?.toFixed(2) || "",
      stock.quote?.changePercent?.toFixed(2) || "",
      stock.tradeSetup?.entry?.toFixed(2) || "",
      stock.tradeSetup?.stopLoss?.toFixed(2) || "",
      stock.tradeSetup?.riskReward?.toFixed(1) || "",
      stock.quote?.volume || "",
      formatMarketCap(stock.marketCap),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `institutional_screener_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Detailed Analysis Modal
  const renderDetailedAnalysis = () => {
    if (!selectedStock) return null;

    const { tradeSetup, nissData, news, technicals } = selectedStock;
    const components = nissData?.components || {};

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedStock.symbol}
                </h2>
                <p className="text-gray-600">
                  {selectedStock.company || selectedStock.symbol}
                </p>
              </div>
              <SignalBadge
                signal={tradeSetup?.action || "HOLD"}
                confidence={nissData?.confidence}
                riskReward={tradeSetup?.riskReward}
                nissScore={selectedStock.nissScore}
              />
            </div>
            <button
              onClick={() => setSelectedStock(null)}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Institutional Trade Setup */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-900">
                <Target className="h-5 w-5 mr-2" />
                Institutional Trade Setup
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600">Action</p>
                  <p
                    className={`text-xl font-bold ${
                      tradeSetup?.action === "LONG"
                        ? "text-green-600"
                        : tradeSetup?.action === "SHORT"
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    {tradeSetup?.action || "HOLD"}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600">Entry Price</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${tradeSetup?.entry?.toFixed(2) || "N/A"}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600">Stop Loss</p>
                  <p className="text-xl font-bold text-red-600">
                    ${tradeSetup?.stopLoss?.toFixed(2) || "N/A"}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600">Risk/Reward</p>
                  <p className="text-xl font-bold text-blue-600">
                    1:{tradeSetup?.riskReward?.toFixed(1) || "N/A"}
                  </p>
                </div>
              </div>

              {/* Position Sizing */}
              <div className="mt-4 bg-white p-3 rounded-lg shadow-sm">
                <p className="text-sm text-gray-600">
                  Recommended Position Size (Kelly Criterion)
                </p>
                <p className="text-lg font-bold text-purple-600">
                  {tradeSetup?.positionSize
                    ? (tradeSetup.positionSize * 100).toFixed(1) +
                      "% of portfolio"
                    : "N/A"}
                </p>
              </div>

              {/* Price Targets */}
              {tradeSetup?.targets && tradeSetup.targets.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Price Targets</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {tradeSetup.targets.map((target, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm"
                      >
                        <span className="text-sm font-medium">
                          Target {target.level}
                        </span>
                        <span className="font-bold text-green-600">
                          ${target.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trade Reasoning */}
              {tradeSetup?.reasoning && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>Institutional Analysis:</strong>{" "}
                    {tradeSetup.reasoning}
                  </p>
                </div>
              )}
            </div>

            {/* Enhanced NISS Score Breakdown */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart2 className="h-5 w-5 mr-2 text-blue-600" />
                Institutional NISS Score Breakdown
              </h3>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-semibold">Overall Score</span>
                    <span
                      className={`text-2xl font-bold ${
                        selectedStock.nissScore > 75
                          ? "text-green-600"
                          : selectedStock.nissScore > 50
                          ? "text-blue-600"
                          : selectedStock.nissScore > 0
                          ? "text-gray-600"
                          : selectedStock.nissScore > -50
                          ? "text-orange-600"
                          : "text-red-600"
                      }`}
                    >
                      {selectedStock.nissScore.toFixed(0)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        selectedStock.nissScore > 0
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          Math.abs(selectedStock.nissScore),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Component Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(components).map(([key, value]) => (
                    <div
                      key={key}
                      className="bg-white p-3 rounded-lg shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <span className="text-sm font-bold">
                          {value?.toFixed(0) || 0}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
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
                            width: `${Math.min(Math.abs(value), 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* News Analysis */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Info className="h-5 w-5 mr-2 text-blue-600" />
                News Catalyst Analysis
              </h3>
              <div className="space-y-3">
                {(news || []).slice(0, 5).map((article, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-semibold flex-1 pr-2">
                        {article.headline}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            article.sentiment > 0.5
                              ? "bg-green-100 text-green-800"
                              : article.sentiment < -0.5
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {article.sentiment?.toFixed(2) || 0}
                        </span>
                        <ExternalLink className="h-4 w-4 text-gray-400 cursor-pointer" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {article.source} •{" "}
                      {new Date(article.datetime * 1000).toLocaleString()}
                    </p>
                    {article.catalysts?.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {article.catalysts.map((catalyst, i) => (
                          <span
                            key={i}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                          >
                            {catalyst}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold mb-3">Market Data</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Price</span>
                    <span className="font-bold">
                      ${selectedStock.quote?.price?.toFixed(2) || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Change</span>
                    <span
                      className={`font-bold ${
                        selectedStock.quote?.changePercent > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {selectedStock.quote?.changePercent?.toFixed(2) || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Volume</span>
                    <span className="font-bold">
                      {formatNumber(selectedStock.quote?.volume)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Volume</span>
                    <span className="font-bold">
                      {formatNumber(selectedStock.quote?.avgVolume)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Market Cap</span>
                    <span className="font-bold">
                      {formatMarketCap(selectedStock.marketCap)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold mb-3">
                  Technical Indicators
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">RSI</span>
                    <span className="font-bold">
                      {technicals?.rsi?.toFixed(0) || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ATR</span>
                    <span className="font-bold">
                      ${technicals?.atr?.toFixed(2) || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ADX</span>
                    <span className="font-bold">
                      {technicals?.adx?.toFixed(0) || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">MACD</span>
                    <span
                      className={`font-bold ${
                        technicals?.macd > technicals?.macdSignal
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {technicals?.macd > technicals?.macdSignal
                        ? "Bullish"
                        : "Bearish"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header with Institutional Branding */}

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

              {/* Backend Health Status */}
              {!backendHealth && (
                <span className="ml-4 text-sm font-medium px-3 py-1 rounded-full bg-orange-100 text-orange-800">
                  ⚠️ Backend Offline - Using Cached Data
                </span>
              )}

              {backendHealth && (
                <span className="ml-4 text-sm font-medium px-3 py-1 rounded-full bg-green-100 text-green-800">
                  ✅ Backend Online
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {/* Market regime badges */}
              <div className="flex gap-2">
                {getRegimeBadges().map((badge, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-1 text-xs rounded-full ${badge.color}`}
                  >
                    {badge.text}
                  </span>
                ))}
              </div>

              <div className="text-sm text-gray-600">
                <Clock className="inline h-4 w-4 mr-1" />
                London: {londonTime}
              </div>

              <button
                onClick={loadAllData}
                className={`p-2 rounded-lg hover:bg-gray-100 ${
                  isScreening ? "animate-spin" : ""
                }`}
                disabled={isScreening}
                title="Refresh institutional data"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      {/* Enhanced Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {["dashboard", "catalysts", "alerts", "performance"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>
      {/* Enhanced Filters */}
      <div className="bg-white px-4 py-3 border-b">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">
                Institutional Filters:
              </span>
            </div>

            <select
              className="text-sm border rounded px-3 py-1"
              value={filters.nissThreshold}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  nissThreshold: parseInt(e.target.value),
                })
              }
            >
              <option value="60">NISS ≥60 or ≤-60 (Standard)</option>
              <option value="75">NISS ≥75 or ≤-75 (Institutional)</option>
              <option value="85">NISS ≥85 or ≤-85 (High Grade)</option>
            </select>

            <select
              className="text-sm border rounded px-3 py-1"
              value={filters.minConfidence || ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  minConfidence: e.target.value || null,
                })
              }
            >
              <option value="">Any Confidence</option>
              <option value="HIGH">High Confidence Only</option>
              <option value="MEDIUM">Medium+ Confidence</option>
            </select>

            <select
              className="text-sm border rounded px-3 py-1"
              value={filters.marketCap}
              onChange={(e) =>
                setFilters({ ...filters, marketCap: e.target.value })
              }
            >
              <option value="all">All Market Caps</option>
              <option value="mega">Mega Cap ($200B+)</option>
              <option value="large">Large Cap ($10-200B)</option>
              <option value="mid">Mid Cap ($2-10B)</option>
              <option value="small">Small Cap (&lt;$2B)</option>
            </select>

            <select
              className="text-sm border rounded px-3 py-1"
              value={filters.sector}
              onChange={(e) =>
                setFilters({ ...filters, sector: e.target.value })
              }
            >
              <option value="all">All Sectors</option>
              {getAvailableSectors().map((sector) => (
                <option key={sector} value={sector} className="capitalize">
                  {sector.charAt(0).toUpperCase() + sector.slice(1)}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                className="text-sm border rounded px-3 py-1"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="nissScore">NISS Score</option>
                <option value="confidence">Confidence</option>
                <option value="riskReward">Risk/Reward</option>
                <option value="volume">Volume</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      {/* Search Bar */}
      <div className="bg-white px-4 py-4 border-b">
        <div className="max-w-7xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search symbols, companies, or sectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Enhanced Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Opportunities</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {searchFiltered.length}
                    </p>
                    <p className="text-xs text-gray-500">Institutional grade</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Strong Buys</p>
                    <p className="text-2xl font-bold text-green-600">
                      {
                        searchFiltered.filter(
                          (s) =>
                            s.tradeSetup?.action === "LONG" &&
                            s.nissData?.confidence === "HIGH"
                        ).length
                      }
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Strong Sells</p>
                    <p className="text-2xl font-bold text-red-600">
                      {
                        searchFiltered.filter(
                          (s) =>
                            s.tradeSetup?.action === "SHORT" &&
                            s.nissData?.confidence === "HIGH"
                        ).length
                      }
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">High Confidence</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {
                        searchFiltered.filter(
                          (s) => s.nissData?.confidence === "HIGH"
                        ).length
                      }
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-purple-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg NISS</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {searchFiltered.length > 0
                        ? (
                            searchFiltered.reduce(
                              (sum, s) => sum + Math.abs(s.nissScore),
                              0
                            ) / searchFiltered.length
                          ).toFixed(0)
                        : 0}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Trading Schedule */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Institutional Trading Schedule (London Time)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(tradingSchedule).map(([key, schedule]) => (
                  <div
                    key={key}
                    className={`p-4 rounded-lg ${
                      key === "optimal"
                        ? "bg-blue-50 border-2 border-blue-200"
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

            {/* Enhanced Opportunities Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Institutional Trading Opportunities
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {loading
                    ? "Analyzing institutional signals..."
                    : `${
                        searchFiltered.length
                      } high-grade opportunities across ${
                        new Set(searchFiltered.map((s) => s.sector)).size
                      } sectors`}
                </p>
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
                        Entry/Stop
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        R:R
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Volume
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading || isScreening ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center">
                          <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">
                              Running institutional analysis...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : searchFiltered.length === 0 ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="px-6 py-12 text-center text-gray-500"
                        >
                          No institutional opportunities found. Try adjusting
                          filters.
                        </td>
                      </tr>
                    ) : (
                      searchFiltered.slice(0, 20).map((stock) => (
                        <tr
                          key={stock.symbol}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setSelectedStock(stock)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="font-medium text-gray-900">
                                {stock.symbol}
                              </div>
                              <div className="ml-2 text-xs text-gray-500">
                                {stock.sector}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {stock.company || stock.symbol}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatMarketCap(stock.marketCap)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span
                                className={`text-sm font-bold ${
                                  stock.nissScore > 75
                                    ? "text-green-600"
                                    : stock.nissScore > 50
                                    ? "text-blue-600"
                                    : stock.nissScore < -50
                                    ? "text-red-600"
                                    : "text-gray-600"
                                }`}
                              >
                                {stock.nissScore.toFixed(0)}
                              </span>
                              <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    stock.nissScore > 0
                                      ? "bg-green-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      Math.abs(stock.nissScore),
                                      100
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <SignalBadge
                              signal={stock.tradeSetup?.action || "HOLD"}
                              confidence={stock.nissData?.confidence}
                              riskReward={stock.tradeSetup?.riskReward}
                              nissScore={stock.nissScore}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="text-gray-900">
                              ${stock.tradeSetup?.entry?.toFixed(2) || "N/A"}
                            </div>
                            <div className="text-red-600">
                              ${stock.tradeSetup?.stopLoss?.toFixed(2) || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-blue-600">
                              1:
                              {stock.tradeSetup?.riskReward?.toFixed(1) ||
                                "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>{formatNumber(stock.quote?.volume)}</div>
                            <div className="text-xs">
                              {stock.quote?.volume && stock.quote?.avgVolume
                                ? `${(
                                    stock.quote.volume / stock.quote.avgVolume
                                  ).toFixed(1)}x avg`
                                : "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStock(stock);
                              }}
                              className="text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              Details <ChevronRight className="h-4 w-4 ml-1" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Export Options */}
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-4">
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs content would go here */}
        <CatalystAnalysisTab
          screeningResults={screeningResults} // ✅ ONLY InstitutionalDataService data
          filters={filters}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />

        {activeTab === "alerts" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Institutional Alerts</h2>
            <div className="space-y-4">
              {alerts.slice(0, 10).map((alert) => (
                <div
                  key={alert.id}
                  className="border-l-4 border-blue-500 pl-4 py-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {alert.ticker} - {alert.type}
                      </p>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {alert.time.toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        alert.severity === "high"
                          ? "bg-red-100 text-red-800"
                          : alert.severity === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "performance" && (
          <PerformanceTrackingTab
            historicalPerformance={historicalPerformance}
            stockData={stockData}
            loading={loading}
          />
        )}
      </main>
      {/* Detailed Analysis Modal */}
      {renderDetailedAnalysis()}
      {/* ADD THIS: Debug Component */}
      <CatalystMetricsDebugger screeningResults={screeningResults} />
    </div>
  );
};

export default NewsImpactScreener;
