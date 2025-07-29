// src/components/NewsImpactScreener.js - FIXED VERSION
// Part 1: Imports and State Management

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Bell,
  Activity,
  AlertCircle,
  Info,
  ExternalLink,
  Shield,
  Target,
  BarChart3,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  Search,
  Filter,
  Download,
  Eye,
  DollarSign,
} from "lucide-react";

// Import your existing components
import StockScreener from "./StockScreener";
import CatalystAnalysisTab from "./CatalystAnalysisTab";
import PerformanceTrackingTab from "./PerformanceTrackingTab";

// Import enhanced data service
import InstitutionalDataService from "../api/InstitutionalDataService";

// JM Trading Services Logo Component (using your brand guidelines)n
const JMTradingLogo = ({ className = "" }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <svg
        width="150"
        height="60"
        viewBox="0 0 150 60"
        xmlns="http://www.w3.org/2000/svg"
        className="mr-3"
      >
        <defs>
          <linearGradient
            id="jm-logo-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop
              offset="0%"
              style={{ stopColor: "#1e40af", stopOpacity: 1 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "#3b82f6", stopOpacity: 1 }}
            />
          </linearGradient>
        </defs>
        {/* JM - Main logo text with gradient */}
        <text
          x="75"
          y="35"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="34"
          fontWeight="700"
          fill="url(#jm-logo-gradient)"
          textAnchor="middle"
          letterSpacing="1.5"
        >
          JM
        </text>
        {/* TRADING - Below JM */}
        <text
          x="75"
          y="48"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="9"
          fontWeight="300"
          fill="#475569"
          textAnchor="middle"
          letterSpacing="2"
        >
          TRADING
        </text>
        {/* SERVICES - Below TRADING */}
        <text
          x="75"
          y="57"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="9"
          fontWeight="300"
          fill="#475569"
          textAnchor="middle"
          letterSpacing="2"
        >
          SERVICES
        </text>
      </svg>
    </div>
  );
};

const NewsImpactScreener = () => {
  // CORE APPLICATION STATE
  const [activeTab, setActiveTab] = useState("screener");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Market status and timing
  const [marketStatus, setMarketStatus] = useState({
    isOpen: false,
    nextSession: "",
    timeToOpen: "",
    timeToClose: "",
    sessionType: "regular",
  });

  // Data state
  const [stockData, setStockData] = useState({});
  const [news, setNews] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [historicalPerformance, setHistoricalPerformance] = useState([]);

  // Enhanced screening and filtering
  const [screeningResults, setScreeningResults] = useState([]);
  const [isScreening, setIsScreening] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("nissScore");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage] = useState(25);

  // Enhanced filters
  const [filters, setFilters] = useState({
    marketCap: "all",
    sector: "all",
    nissThreshold: 60,
    minConfidence: "MEDIUM",
    minVolume: 500000,
    minPrice: 1,
    maxPrice: null,
    signalType: "all",
    showOnlyWithNews: false,
    timeframe: "1d",
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    browser: false,
    nissThreshold: 75,
    minConfidence: "HIGH",
    alertTypes: ["earnings", "signals", "news"],
    soundEnabled: false,
  });

  // Backend monitoring - UNIFIED STATUS
  const [backendHealth, setBackendHealth] = useState(true);
  const [serviceStatus, setServiceStatus] = useState({
    totalSymbols: 0,
    sectors: 0,
    cacheSize: 0,
    rateLimitRemaining: 0,
    lastHealthCheck: null,
  });
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(300000);

  // Market regime
  const [marketRegime, setMarketRegime] = useState({
    volatility: "normal",
    trend: "neutral",
    breadth: "mixed",
    sentiment: "neutral",
    strength: 50,
  });

  // Performance tracking
  const [performanceMetrics, setPerformanceMetrics] = useState({
    totalSignals: 0,
    successRate: 0,
    avgReturn: 0,
    avgHoldingPeriod: 0,
    winRate: 0,
    totalTrades: 0,
  });

  // Advanced state management
  const [debugMode, setDebugMode] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [exportInProgress, setExportInProgress] = useState(false);
  const [bulkOperationProgress, setBulkOperationProgress] = useState(0);

  // Refs for performance optimization and cleanup
  const refreshIntervalRef = useRef(null);
  const healthCheckIntervalRef = useRef(null);
  const abortControllerRef = useRef(null);
  const performanceTimerRef = useRef(null);
  const notificationTimeoutRef = useRef(null);

  // INITIALIZATION & LIFECYCLE MANAGEMENT

  // Main initialization effect
  useEffect(() => {
    console.log("🚀 Initializing News Impact Screener v2.1...");
    initializeApplication();

    return () => {
      cleanup();
    };
  }, []);

  // Time and market status tracking
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      updateMarketStatus(now);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-refresh management
  useEffect(() => {
    if (autoRefreshEnabled && !loading && !isScreening) {
      setupPeriodicRefresh();
    } else {
      clearPeriodicRefresh();
    }

    return () => clearPeriodicRefresh();
  }, [autoRefreshEnabled, refreshInterval, loading, isScreening]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        console.log("🔔 Notification permission:", permission);
      });
    }
  }, []);

  // Enhanced initialization function
  const initializeApplication = async () => {
    console.log("📊 Starting application initialization...");

    try {
      setLoading(true);
      setError(null);
      setConnectionStatus("connecting");

      await updateServiceStatus();
      await loadUserConfiguration();
      await loadSavedData();
      await performInitialDataLoad();

      setupHealthMonitoring();
      initializePerformanceTracking();

      setLastRefresh(new Date());
      setConnectionStatus("connected");
      console.log("✅ Application initialized successfully");
    } catch (error) {
      console.error("❌ Application initialization failed:", error);
      setError(
        "Failed to initialize application. Some features may be limited."
      );
      setConnectionStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const performInitialDataLoad = async () => {
    try {
      console.log("📊 Loading initial institutional data...");

      const universeStats = InstitutionalDataService.getUniverseStats();
      console.log(
        `📈 Universe loaded: ${universeStats.totalSymbols} symbols across ${universeStats.sectors} sectors`
      );

      setServiceStatus((prev) => ({
        ...prev,
        totalSymbols: universeStats.totalSymbols,
        sectors: universeStats.sectors,
      }));

      await performInstitutionalScreening(50);
      await updateMarketRegimeAnalysis();
      initializeAlertsSystem();

      console.log("✅ Initial data load completed");
    } catch (error) {
      console.error("❌ Initial data load failed:", error);
      throw error;
    }
  };

  const loadUserConfiguration = async () => {
    try {
      const savedFilters = localStorage.getItem("institutionalFilters");
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters);
        setFilters((prev) => ({ ...prev, ...parsedFilters }));
      }

      const savedNotifications = localStorage.getItem("notificationSettings");
      if (savedNotifications) {
        const parsedNotifications = JSON.parse(savedNotifications);
        setNotificationSettings((prev) => ({
          ...prev,
          ...parsedNotifications,
        }));
      }

      const savedRefreshInterval = localStorage.getItem("refreshInterval");
      if (savedRefreshInterval) {
        setRefreshInterval(parseInt(savedRefreshInterval));
      }

      console.log("⚙️ User configuration loaded");
    } catch (error) {
      console.warn("⚠️ Failed to load user configuration:", error);
    }
  };

  const loadSavedData = async () => {
    try {
      const savedWatchlist = localStorage.getItem("institutionalWatchlist");
      if (savedWatchlist) {
        const watchlistSymbols = JSON.parse(savedWatchlist);
        setWatchlist(watchlistSymbols);
        console.log(`📋 Watchlist loaded: ${watchlistSymbols.length} symbols`);
      }

      const savedPerformance = localStorage.getItem("historicalPerformance");
      if (savedPerformance) {
        const performanceData = JSON.parse(savedPerformance);
        setHistoricalPerformance(performanceData.slice(0, 200));
        console.log(
          `📈 Performance history loaded: ${performanceData.length} entries`
        );
      }

      const savedAlerts = localStorage.getItem("recentAlerts");
      if (savedAlerts) {
        const alertsData = JSON.parse(savedAlerts);
        const recentAlerts = alertsData.filter(
          (alert) =>
            Date.now() - new Date(alert.time).getTime() <
            7 * 24 * 60 * 60 * 1000
        );
        setAlerts(recentAlerts);
        console.log(`🚨 Recent alerts loaded: ${recentAlerts.length} alerts`);
      }
    } catch (error) {
      console.warn("⚠️ Failed to load saved data:", error);
    }
  };

  const setupHealthMonitoring = () => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }

    healthCheckIntervalRef.current = setInterval(async () => {
      await updateServiceStatus();
    }, 2 * 60 * 1000);

    console.log("🏥 Health monitoring configured");
  };

  const setupPeriodicRefresh = () => {
    clearPeriodicRefresh();

    if (autoRefreshEnabled && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(async () => {
        if (!loading && !isScreening && !refreshing) {
          console.log("⏰ Periodic refresh triggered");
          await performQuietRefresh();
        }
      }, refreshInterval);

      console.log(
        `⏰ Auto-refresh configured (${refreshInterval / 1000 / 60} minutes)`
      );
    }
  };

  const clearPeriodicRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  const initializePerformanceTracking = () => {
    if (performanceTimerRef.current) {
      clearInterval(performanceTimerRef.current);
    }

    performanceTimerRef.current = setInterval(() => {
      updatePerformanceMetrics();
    }, 10 * 60 * 1000);

    console.log("📊 Performance tracking initialized");
  };

  const initializeAlertsSystem = () => {
    if (notificationSettings.browser && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    console.log("🚨 Alerts system initialized");
  };

  const cleanup = () => {
    console.log("🧹 Cleaning up NewsImpactScreener...");

    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    if (healthCheckIntervalRef.current)
      clearInterval(healthCheckIntervalRef.current);
    if (performanceTimerRef.current) clearInterval(performanceTimerRef.current);
    if (notificationTimeoutRef.current)
      clearTimeout(notificationTimeoutRef.current);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    saveUserConfiguration();
    console.log("✅ Cleanup completed");
  };

  const saveUserConfiguration = () => {
    try {
      localStorage.setItem("institutionalFilters", JSON.stringify(filters));
      localStorage.setItem(
        "notificationSettings",
        JSON.stringify(notificationSettings)
      );
      localStorage.setItem("refreshInterval", refreshInterval.toString());
      localStorage.setItem("institutionalWatchlist", JSON.stringify(watchlist));
      localStorage.setItem(
        "historicalPerformance",
        JSON.stringify(historicalPerformance.slice(0, 200))
      );
      localStorage.setItem("recentAlerts", JSON.stringify(alerts.slice(0, 50)));

      console.log("💾 User configuration saved");
    } catch (error) {
      console.warn("⚠️ Failed to save configuration:", error);
    }
  };

  // CORE BUSINESS LOGIC & INSTITUTIONAL SCREENING

  const performInstitutionalScreening = async (maxSymbols = 100) => {
    if (isScreening) {
      console.log("⏸️ Screening already in progress, skipping...");
      return;
    }

    console.log(
      `🔍 Starting institutional screening (max ${maxSymbols} symbols)...`
    );
    setIsScreening(true);
    setError(null);
    setBulkOperationProgress(0);

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const startTime = performance.now();
      const results = await InstitutionalDataService.performFullScreening(
        null,
        maxSymbols
      );
      const screeningDuration = performance.now() - startTime;

      console.log(
        `⏱️ Screening completed in ${(screeningDuration / 1000).toFixed(2)}s`
      );

      const processedResults = await processScreeningResultsWithAnalysis(
        results
      );

      setScreeningResults(processedResults);
      updateAlertsFromResults(processedResults);
      updatePerformanceTrackingFromResults(processedResults);
      updateMarketRegimeFromResults(processedResults);

      const stockDataMap = {};
      processedResults.forEach((stock) => {
        stockDataMap[stock.symbol] = stock;
      });
      setStockData(stockDataMap);

      console.log(
        `✅ Screening completed: ${processedResults.length} stocks processed`
      );
      setBulkOperationProgress(100);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("❌ Institutional screening failed:", error);
        setError("Screening failed. Showing cached results if available.");
      }
    } finally {
      setIsScreening(false);
      setTimeout(() => setBulkOperationProgress(0), 2000);
    }
  };

  const processScreeningResultsWithAnalysis = async (results) => {
    const processedResults = [];
    const totalResults = results.length;

    console.log(
      `🔬 Processing ${totalResults} screening results with NISS analysis...`
    );

    for (let i = 0; i < results.length; i++) {
      const stock = results[i];

      try {
        setBulkOperationProgress(Math.round((i / totalResults) * 90));

        const [newsData, technicalData] = await Promise.allSettled([
          InstitutionalDataService.getNews(stock.symbol),
          InstitutionalDataService.getTechnicals(stock.symbol),
        ]);

        const validNewsData =
          newsData.status === "fulfilled" ? newsData.value : [];
        const validTechnicalData =
          technicalData.status === "fulfilled" ? technicalData.value : {};

        const nissAnalysis = calculateEnhancedNISSScore(
          stock,
          validNewsData,
          validTechnicalData
        );
        const tradeSetup = generateAdvancedTradingSignal(
          stock,
          nissAnalysis,
          validTechnicalData
        );

        const enhancedStock = {
          ...stock,
          company: stock.company || stock.symbol,
          quote: {
            price: stock.price,
            changePercent: stock.changePercent || 0,
            volume: stock.volume || 0,
            high: stock.high || stock.price,
            low: stock.low || stock.price,
            open: stock.open || stock.price,
            previousClose: stock.previousClose || stock.price,
            avgVolume: stock.avgVolume || stock.volume,
            high52Week: stock.high52Week,
            low52Week: stock.low52Week,
          },
          news: validNewsData,
          technicals: validTechnicalData,
          nissScore: nissAnalysis.score,
          nissData: nissAnalysis.data,
          tradeSetup: tradeSetup,
          lastUpdate: new Date(),
          analysisVersion: "2.1.0",
          dataQuality: calculateDataQuality(validNewsData, validTechnicalData),
        };

        processedResults.push(enhancedStock);
      } catch (error) {
        console.warn(
          `⚠️ Processing failed for ${stock.symbol}:`,
          error.message
        );

        processedResults.push({
          ...stock,
          company: stock.symbol,
          quote: {
            price: stock.price || 0,
            changePercent: stock.changePercent || 0,
            volume: stock.volume || 0,
          },
          news: [],
          technicals: {},
          nissScore: 0,
          nissData: {
            components: {},
            confidence: "LOW",
            error: "Analysis failed",
          },
          tradeSetup: {
            action: "HOLD",
            reasoning: "Insufficient data for analysis",
          },
          lastUpdate: new Date(),
          dataQuality: "poor",
        });
      }
    }

    console.log(
      `✅ Analysis completed: ${processedResults.length} stocks with NISS scores`
    );
    return processedResults;
  };

  // Enhanced NISS calculation (your existing algorithm)
  const calculateEnhancedNISSScore = (stock, newsData, technicalData) => {
    try {
      const priceMovement = Math.abs(stock.changePercent || 0);
      const volumeRatio =
        stock.volume && stock.avgVolume
          ? Math.min(stock.volume / stock.avgVolume, 5)
          : 1;

      const newsMetrics = analyzeNewsMetrics(newsData, stock.symbol);
      const technicalMetrics = analyzeTechnicalMetrics(technicalData, stock);
      const marketContext = analyzeMarketContext(stock.sector, marketRegime);
      const timeContext = analyzeTimeContext();

      const components = {
        sentiment: newsMetrics.avgSentiment * 25,
        momentum: (priceMovement / 10) * 20,
        volume: Math.max(-15, Math.min(15, (volumeRatio - 1) * 15)),
        technical: technicalMetrics.composite * 15,
        newsFlow: newsMetrics.newsFlow * 10,
        relevance: (newsMetrics.avgRelevance - 50) / 5,
        marketContext: marketContext * 3,
        timeContext: timeContext * 2,
      };

      const rawScore = Object.values(components).reduce(
        (sum, val) => sum + (val || 0),
        0
      );
      const sectorVolatility = getSectorVolatilityMultiplier(stock.sector);
      const adjustedScore = rawScore * sectorVolatility;
      const finalScore = Math.max(-100, Math.min(100, adjustedScore));

      const confidence = calculateAdvancedConfidence(
        components,
        newsMetrics,
        technicalMetrics,
        marketContext
      );
      const riskMetrics = calculateRiskMetrics(
        stock,
        newsMetrics,
        technicalMetrics
      );

      return {
        score: finalScore,
        data: {
          components,
          confidence,
          riskMetrics,
          newsCount: newsData.length,
          avgSentiment: newsMetrics.avgSentiment,
          avgRelevance: newsMetrics.avgRelevance,
          technicalStrength: technicalMetrics.composite,
          marketAlignment: marketContext,
          timeAlignment: timeContext,
          sectorAdjustment: sectorVolatility,
          rawScore: rawScore,
          lastUpdate: new Date().toISOString(),
          version: "2.1.0",
        },
      };
    } catch (error) {
      console.error("❌ NISS calculation error:", error);
      return {
        score: 0,
        data: {
          components: {},
          confidence: "LOW",
          error: error.message,
          lastUpdate: new Date().toISOString(),
        },
      };
    }
  };

  // Helper functions (maintaining your existing algorithms)
  const analyzeNewsMetrics = (newsData, symbol) => {
    if (!Array.isArray(newsData) || newsData.length === 0) {
      return {
        avgSentiment: 0,
        avgRelevance: 50,
        newsFlow: 0.1,
        totalNews: 0,
        highImpactNews: 0,
        recentNews: 0,
        velocity: 0,
        diversityScore: 0,
      };
    }

    const sentiments = newsData.map((item) => item.sentiment || 0);
    const relevanceScores = newsData.map((item) => item.relevanceScore || 50);

    const highImpactNews = newsData.filter(
      (item) =>
        (item.relevanceScore || 50) > 80 || Math.abs(item.sentiment || 0) > 0.7
    ).length;

    const now = Date.now() / 1000;
    const recentNews = newsData.filter((item) => {
      const newsAge = now - (item.datetime || 0);
      return newsAge < 86400;
    }).length;

    const uniqueSources = new Set(newsData.map((item) => item.source)).size;
    const diversityScore = Math.min(uniqueSources / 5, 1);

    const avgNewsAge =
      newsData.reduce((sum, item) => {
        const age = now - (item.datetime || now);
        return sum + age;
      }, 0) / newsData.length;

    const velocity = Math.max(0, 1 - avgNewsAge / 86400);

    return {
      avgSentiment:
        sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length,
      avgRelevance:
        relevanceScores.reduce((sum, r) => sum + r, 0) / relevanceScores.length,
      newsFlow: Math.min(newsData.length / 10, 1),
      totalNews: newsData.length,
      highImpactNews,
      recentNews,
      velocity,
      diversityScore,
    };
  };

  const analyzeTechnicalMetrics = (technicalData, stock) => {
    if (!technicalData || Object.keys(technicalData).length === 0) {
      return {
        composite: 0,
        trend: 0,
        momentum: 0,
        volume: 0,
        strength: 0,
        direction: "neutral",
      };
    }

    const price = stock.price || technicalData.price || 100;
    const sma20 = technicalData.sma20 || price;
    const sma50 = technicalData.sma50 || price;
    const sma200 = technicalData.sma200 || price;

    const shortTermTrend = ((price - sma20) / sma20) * 100;
    const mediumTermTrend = ((price - sma50) / sma50) * 100;
    const longTermTrend = ((price - sma200) / sma200) * 100;

    const trendScore =
      shortTermTrend * 0.5 + mediumTermTrend * 0.3 + longTermTrend * 0.2;

    const rsi = technicalData.rsi || 50;
    const rsiMomentum = rsi > 70 ? 0.7 : rsi < 30 ? -0.7 : (rsi - 50) / 50;

    const macd = technicalData.macd || 0;
    const macdSignal = technicalData.macdSignal || 0;
    const macdMomentum = macd > macdSignal ? 0.5 : -0.5;

    const stochastic = technicalData.stochastic || 50;
    const stochasticMomentum =
      stochastic > 80 ? 0.5 : stochastic < 20 ? -0.5 : 0;

    const momentumScore =
      rsiMomentum * 0.5 + macdMomentum * 0.3 + stochasticMomentum * 0.2;

    const volumeRatio =
      stock.volume && stock.avgVolume ? stock.volume / stock.avgVolume : 1;
    const volumeScore = Math.max(-1, Math.min(1, volumeRatio - 1));

    const composite =
      trendScore * 0.4 + momentumScore * 0.4 + volumeScore * 0.2;

    let direction = "neutral";
    if (composite > 0.2) direction = "bullish";
    else if (composite < -0.2) direction = "bearish";

    return {
      composite: Math.max(-1, Math.min(1, composite)),
      trend: Math.max(-1, Math.min(1, trendScore / 10)),
      momentum: momentumScore,
      volume: volumeScore,
      strength: Math.abs(composite),
      direction,
    };
  };

  const analyzeMarketContext = (sector, regime) => {
    let contextScore = 0;

    if (regime.trend === "bullish") contextScore += 0.3;
    else if (regime.trend === "bearish") contextScore -= 0.3;

    if (regime.volatility === "low") contextScore += 0.1;
    else if (regime.volatility === "high") contextScore -= 0.1;

    const sectorMultipliers = {
      Technology: 1.2,
      Healthcare: 1.1,
      Financial: 1.0,
      Consumer: 0.9,
      Energy: 1.3,
      Utilities: 0.8,
      Industrial: 1.0,
      Materials: 1.1,
      "Real Estate": 0.9,
      Communication: 1.1,
      "Consumer Staples": 0.8,
      "Consumer Discretionary": 1.0,
    };

    const sectorMultiplier = sectorMultipliers[sector] || 1.0;
    return contextScore * sectorMultiplier;
  };

  const analyzeTimeContext = () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    let timeScore = 0;

    if (day >= 1 && day <= 5) {
      if (hour >= 9 && hour < 16) {
        timeScore = 0.2;
      } else if (hour >= 4 && hour < 9) {
        timeScore = 0.1;
      } else {
        timeScore = -0.1;
      }
    } else {
      timeScore = -0.2;
    }

    return timeScore;
  };

  const getSectorVolatilityMultiplier = (sector) => {
    const volatilityMultipliers = {
      Technology: 1.3,
      Biotechnology: 1.5,
      Energy: 1.4,
      Financial: 1.2,
      "Consumer Discretionary": 1.1,
      Materials: 1.2,
      Industrial: 1.0,
      Healthcare: 1.1,
      Communication: 1.1,
      "Consumer Staples": 0.8,
      Utilities: 0.7,
      "Real Estate": 0.9,
    };

    return volatilityMultipliers[sector] || 1.0;
  };

  const calculateAdvancedConfidence = (
    components,
    newsMetrics,
    technicalMetrics,
    marketContext
  ) => {
    const factors = {
      newsQuality:
        newsMetrics.totalNews > 0 ? Math.min(newsMetrics.totalNews / 5, 1) : 0,
      newsRelevance: (newsMetrics.avgRelevance - 50) / 50,
      technicalStrength: technicalMetrics.strength,
      marketAlignment: Math.abs(marketContext),
      diversityScore: newsMetrics.diversityScore,
      volumeConfidence: Math.min(Math.abs(components.volume) / 10, 1),
    };

    const confidenceScore =
      factors.newsQuality * 0.25 +
      factors.newsRelevance * 0.2 +
      factors.technicalStrength * 0.2 +
      factors.marketAlignment * 0.15 +
      factors.diversityScore * 0.1 +
      factors.volumeConfidence * 0.1;

    if (confidenceScore > 0.7) return "HIGH";
    if (confidenceScore > 0.4) return "MEDIUM";
    return "LOW";
  };

  const calculateRiskMetrics = (stock, newsMetrics, technicalMetrics) => {
    const volatilityRisk = Math.abs(stock.changePercent || 0) / 5;
    const volumeRisk =
      stock.volume && stock.avgVolume
        ? Math.abs(1 - stock.volume / stock.avgVolume)
        : 0.5;
    const newsRisk =
      newsMetrics.totalNews === 0
        ? 0.8
        : Math.max(0, (newsMetrics.avgRelevance - 70) / 30);

    const compositeRisk =
      volatilityRisk * 0.4 + volumeRisk * 0.3 + newsRisk * 0.3;

    return {
      overall: Math.min(1, compositeRisk),
      volatility: volatilityRisk,
      volume: volumeRisk,
      news: newsRisk,
      level:
        compositeRisk > 0.7 ? "HIGH" : compositeRisk > 0.4 ? "MEDIUM" : "LOW",
    };
  };

  const calculateDataQuality = (newsData, technicalData) => {
    let qualityScore = 0;

    if (Array.isArray(newsData) && newsData.length > 0) {
      qualityScore += 0.4;
      if (newsData.length > 3) qualityScore += 0.1;
    }

    if (technicalData && Object.keys(technicalData).length > 0) {
      qualityScore += 0.4;
      if (technicalData.rsi && technicalData.macd) qualityScore += 0.1;
    }

    if (qualityScore > 0.8) return "excellent";
    if (qualityScore > 0.6) return "good";
    if (qualityScore > 0.3) return "fair";
    return "poor";
  };

  const generateAdvancedTradingSignal = (
    stock,
    nissAnalysis,
    technicalData
  ) => {
    try {
      const nissScore = nissAnalysis.score;
      const confidence = nissAnalysis.data.confidence;
      const price = stock.price || 0;

      let action = "HOLD";
      let reasoning = "";
      let entryPrice = price;
      let stopLoss = price;
      let targets = [];

      if (nissScore > 20 && confidence !== "LOW") {
        action = "BUY";
        reasoning = `Strong bullish signal with NISS ${nissScore.toFixed(1)}`;

        entryPrice = price * 1.005;
        stopLoss = price * 0.97;
        targets = [
          { level: 1, price: price * 1.03, probability: 0.7 },
          { level: 2, price: price * 1.06, probability: 0.5 },
          { level: 3, price: price * 1.1, probability: 0.3 },
        ];
      } else if (nissScore < -20 && confidence !== "LOW") {
        action = "SELL";
        reasoning = `Strong bearish signal with NISS ${nissScore.toFixed(1)}`;

        entryPrice = price * 0.995;
        stopLoss = price * 1.03;
        targets = [
          { level: 1, price: price * 0.97, probability: 0.7 },
          { level: 2, price: price * 0.94, probability: 0.5 },
          { level: 3, price: price * 0.9, probability: 0.3 },
        ];
      } else {
        reasoning = `Neutral signal - NISS ${nissScore.toFixed(
          1
        )}, insufficient conviction`;
      }

      const riskReward =
        action !== "HOLD"
          ? Math.abs((targets[0]?.price - entryPrice) / (entryPrice - stopLoss))
          : 0;

      return {
        action,
        reasoning,
        confidence,
        entryPrice: parseFloat(entryPrice.toFixed(2)),
        stopLoss: parseFloat(stopLoss.toFixed(2)),
        targets,
        riskReward: parseFloat(riskReward.toFixed(2)),
        timeframe: "1-3 days",
        positionSize: confidence === "HIGH" ? "Standard" : "Reduced",
        lastUpdate: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Trading signal generation error:", error);
      return {
        action: "HOLD",
        reasoning: "Signal generation failed",
        confidence: "LOW",
        error: error.message,
      };
    }
  };

  // SERVICE STATUS & DATA MANAGEMENT FUNCTIONS

  // Update service status and health monitoring
  const updateServiceStatus = async () => {
    try {
      const healthCheck = await InstitutionalDataService.checkHealth();

      if (healthCheck.success) {
        setBackendHealth(true);
        setConnectionStatus("connected");

        setServiceStatus((prev) => ({
          ...prev,
          cacheSize: healthCheck.cacheSize || prev.cacheSize,
          rateLimitRemaining:
            healthCheck.rateLimitRemaining || prev.rateLimitRemaining,
          lastHealthCheck: new Date(),
        }));
      } else {
        setBackendHealth(false);
        setConnectionStatus("error");
        console.warn("⚠️ Backend health check failed");
      }
    } catch (error) {
      setBackendHealth(false);
      setConnectionStatus("error");
      console.error("❌ Service status update failed:", error);
    }
  };

  // Update market status (maintains your existing market timing)
  const updateMarketStatus = (currentTime) => {
    const now = currentTime || new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const et = new Date(utc + -5 * 3600000); // Eastern Time

    const hour = et.getHours();
    const minute = et.getMinutes();
    const day = et.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekday = day >= 1 && day <= 5;

    let isOpen = false;
    let sessionType = "closed";
    let nextSession = "";
    let timeToOpen = "";
    let timeToClose = "";

    if (isWeekday) {
      const currentMinutes = hour * 60 + minute;
      const preMarketStart = 4 * 60; // 4:00 AM
      const marketOpen = 9 * 60 + 30; // 9:30 AM
      const marketClose = 16 * 60; // 4:00 PM
      const afterHoursEnd = 20 * 60; // 8:00 PM

      if (currentMinutes >= preMarketStart && currentMinutes < marketOpen) {
        sessionType = "pre-market";
        isOpen = true;
        nextSession = "Regular session";
        timeToOpen = calculateTimeToMarket(marketOpen - currentMinutes);
      } else if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
        sessionType = "regular";
        isOpen = true;
        nextSession = "After hours";
        timeToClose = calculateTimeToMarket(marketClose - currentMinutes);
      } else if (
        currentMinutes >= marketClose &&
        currentMinutes < afterHoursEnd
      ) {
        sessionType = "after-hours";
        isOpen = true;
        nextSession = "Next trading day";
      } else {
        sessionType = "closed";
        isOpen = false;
        nextSession = "Pre-market";

        let minutesToNext = preMarketStart - currentMinutes;
        if (minutesToNext <= 0) {
          minutesToNext += 24 * 60; // Next day
        }
        timeToOpen = calculateTimeToMarket(minutesToNext);
      }
    } else {
      sessionType = "closed";
      isOpen = false;
      nextSession = "Monday pre-market";

      const daysToMonday = day === 0 ? 1 : 8 - day; // Sunday = 1 day, Saturday = 2 days
      const minutesToMonday =
        daysToMonday * 24 * 60 + 4 * 60 - (hour * 60 + minute);
      timeToOpen = calculateTimeToMarket(minutesToMonday);
    }

    setMarketStatus({
      isOpen,
      sessionType,
      nextSession,
      timeToOpen,
      timeToClose,
    });
  };

  // Calculate time to market helper
  const calculateTimeToMarket = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  // Perform quiet refresh (background update without loading state)
  const performQuietRefresh = async () => {
    if (refreshing) return;

    try {
      setRefreshing(true);
      console.log("🔄 Performing quiet refresh...");

      // Update service status
      await updateServiceStatus();

      // Refresh screening results with current filters
      const currentResultsCount = screeningResults.length;
      await performInstitutionalScreening(Math.max(currentResultsCount, 50));

      setLastRefresh(new Date());
      console.log("✅ Quiet refresh completed");
    } catch (error) {
      console.warn("⚠️ Quiet refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Update market regime analysis
  const updateMarketRegimeAnalysis = async () => {
    try {
      // Analyze overall market conditions
      const regimeAnalysis = await InstitutionalDataService.getMarketRegime();

      if (regimeAnalysis && regimeAnalysis.success) {
        setMarketRegime(regimeAnalysis.data);
        console.log("📊 Market regime updated:", regimeAnalysis.data);
      }
    } catch (error) {
      console.warn("⚠️ Market regime analysis failed:", error);
    }
  };

  // Update alerts from screening results
  const updateAlertsFromResults = (results) => {
    const newAlerts = [];
    const now = new Date();

    results.forEach((stock) => {
      // High NISS score alerts
      if (Math.abs(stock.nissScore) > notificationSettings.nissThreshold) {
        if (
          stock.nissData.confidence === notificationSettings.minConfidence ||
          (notificationSettings.minConfidence === "MEDIUM" &&
            stock.nissData.confidence === "HIGH")
        ) {
          newAlerts.push({
            id: `niss-${stock.symbol}-${now.getTime()}`,
            type: "niss",
            symbol: stock.symbol,
            title: `High NISS Score Alert`,
            message: `${stock.symbol}: NISS ${stock.nissScore.toFixed(1)} (${
              stock.nissData.confidence
            })`,
            score: stock.nissScore,
            confidence: stock.nissData.confidence,
            time: now,
            priority: stock.nissData.confidence === "HIGH" ? "high" : "medium",
          });
        }
      }

      // Trading signal alerts
      if (stock.tradeSetup && stock.tradeSetup.action !== "HOLD") {
        newAlerts.push({
          id: `signal-${stock.symbol}-${now.getTime()}`,
          type: "signal",
          symbol: stock.symbol,
          title: `Trading Signal`,
          message: `${stock.symbol}: ${stock.tradeSetup.action} signal (${stock.tradeSetup.confidence})`,
          action: stock.tradeSetup.action,
          confidence: stock.tradeSetup.confidence,
          time: now,
          priority: stock.tradeSetup.confidence === "HIGH" ? "high" : "medium",
        });
      }
    });

    // Add new alerts and maintain recent alerts limit
    if (newAlerts.length > 0) {
      setAlerts((prev) => [...newAlerts, ...prev].slice(0, 100));

      // Trigger browser notifications if enabled
      triggerBrowserNotifications(newAlerts);

      console.log(`🚨 Generated ${newAlerts.length} new alerts`);
    }
  };

  // Update performance tracking
  const updatePerformanceTrackingFromResults = (results) => {
    // Calculate performance metrics from results
    const totalSignals = results.filter(
      (s) => s.tradeSetup?.action !== "HOLD"
    ).length;
    const highConfidenceSignals = results.filter(
      (s) =>
        s.tradeSetup?.action !== "HOLD" && s.tradeSetup?.confidence === "HIGH"
    ).length;

    // Update performance metrics
    setPerformanceMetrics((prev) => ({
      ...prev,
      totalSignals,
      highConfidenceSignals,
      lastUpdate: new Date(),
    }));
  };

  // Update market regime from results
  const updateMarketRegimeFromResults = (results) => {
    if (results.length === 0) return;

    // Calculate market breadth
    const positiveNISS = results.filter((s) => (s.nissScore || 0) > 0).length;
    const negativeNISS = results.filter((s) => (s.nissScore || 0) < 0).length;
    const neutralNISS = results.length - positiveNISS - negativeNISS;

    const positiveRatio = positiveNISS / results.length;
    const negativeRatio = negativeNISS / results.length;

    // Determine breadth
    let breadth = "mixed";
    if (positiveRatio > 0.6) breadth = "advancing";
    else if (negativeRatio > 0.6) breadth = "declining";

    // Calculate average NISS score for sentiment
    const avgNISS =
      results.reduce((sum, s) => sum + (s.nissScore || 0), 0) / results.length;

    let sentiment = "neutral";
    if (avgNISS > 10) sentiment = "bullish";
    else if (avgNISS < -10) sentiment = "bearish";

    // Update market regime
    setMarketRegime((prev) => ({
      ...prev,
      breadth,
      sentiment,
      strength: Math.min(100, Math.max(0, 50 + avgNISS)),
      lastUpdate: new Date(),
    }));
  };

  // Trigger browser notifications
  const triggerBrowserNotifications = (alerts) => {
    if (
      !notificationSettings.browser ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    // Send notification for high priority alerts only
    const highPriorityAlerts = alerts.filter(
      (alert) => alert.priority === "high"
    );

    highPriorityAlerts.slice(0, 3).forEach((alert, index) => {
      setTimeout(() => {
        new Notification(`${alert.title} - ${alert.symbol}`, {
          body: alert.message,
          icon: "/favicon.ico",
          tag: alert.id,
        });
      }, index * 1000); // Stagger notifications
    });
  };

  // Update performance metrics
  const updatePerformanceMetrics = () => {
    // Calculate metrics from historical performance
    if (historicalPerformance.length === 0) return;

    const recentPerformance = historicalPerformance.slice(0, 50); // Last 50 trades
    const successfulTrades = recentPerformance.filter((p) => p.return > 0);

    const metrics = {
      totalTrades: recentPerformance.length,
      successRate: (successfulTrades.length / recentPerformance.length) * 100,
      avgReturn:
        recentPerformance.reduce((sum, p) => sum + p.return, 0) /
        recentPerformance.length,
      avgHoldingPeriod:
        recentPerformance.reduce((sum, p) => sum + (p.holdingPeriod || 1), 0) /
        recentPerformance.length,
      winRate: (successfulTrades.length / recentPerformance.length) * 100,
      totalSignals: recentPerformance.length,
    };

    setPerformanceMetrics(metrics);
  };

  // UI HANDLERS & USER INTERACTIONS

  const handleRefresh = useCallback(async () => {
    if (loading || isScreening) return;

    console.log("🔄 Manual refresh triggered");
    setLastRefresh(new Date());

    if (activeTab === "screener") {
      await performInstitutionalScreening(100);
    } else {
      await performQuietRefresh();
    }
  }, [loading, isScreening, activeTab]);

  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleFilterChange = useCallback(
    (newFilters) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
      setCurrentPage(1);

      setTimeout(() => {
        localStorage.setItem(
          "institutionalFilters",
          JSON.stringify({ ...filters, ...newFilters })
        );
      }, 100);
    },
    [filters]
  );

  const handleSortChange = useCallback((field, direction) => {
    setSortBy(field);
    setSortDirection(direction);
  }, []);

  const handleStockSelection = useCallback((stock) => {
    setSelectedStock(stock);

    const recentViews = JSON.parse(localStorage.getItem("recentViews") || "[]");
    const updatedViews = [
      { symbol: stock.symbol, company: stock.company, time: new Date() },
      ...recentViews.filter((v) => v.symbol !== stock.symbol),
    ].slice(0, 20);

    localStorage.setItem("recentViews", JSON.stringify(updatedViews));
  }, []);

  const handleWatchlistToggle = useCallback((symbol) => {
    setWatchlist((prev) => {
      const isInWatchlist = prev.includes(symbol);
      const newWatchlist = isInWatchlist
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol];

      localStorage.setItem(
        "institutionalWatchlist",
        JSON.stringify(newWatchlist)
      );

      if (isInWatchlist) {
        console.log(`📋 Removed ${symbol} from watchlist`);
      } else {
        console.log(`📋 Added ${symbol} to watchlist`);
      }

      return newWatchlist;
    });
  }, []);

  // FIXED: Clear selected stock when changing tabs to prevent duplication
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setSelectedStock(null); // This prevents component duplication
    setCurrentPage(1); // Reset pagination

    const tabUsage = JSON.parse(localStorage.getItem("tabUsage") || "{}");
    tabUsage[tab] = (tabUsage[tab] || 0) + 1;
    localStorage.setItem("tabUsage", JSON.stringify(tabUsage));
  }, []);

  const handleSettingsChange = useCallback(
    (settings) => {
      if (settings.notifications) {
        setNotificationSettings((prev) => ({
          ...prev,
          ...settings.notifications,
        }));
        localStorage.setItem(
          "notificationSettings",
          JSON.stringify({ ...notificationSettings, ...settings.notifications })
        );
      }

      if (settings.refreshInterval) {
        setRefreshInterval(settings.refreshInterval);
        localStorage.setItem(
          "refreshInterval",
          settings.refreshInterval.toString()
        );
      }

      if (settings.autoRefresh !== undefined) {
        setAutoRefreshEnabled(settings.autoRefresh);
      }

      console.log("⚙️ Settings updated:", settings);
    },
    [notificationSettings]
  );

  const handleExportData = useCallback(
    async (format = "csv") => {
      if (exportInProgress) return;

      try {
        setExportInProgress(true);
        console.log(`📁 Exporting data in ${format} format...`);

        const exportData = screeningResults.map((stock) => ({
          Symbol: stock.symbol,
          Company: stock.company,
          Price: stock.price,
          Change: `${stock.changePercent}%`,
          Volume: stock.volume,
          "NISS Score": stock.nissScore?.toFixed(2),
          Confidence: stock.nissData?.confidence,
          Action: stock.tradeSetup?.action,
          "Entry Price": stock.tradeSetup?.entryPrice,
          "Stop Loss": stock.tradeSetup?.stopLoss,
          "Target 1": stock.tradeSetup?.targets?.[0]?.price,
          "Risk/Reward": stock.tradeSetup?.riskReward,
          Sector: stock.sector,
          "Market Cap": stock.marketCap,
          "News Count": stock.news?.length || 0,
          "Last Update": stock.lastUpdate
            ? new Date(stock.lastUpdate).toLocaleString()
            : "",
        }));

        const timestamp = new Date().toISOString().split("T")[0];
        const filename = `news-impact-screener-${timestamp}.${format}`;

        if (format === "csv") {
          const csvContent = convertToCSV(exportData);
          downloadFile(csvContent, filename, "text/csv");
        } else if (format === "json") {
          const jsonContent = JSON.stringify(exportData, null, 2);
          downloadFile(jsonContent, filename, "application/json");
        }

        console.log(`✅ Data exported successfully: ${filename}`);
      } catch (error) {
        console.error("❌ Export failed:", error);
        setError("Export failed. Please try again.");
      } finally {
        setExportInProgress(false);
      }
    },
    [screeningResults, exportInProgress]
  );

  const convertToCSV = (data) => {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            return typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          })
          .join(",")
      ),
    ];

    return csvRows.join("\n");
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // MEMOIZED VALUES FOR PERFORMANCE OPTIMIZATION

  const filteredAndSortedResults = useMemo(() => {
    let filtered = [...screeningResults];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(query) ||
          (stock.company && stock.company.toLowerCase().includes(query)) ||
          (stock.sector && stock.sector.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (filters.sector !== "all") {
      filtered = filtered.filter((stock) => stock.sector === filters.sector);
    }

    if (filters.marketCap !== "all") {
      filtered = filtered.filter((stock) => {
        const marketCap = stock.marketCap?.toLowerCase();
        return marketCap === filters.marketCap.toLowerCase();
      });
    }

    if (filters.nissThreshold) {
      filtered = filtered.filter(
        (stock) => Math.abs(stock.nissScore || 0) >= filters.nissThreshold
      );
    }

    if (filters.minConfidence !== "all") {
      filtered = filtered.filter((stock) => {
        const confidence = stock.nissData?.confidence;
        if (filters.minConfidence === "HIGH") return confidence === "HIGH";
        if (filters.minConfidence === "MEDIUM")
          return ["HIGH", "MEDIUM"].includes(confidence);
        return true;
      });
    }

    if (filters.minVolume) {
      filtered = filtered.filter(
        (stock) => (stock.volume || 0) >= filters.minVolume
      );
    }

    if (filters.minPrice) {
      filtered = filtered.filter(
        (stock) => (stock.price || 0) >= filters.minPrice
      );
    }

    if (filters.maxPrice) {
      filtered = filtered.filter(
        (stock) => (stock.price || 0) <= filters.maxPrice
      );
    }

    if (filters.signalType !== "all") {
      filtered = filtered.filter(
        (stock) => stock.tradeSetup?.action === filters.signalType
      );
    }

    if (filters.showOnlyWithNews) {
      filtered = filtered.filter(
        (stock) => stock.news && stock.news.length > 0
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle nested values
      if (sortBy === "nissScore") {
        aValue = a.nissScore || 0;
        bValue = b.nissScore || 0;
      } else if (sortBy === "confidence") {
        aValue = a.nissData?.confidence || "LOW";
        bValue = b.nissData?.confidence || "LOW";
        const confidenceOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 };
        aValue = confidenceOrder[aValue] || 1;
        bValue = confidenceOrder[bValue] || 1;
      } else if (sortBy === "price") {
        aValue = a.price || 0;
        bValue = b.price || 0;
      } else if (sortBy === "volume") {
        aValue = a.volume || 0;
        bValue = b.volume || 0;
      } else if (sortBy === "changePercent") {
        aValue = a.changePercent || 0;
        bValue = b.changePercent || 0;
      }

      // Handle string vs number comparison
      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return filtered;
  }, [screeningResults, searchQuery, filters, sortBy, sortDirection]);

  // Paginated results
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    return filteredAndSortedResults.slice(startIndex, endIndex);
  }, [filteredAndSortedResults, currentPage, resultsPerPage]);

  // Total pages calculation
  const totalPages = useMemo(() => {
    return Math.ceil(filteredAndSortedResults.length / resultsPerPage);
  }, [filteredAndSortedResults.length, resultsPerPage]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const results = filteredAndSortedResults;

    return {
      total: results.length,
      bullish: results.filter((s) => (s.nissScore || 0) > 0).length,
      bearish: results.filter((s) => (s.nissScore || 0) < 0).length,
      highConfidence: results.filter((s) => s.nissData?.confidence === "HIGH")
        .length,
      activeSignals: results.filter(
        (s) => s.tradeSetup?.action && s.tradeSetup.action !== "HOLD"
      ).length,
      avgNISS:
        results.length > 0
          ? results.reduce((sum, s) => sum + (s.nissScore || 0), 0) /
            results.length
          : 0,
      withNews: results.filter((s) => s.news && s.news.length > 0).length,
    };
  }, [filteredAndSortedResults]);

  // Current universe sectors for filter dropdown
  const availableSectors = useMemo(() => {
    const sectors = new Set(
      screeningResults.map((stock) => stock.sector).filter(Boolean)
    );
    return Array.from(sectors).sort();
  }, [screeningResults]);

  // Market status indicator
  const marketStatusIndicator = useMemo(() => {
    const status = marketStatus.sessionType;
    const colors = {
      regular: "text-green-600 bg-green-100",
      "pre-market": "text-blue-600 bg-blue-100",
      "after-hours": "text-orange-600 bg-orange-100",
      closed: "text-red-600 bg-red-100",
    };

    return {
      color: colors[status] || colors.closed,
      text: status.charAt(0).toUpperCase() + status.slice(1).replace("-", " "),
      time: marketStatus.isOpen
        ? marketStatus.timeToClose
        : marketStatus.timeToOpen,
    };
  }, [marketStatus]);

  // Connection status indicator
  const connectionStatusIndicator = useMemo(() => {
    const colors = {
      connected: "text-green-600 bg-green-100",
      connecting: "text-yellow-600 bg-yellow-100",
      error: "text-red-600 bg-red-100",
    };

    return {
      color: colors[connectionStatus] || colors.error,
      text:
        connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1),
      icon: connectionStatus === "connected" ? Wifi : WifiOff,
    };
  }, [connectionStatus]);

  // Performance summary for display
  const performanceSummary = useMemo(() => {
    const metrics = performanceMetrics;
    return {
      successRate: `${(metrics.successRate || 0).toFixed(1)}%`,
      avgReturn: `${(metrics.avgReturn || 0).toFixed(2)}%`,
      totalTrades: metrics.totalTrades || 0,
      winRate: `${(metrics.winRate || 0).toFixed(1)}%`,
    };
  }, [performanceMetrics]);

  // Recent alerts for notification display
  const recentAlerts = useMemo(() => {
    return alerts
      .filter(
        (alert) =>
          Date.now() - new Date(alert.time).getTime() < 24 * 60 * 60 * 1000
      ) // Last 24 hours
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 5); // Show only 5 most recent
  }, [alerts]);

  // MAIN RENDER FUNCTION - FIXED VERSION

  return (
    <div className="min-h-screen bg-gray-50">
      {/* FIXED: Enhanced Header with Logo and Unified Status */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* FIXED: Logo and Title Section */}
            <div className="flex items-center space-x-4">
              <JMTradingLogo className="flex-shrink-0" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  News Impact Screener
                </h1>
              </div>
            </div>

            {/* FIXED: Simplified Status Indicators */}
            <div className="flex items-center space-x-6">
              {/* Market Status */}
              <div className="text-right">
                <div className="text-xs text-gray-500">Market Status</div>
                <div
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${marketStatusIndicator.color}`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${
                      marketStatus.isOpen ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  {marketStatusIndicator.text}
                </div>
                {marketStatusIndicator.time && (
                  <div className="text-xs text-gray-500 mt-1">
                    {marketStatus.isOpen
                      ? `Closes in ${marketStatusIndicator.time}`
                      : `Opens in ${marketStatusIndicator.time}`}
                  </div>
                )}
              </div>

              {/* FIXED: Unified Backend Status */}
              <div className="text-right">
                <div className="text-xs text-gray-500">Backend Status</div>
                <div
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${connectionStatusIndicator.color}`}
                >
                  <connectionStatusIndicator.icon className="w-3 h-3 mr-1" />
                  {connectionStatusIndicator.text}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {serviceStatus.totalSymbols}+ symbols •{" "}
                  {serviceStatus.sectors} sectors
                </div>
              </div>

              {/* Last Update Time */}
              <div className="text-right">
                <div className="text-xs text-gray-500">Last Update</div>
                <div className="text-sm font-medium text-gray-700">
                  {lastRefresh.toLocaleTimeString()}
                </div>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={loading || isScreening}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  loading || isScreening
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${
                    loading || isScreening || refreshing ? "animate-spin" : ""
                  }`}
                />
                {loading || isScreening
                  ? "Screening..."
                  : refreshing
                  ? "Updating..."
                  : "Refresh"}
              </button>
            </div>
          </div>

          {/* Progress Bar for Bulk Operations */}
          {bulkOperationProgress > 0 && bulkOperationProgress < 100 && (
            <div className="pb-4">
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${bulkOperationProgress}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 mt-1 text-center">
                Processing screening results... {bulkOperationProgress}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-4 rounded">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-700 text-sm underline hover:text-red-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* FIXED: Enhanced Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: "screener", name: "Stock Screener", icon: Filter },
              { id: "catalyst", name: "Catalyst Analysis", icon: Target },
              {
                id: "performance",
                name: "Performance Tracking",
                icon: BarChart3,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`${
                    isActive
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.name}
                  {/* Add notification badges for relevant tabs */}
                  {tab.id === "screener" && summaryStats.activeSignals > 0 && (
                    <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                      {summaryStats.activeSignals}
                    </span>
                  )}
                  {tab.id === "performance" && recentAlerts.length > 0 && (
                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                      {recentAlerts.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* FIXED: Tab Content - Removed duplication and simplified */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === "screener" && (
            <StockScreener
              stocks={paginatedResults}
              totalResults={filteredAndSortedResults.length}
              loading={loading || isScreening}
              searchQuery={searchQuery}
              setSearchQuery={handleSearchChange}
              filters={filters}
              setFilters={handleFilterChange}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortDirection={sortDirection}
              setSortDirection={setSortDirection}
              selectedStock={selectedStock}
              setSelectedStock={handleStockSelection}
              onRefresh={handleRefresh}
              marketRegime={marketRegime}
              backendHealth={backendHealth}
              serviceStatus={serviceStatus}
              availableSectors={availableSectors}
              summaryStats={summaryStats}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              resultsPerPage={resultsPerPage}
              watchlist={watchlist}
              onWatchlistToggle={handleWatchlistToggle}
              onExportData={handleExportData}
              exportInProgress={exportInProgress}
              connectionStatus={connectionStatus}
              refreshing={refreshing}
            />
          )}

          {activeTab === "catalyst" && (
            <CatalystAnalysisTab
              stocks={filteredAndSortedResults}
              selectedStock={selectedStock}
              setSelectedStock={handleStockSelection}
              alerts={recentAlerts}
              marketRegime={marketRegime}
              loading={loading}
              backendHealth={backendHealth}
              serviceStatus={serviceStatus}
              connectionStatus={connectionStatus}
            />
          )}

          {activeTab === "performance" && (
            <PerformanceTrackingTab
              performanceMetrics={performanceSummary}
              historicalPerformance={historicalPerformance}
              alerts={recentAlerts}
              watchlist={watchlist}
              onWatchlistToggle={handleWatchlistToggle}
              loading={loading}
              backendHealth={backendHealth}
              serviceStatus={serviceStatus}
              connectionStatus={connectionStatus}
              marketRegime={marketRegime}
            />
          )}
        </div>
      </div>

      {/* Debug Panel (Development Only) */}
      {debugMode && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg text-xs max-w-md">
          <div className="font-semibold mb-2">Debug Info</div>
          <div className="space-y-1">
            <div>Connection: {connectionStatus}</div>
            <div>Backend Health: {backendHealth ? "OK" : "Error"}</div>
            <div>Results: {screeningResults.length}</div>
            <div>Filtered: {filteredAndSortedResults.length}</div>
            <div>Cache Size: {serviceStatus.cacheSize}</div>
            <div>Rate Limit: {serviceStatus.rateLimitRemaining}</div>
            <div>Auto Refresh: {autoRefreshEnabled ? "On" : "Off"}</div>
            <div>Market: {marketStatus.sessionType}</div>
            <div>Active Tab: {activeTab}</div>
            <div>Selected Stock: {selectedStock?.symbol || "None"}</div>
            <div>Watchlist Items: {watchlist.length}</div>
            <div>Recent Alerts: {recentAlerts.length}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsImpactScreener;
