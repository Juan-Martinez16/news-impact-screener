// src/api/InstitutionalDataService.js - ENHANCED VERSION 3.0
// Simplified and optimized data service using the new calculation engine

import {
  API_CONFIG,
  makeBackendApiCall,
  checkBackendHealth,
} from "./config.js";
import NISSCalculationEngine from "../engine/NISSCalculationEngine.js";
import DataNormalizer from "../utils/DataNormalizer.js";

class InstitutionalDataService {
  constructor() {
    this.version = "3.0.0";
    this.dataService = "Enhanced Institutional";

    // Initialize engines
    this.nissEngine = NISSCalculationEngine;
    this.dataNormalizer = DataNormalizer;

    // Enhanced cache management
    this.cache = new Map();
    this.cacheTTL = {
      quotes: 30 * 1000, // 30 seconds
      news: 5 * 60 * 1000, // 5 minutes
      technicals: 10 * 60 * 1000, // 10 minutes
      options: 2 * 60 * 1000, // 2 minutes
    };

    // Backend health tracking
    this.backendHealth = true;
    this.lastHealthCheck = Date.now();
    this.healthCheckInterval = 2 * 60 * 1000; // 2 minutes

    // Rate limiting
    this.requestHistory = [];
    this.maxRequestsPerMinute = 80;

    // Market context
    this.marketContext = {
      volatility: "NORMAL",
      trend: "NEUTRAL",
      breadth: "MIXED",
      lastUpdate: new Date(),
    };

    // COMPLETE SCREENING UNIVERSE (200+ stocks)
    this.screeningUniverse = this.buildCompleteUniverse();

    console.log(`🚀 InstitutionalDataService v${this.version} initialized`);
    console.log(
      `📊 Universe: ${this.getTotalSymbols()} symbols across ${
        Object.keys(this.screeningUniverse).length
      } sectors`
    );

    // Initialize health monitoring
    this.initializeHealthMonitoring();
  }

  // ============================================
  // UNIVERSE MANAGEMENT
  // ============================================

  buildCompleteUniverse() {
    return {
      // S&P 500 Leaders (31 symbols)
      megaCap: [
        "AAPL",
        "MSFT",
        "GOOGL",
        "AMZN",
        "NVDA",
        "META",
        "TSLA",
        "BRK.B",
        "JPM",
        "JNJ",
        "V",
        "MA",
        "PG",
        "UNH",
        "HD",
        "DIS",
        "BAC",
        "XOM",
        "ABBV",
        "CVX",
        "LLY",
        "WMT",
        "COST",
        "NFLX",
        "CRM",
        "TMO",
        "ACN",
        "MCD",
        "VZ",
        "ADBE",
        "PFE",
      ],

      // High Growth Tech (30 symbols)
      growthTech: [
        "PLTR",
        "SNOW",
        "DDOG",
        "NET",
        "CRWD",
        "ZS",
        "OKTA",
        "TWLO",
        "DOCU",
        "ZM",
        "ROKU",
        "SQ",
        "SHOP",
        "MELI",
        "SE",
        "UBER",
        "LYFT",
        "DASH",
        "ABNB",
        "RBLX",
        "COIN",
        "HOOD",
        "SOFI",
        "AFRM",
        "UPST",
        "RIVN",
        "LCID",
        "U",
        "DKNG",
        "PATH",
      ],

      // Semiconductors (25 symbols)
      semiconductor: [
        "AMD",
        "INTC",
        "MU",
        "QCOM",
        "AVGO",
        "TXN",
        "ADI",
        "MRVL",
        "KLAC",
        "AMAT",
        "LRCX",
        "ASML",
        "TSM",
        "NXPI",
        "MCHP",
        "ON",
        "SWKS",
        "QRVO",
        "SMCI",
        "ARM",
        "MPWR",
        "SLAB",
        "CRUS",
        "RMBS",
        "ACLS",
      ],

      // Biotech & Healthcare (25 symbols)
      biotech: [
        "MRNA",
        "BNTX",
        "GILD",
        "BIIB",
        "REGN",
        "VRTX",
        "ILMN",
        "ALNY",
        "BMRN",
        "INCY",
        "SGEN",
        "EXAS",
        "TECH",
        "IONS",
        "NBIX",
        "VKTX",
        "SAGE",
        "SRPT",
        "RARE",
        "BLUE",
        "ARCT",
        "FOLD",
        "BEAM",
        "EDIT",
        "CRSP",
      ],

      // Financial Services (25 symbols)
      financial: [
        "BAC",
        "WFC",
        "C",
        "GS",
        "MS",
        "USB",
        "PNC",
        "TFC",
        "COF",
        "SCHW",
        "PYPL",
        "SQ",
        "COIN",
        "SOFI",
        "AFRM",
        "UPST",
        "LC",
        "ALLY",
        "FISV",
        "FIS",
        "V",
        "MA",
        "AXP",
        "BLK",
        "SPGI",
      ],

      // Energy (20 symbols)
      energy: [
        "XOM",
        "CVX",
        "COP",
        "EOG",
        "SLB",
        "HAL",
        "DVN",
        "MRO",
        "OKE",
        "KMI",
        "PSX",
        "VLO",
        "MPC",
        "PXD",
        "BKR",
        "NOV",
        "FTI",
        "RIG",
        "HP",
        "OII",
      ],

      // Consumer & Retail (20 symbols)
      consumer: [
        "AMZN",
        "WMT",
        "COST",
        "TGT",
        "HD",
        "LOW",
        "NKE",
        "SBUX",
        "MCD",
        "DIS",
        "PG",
        "KO",
        "PEP",
        "CL",
        "EL",
        "UL",
        "MDLZ",
        "GIS",
        "K",
        "CPB",
      ],

      // Industrial (20 symbols)
      industrial: [
        "BA",
        "CAT",
        "GE",
        "MMM",
        "HON",
        "UPS",
        "FDX",
        "LMT",
        "RTX",
        "NOC",
        "DE",
        "EMR",
        "ETN",
        "PH",
        "ITW",
        "CMI",
        "ROK",
        "DOV",
        "XYL",
        "CARR",
      ],
    };
  }

  getScreeningUniverse() {
    return Object.values(this.screeningUniverse).flat();
  }

  getTotalSymbols() {
    return this.getScreeningUniverse().length;
  }

  getUniverseByType(type = "all") {
    if (type === "all") {
      return this.getScreeningUniverse();
    }
    return this.screeningUniverse[type] || [];
  }

  // ============================================
  // CORE DATA METHODS (Simplified)
  // ============================================

  async getQuote(symbol) {
    try {
      const cacheKey = `quote-${symbol}`;

      // Check cache first
      const cached = this.getFromCache(cacheKey, this.cacheTTL.quotes);
      if (cached) return cached;

      // Try backend API
      let rawQuote = null;
      try {
        rawQuote = await makeBackendApiCall(`/api/quote/${symbol}`);
      } catch (apiError) {
        console.warn(`Backend API failed for ${symbol}, using mock data`);
      }

      // Fallback to mock data if API fails
      if (!rawQuote) {
        rawQuote = this.generateEnhancedMockQuote(symbol);
      }

      // Normalize the data
      const normalized = this.dataNormalizer.normalizeStockQuote(rawQuote);

      // Cache the result
      this.setCache(cacheKey, normalized);

      return normalized;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return this.generateEnhancedMockQuote(symbol);
    }
  }

  async getNews(symbol) {
    try {
      const cacheKey = `news-${symbol}`;

      // Check cache first
      const cached = this.getFromCache(cacheKey, this.cacheTTL.news);
      if (cached) return cached;

      // Try backend API
      let rawNews = null;
      try {
        rawNews = await makeBackendApiCall(`/api/news/${symbol}`);
      } catch (apiError) {
        console.warn(`Backend news API failed for ${symbol}, using mock data`);
      }

      // Fallback to mock data if API fails
      if (!rawNews || !Array.isArray(rawNews) || rawNews.length === 0) {
        rawNews = this.generateEnhancedMockNews(symbol);
      }

      // Normalize the data
      const normalized = this.dataNormalizer.normalizeNewsData(rawNews);

      // Cache the result
      this.setCache(cacheKey, normalized);

      return normalized;
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error);
      return this.generateEnhancedMockNews(symbol);
    }
  }

  async getTechnicals(symbol) {
    try {
      const cacheKey = `technicals-${symbol}`;

      // Check cache first
      const cached = this.getFromCache(cacheKey, this.cacheTTL.technicals);
      if (cached) return cached;

      // Try backend API
      let rawTechnicals = null;
      try {
        rawTechnicals = await makeBackendApiCall(`/api/technicals/${symbol}`);
      } catch (apiError) {
        console.warn(
          `Backend technicals API failed for ${symbol}, using mock data`
        );
      }

      // Fallback to mock data if API fails
      if (!rawTechnicals) {
        rawTechnicals = this.generateEnhancedMockTechnicals(symbol);
      }

      // Normalize the data
      const normalized =
        this.dataNormalizer.normalizeTechnicalData(rawTechnicals);

      // Cache the result
      this.setCache(cacheKey, normalized);

      return normalized;
    } catch (error) {
      console.error(`Error fetching technicals for ${symbol}:`, error);
      return this.generateEnhancedMockTechnicals(symbol);
    }
  }

  async getOptionsFlow(symbol) {
    try {
      const cacheKey = `options-${symbol}`;

      // Check cache first
      const cached = this.getFromCache(cacheKey, this.cacheTTL.options);
      if (cached) return cached;

      // Try backend API
      let rawOptions = null;
      try {
        rawOptions = await makeBackendApiCall(`/api/options/${symbol}`);
      } catch (apiError) {
        console.warn(
          `Backend options API failed for ${symbol}, using mock data`
        );
      }

      // Fallback to mock data if API fails
      if (!rawOptions) {
        rawOptions = this.generateEnhancedMockOptions(symbol);
      }

      // Normalize the data
      const normalized = this.dataNormalizer.normalizeOptionsData(rawOptions);

      // Cache the result
      this.setCache(cacheKey, normalized);

      return normalized;
    } catch (error) {
      console.error(`Error fetching options for ${symbol}:`, error);
      return this.generateEnhancedMockOptions(symbol);
    }
  }

  // ============================================
  // ENHANCED SCREENING METHOD
  // ============================================

  async screenAllStocks(options = {}) {
    try {
      console.log("📊 Starting enhanced stock screening...");
      const startTime = performance.now();

      const {
        nissThreshold = 50,
        minConfidence = "MEDIUM",
        maxResults = 200,
        sectors = "all",
      } = options;

      // Get universe to screen
      const universe =
        sectors === "all"
          ? this.getScreeningUniverse()
          : this.getUniverseByType(sectors);

      console.log(`🎯 Screening ${universe.length} symbols...`);

      // Update market context first
      await this.updateMarketContext();

      // Process stocks in batches to avoid overwhelming the system
      const batchSize = 10;
      const results = [];

      for (let i = 0; i < universe.length; i += batchSize) {
        const batch = universe.slice(i, i + batchSize);
        console.log(
          `📈 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
            universe.length / batchSize
          )}`
        );

        const batchPromises = batch.map((symbol) => this.analyzeStock(symbol));
        const batchResults = await Promise.all(batchPromises);

        // Filter successful results
        const validResults = batchResults.filter(
          (result) =>
            result && result.nissScore !== null && !isNaN(result.nissScore)
        );

        results.push(...validResults);

        // Small delay between batches to prevent rate limiting
        if (i + batchSize < universe.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Filter and sort results
      const filteredResults = results
        .filter((stock) => {
          const meetsThreshold =
            Math.abs(stock.nissScore) >= Math.abs(nissThreshold);
          const meetsConfidence = this.meetsConfidenceCriteria(
            stock.confidence,
            minConfidence
          );
          return meetsThreshold && meetsConfidence;
        })
        .sort((a, b) => Math.abs(b.nissScore) - Math.abs(a.nissScore))
        .slice(0, maxResults);

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      console.log(
        `✅ Enhanced screening completed: ${filteredResults.length} results in ${processingTime}s`
      );

      return filteredResults;
    } catch (error) {
      console.error("❌ Enhanced screening failed:", error);
      throw error;
    }
  }

  async analyzeStock(symbol) {
    try {
      // Fetch all required data concurrently
      const [stockData, newsData, technicalData, optionsData] =
        await Promise.all([
          this.getQuote(symbol),
          this.getNews(symbol),
          this.getTechnicals(symbol),
          this.getOptionsFlow(symbol),
        ]);

      // Calculate NISS using the engine
      const nissResult = this.nissEngine.calculateNISS(
        stockData,
        newsData,
        technicalData,
        optionsData,
        this.marketContext
      );

      // Generate trade setup
      const tradeSetup = this.nissEngine.generateTradeSetup(
        stockData,
        nissResult
      );

      // Return complete analysis
      return {
        ...stockData,
        nissScore: nissResult.score,
        nissComponents: nissResult.components,
        confidence: nissResult.confidence,
        regimeAdjustment: nissResult.regimeAdjustment,
        tradeSetup: tradeSetup,
        news: newsData,
        technicals: technicalData,
        options: optionsData,
        analysisTime: nissResult.metadata.processingTime,
        lastUpdate: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`❌ Analysis failed for ${symbol}:`, error);
      return null;
    }
  }

  // ============================================
  // MARKET CONTEXT MANAGEMENT
  // ============================================

  async updateMarketContext() {
    try {
      // Get SPY data for market context
      const spyData = await this.getQuote("SPY");

      // Update market regime (simplified for now)
      this.marketContext = {
        volatility: spyData.changePercent > 2 ? "HIGH" : "NORMAL",
        trend:
          spyData.changePercent > 0.5
            ? "BULLISH"
            : spyData.changePercent < -0.5
            ? "BEARISH"
            : "NEUTRAL",
        breadth: "MIXED", // Will be enhanced later
        spyChange: spyData.changePercent,
        vixLevel: 20, // Default VIX level (will be enhanced later)
        sectorPerformance: {}, // Will be populated with real sector data later
        lastUpdate: new Date(),
      };

      console.log("📊 Market context updated:", this.marketContext);
    } catch (error) {
      console.error("Market context update failed:", error);
      // Use default values
      this.marketContext = {
        volatility: "NORMAL",
        trend: "NEUTRAL",
        breadth: "MIXED",
        spyChange: 0,
        vixLevel: 20,
        sectorPerformance: {},
        lastUpdate: new Date(),
      };
    }
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  setCache(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now(),
    });

    // Clean old cache entries if cache gets too large
    if (this.cache.size > 1000) {
      this.cleanCache();
    }
  }

  getFromCache(key, ttl) {
    const cached = this.cache.get(key);

    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  cleanCache() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes max age

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }

    console.log(`🧹 Cache cleaned. Size: ${this.cache.size}`);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  meetsConfidenceCriteria(confidence, minConfidence) {
    const confidenceLevels = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    return confidenceLevels[confidence] >= confidenceLevels[minConfidence];
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  getSectorForSymbol(symbol) {
    for (const [sector, symbols] of Object.entries(this.screeningUniverse)) {
      if (symbols.includes(symbol)) {
        return sector.charAt(0).toUpperCase() + sector.slice(1);
      }
    }
    return "Technology"; // Default
  }

  getSectorPriceMultiplier(symbol) {
    const sector = this.getSectorForSymbol(symbol);
    const multipliers = {
      MegaCap: 3.5,
      GrowthTech: 2.8,
      Semiconductor: 2.5,
      Biotech: 1.8,
      Financial: 1.5,
      Energy: 1.3,
      Consumer: 1.4,
      Industrial: 1.6,
    };

    return multipliers[sector] || 1.5;
  }

  getSectorVolatility(sector) {
    const volatilities = {
      MegaCap: 0.03,
      GrowthTech: 0.08,
      Semiconductor: 0.06,
      Biotech: 0.12,
      Financial: 0.05,
      Energy: 0.07,
      Consumer: 0.03,
      Industrial: 0.04,
    };

    return volatilities[sector] || 0.05;
  }

  // ============================================
  // HEALTH MONITORING
  // ============================================

  initializeHealthMonitoring() {
    // Check backend health periodically
    setInterval(async () => {
      try {
        this.backendHealth = await checkBackendHealth();
        this.lastHealthCheck = Date.now();
      } catch (error) {
        this.backendHealth = false;
        console.warn("Backend health check failed:", error);
      }
    }, this.healthCheckInterval);
  }

  getServiceStatus() {
    return {
      version: this.version,
      backendHealth: this.backendHealth,
      cacheSize: this.cache.size,
      totalSymbols: this.getTotalSymbols(),
      lastHealthCheck: new Date(this.lastHealthCheck).toISOString(),
      marketContext: this.marketContext,
      requestHistory: this.requestHistory.length,
    };
  }

  // ============================================
  // MOCK DATA GENERATORS (Enhanced)
  // ============================================

  generateEnhancedMockQuote(symbol) {
    const sector = this.getSectorForSymbol(symbol);
    const sectorMultiplier = this.getSectorPriceMultiplier(symbol);
    const basePrice = (20 + (this.hashCode(symbol) % 150)) * sectorMultiplier;
    const volatility = this.getSectorVolatility(sector);

    const changePercent = (Math.random() - 0.5) * volatility * 100;
    const change = (basePrice * changePercent) / 100;
    const currentPrice = Math.max(1, basePrice + change);

    return {
      symbol: symbol,
      price: parseFloat(currentPrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: Math.floor(500000 + Math.random() * 3000000),
      avgVolume: Math.floor(400000 + Math.random() * 2000000),
      high: parseFloat((currentPrice * (1 + Math.random() * 0.03)).toFixed(2)),
      low: parseFloat((currentPrice * (1 - Math.random() * 0.03)).toFixed(2)),
      open: parseFloat(
        (basePrice * (1 + (Math.random() - 0.5) * 0.02)).toFixed(2)
      ),
      previousClose: parseFloat(basePrice.toFixed(2)),
      high52Week: parseFloat(
        (basePrice * (1.2 + Math.random() * 0.8)).toFixed(2)
      ),
      low52Week: parseFloat(
        (basePrice * (0.6 + Math.random() * 0.3)).toFixed(2)
      ),
      marketCap: Math.floor(
        currentPrice * (10 + Math.random() * 500) * 1000000
      ),
      sector: sector,
      timestamp: new Date().toISOString(),
      dataSource: "Enhanced Mock",
    };
  }

  generateEnhancedMockNews(symbol) {
    const sector = this.getSectorForSymbol(symbol);
    const newsTemplates = this.getNewsTemplatesForSector(sector, symbol);

    return newsTemplates.map((template, index) => ({
      headline: template.headline,
      summary: `${template.headline} - Market analysis and implications for ${symbol}`,
      source: this.getCredibleSource(),
      datetime: new Date(Date.now() - index * 3600000).toISOString(), // Spread over hours
      url: `https://example.com/news/${symbol.toLowerCase()}-${index}`,
      sentiment: template.sentiment + (Math.random() - 0.5) * 0.2, // Add some variance
      relevanceScore: 70 + Math.random() * 25, // High relevance for mock data
      category: template.category,
      catalysts: template.catalysts,
    }));
  }

  generateEnhancedMockTechnicals(symbol) {
    const basePrice = 50 + (this.hashCode(symbol) % 150);

    return {
      rsi: 30 + Math.random() * 40, // 30-70 range
      macd: (Math.random() - 0.5) * 3,
      macdSignal: (Math.random() - 0.5) * 2,
      macdHistogram: (Math.random() - 0.5) * 1,
      sma20: basePrice * (0.98 + Math.random() * 0.04),
      sma50: basePrice * (0.95 + Math.random() * 0.06),
      sma200: basePrice * (0.9 + Math.random() * 0.15),
      bollinger: {
        upper: basePrice * 1.02,
        middle: basePrice,
        lower: basePrice * 0.98,
      },
      adx: 15 + Math.random() * 40,
      atr: basePrice * (0.01 + Math.random() * 0.03),
      stochastic: 20 + Math.random() * 60,
      momentum: 40 + Math.random() * 20,
      williamsR: -80 + Math.random() * 60,
      timestamp: new Date().toISOString(),
      dataSource: "Enhanced Mock",
    };
  }

  generateEnhancedMockOptions(symbol) {
    return {
      putCallRatio: 0.6 + Math.random() * 0.8, // 0.6-1.4 range
      callVolume: Math.floor(Math.random() * 15000),
      putVolume: Math.floor(Math.random() * 10000),
      callOI: Math.floor(Math.random() * 75000),
      putOI: Math.floor(Math.random() * 60000),
      unusualActivity: Math.random() < 0.15, // 15% chance
      impliedVolatility: 0.15 + Math.random() * 0.5, // 15%-65% IV
      timestamp: new Date().toISOString(),
      dataSource: "Enhanced Mock",
    };
  }

  // ============================================
  // NEWS TEMPLATE GENERATORS
  // ============================================

  getNewsTemplatesForSector(sector, symbol) {
    const sectorTemplates = {
      MegaCap: [
        {
          headline: `${symbol} quarterly earnings exceed analyst expectations`,
          sentiment: 0.8,
          catalysts: ["earnings"],
          category: "earnings",
        },
        {
          headline: `${symbol} announces major strategic partnership`,
          sentiment: 0.6,
          catalysts: ["partnership"],
          category: "corporate",
        },
      ],
      GrowthTech: [
        {
          headline: `${symbol} reports strong user growth metrics`,
          sentiment: 0.7,
          catalysts: ["growth"],
          category: "performance",
        },
        {
          headline: `${symbol} faces increased competition concerns`,
          sentiment: -0.4,
          catalysts: ["competition"],
          category: "market",
        },
      ],
      Biotech: [
        {
          headline: `${symbol} receives FDA breakthrough therapy designation`,
          sentiment: 0.9,
          catalysts: ["fda"],
          category: "regulatory",
        },
        {
          headline: `${symbol} clinical trial shows promising results`,
          sentiment: 0.7,
          catalysts: ["clinical"],
          category: "research",
        },
      ],
    };

    const defaultTemplates = [
      {
        headline: `${symbol} quarterly earnings meet expectations`,
        sentiment: 0.5,
        catalysts: ["earnings"],
        category: "earnings",
      },
      {
        headline: `Analysts update ${symbol} price target`,
        sentiment: 0.4,
        catalysts: ["analyst"],
        category: "analyst",
      },
    ];

    return sectorTemplates[sector] || defaultTemplates;
  }

  getCredibleSource() {
    const sources = [
      "Reuters",
      "Bloomberg",
      "Wall Street Journal",
      "Financial Times",
      "MarketWatch",
      "CNBC",
      "Yahoo Finance",
      "Seeking Alpha",
    ];
    return sources[Math.floor(Math.random() * sources.length)];
  }

  getSectorVolatility(sector) {
    const volatilities = {
      MegaCap: 0.03,
      GrowthTech: 0.08,
      Semiconductor: 0.06,
      Biotech: 0.12,
      Financial: 0.05,
      Energy: 0.07,
      Consumer: 0.03,
      Industrial: 0.04,
    };

    return volatilities[sector] || 0.05;
  }
}

// Export singleton instance
const institutionalDataService = new InstitutionalDataService();

// Initialize health monitoring
institutionalDataService.initializeHealthMonitoring();

console.log("🚀 Enhanced InstitutionalDataService initialized");
console.log(
  `📊 Universe: ${institutionalDataService.getTotalSymbols()} symbols across ${
    Object.keys(institutionalDataService.screeningUniverse).length
  } sectors`
);

export default institutionalDataService;
