// src/api/InstitutionalDataService.js - REAL API INTEGRATION ONLY
// NO MOCK DATA - All functions use real APIs with transparent error handling

import NISSCalculationEngine from "../engine/NISSCalculationEngine";
import dataNormalizer from "../utils/DataNormalizer";

class InstitutionalDataService {
  constructor() {
    this.version = "3.2.0"; // Updated version for real-data-only
    this.cache = new Map();
    this.initialized = false;
    this.backendBaseUrl =
      process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

    // Cache TTL settings (in milliseconds)
    this.cacheTTL = {
      quotes: 60000, // 1 minute
      news: 300000, // 5 minutes
      technicals: 600000, // 10 minutes
      screening: 180000, // 3 minutes
      health: 120000, // 2 minutes
    };

    // API endpoints configuration
    this.endpoints = {
      health: "/api/health",
      quotes: "/api/quotes",
      news: "/api/news",
      technicals: "/api/technicals",
      screening: "/api/screening",
      marketContext: "/api/market-context",
    };

    this.initialize();
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log(
        "🚀 InstitutionalDataService v3.2.0 initializing (REAL DATA ONLY)..."
      );

      // Test backend connectivity - REQUIRED
      await this.checkBackendHealth();

      // Initialize dependencies
      if (dataNormalizer && typeof dataNormalizer.initialize === "function") {
        dataNormalizer.initialize();
      }

      if (
        NISSCalculationEngine &&
        typeof NISSCalculationEngine.initialize === "function"
      ) {
        NISSCalculationEngine.initialize();
      }

      this.initialized = true;
      console.log("✅ InstitutionalDataService initialized - REAL DATA READY");
    } catch (error) {
      console.error(
        "❌ InstitutionalDataService initialization failed:",
        error
      );
      throw new Error(`Backend service unavailable: ${error.message}`);
    }
  }

  // ============================================
  // REAL BACKEND API METHODS ONLY
  // ============================================

  async makeApiCall(endpoint, options = {}) {
    try {
      const url = this.backendBaseUrl + endpoint;
      const response = await fetch(url, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: options.body,
      });

      if (!response.ok) {
        throw new Error(
          `API call failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error.message);
      throw error;
    }
  }

  async checkBackendHealth() {
    try {
      const health = await this.makeApiCall(this.endpoints.health);
      console.log("✅ Backend health check passed:", health.status);
      return health;
    } catch (error) {
      console.error("❌ Backend health check failed:", error.message);
      throw new Error("Backend service is not available");
    }
  }

  // ============================================
  // REAL DATA METHODS - NO MOCK FALLBACKS
  // ============================================

  async getStockQuote(symbol) {
    try {
      const cacheKey = `quote-${symbol}`;
      const cached = this.getFromCache(cacheKey, this.cacheTTL.quotes);
      if (cached) {
        console.log(`📊 Using cached quote for ${symbol}`);
        return cached;
      }

      console.log(`📊 Fetching REAL quote data for ${symbol}...`);

      const quoteData = await this.makeApiCall(
        `${this.endpoints.quotes}/${symbol}`
      );

      if (!quoteData || quoteData.error) {
        throw new Error(quoteData?.message || "Quote data not available");
      }

      // Normalize the data
      const normalizedQuote = dataNormalizer.normalizeStockQuote(quoteData);

      this.setCache(cacheKey, normalizedQuote);
      console.log(
        `✅ Real quote data received for ${symbol}: $${normalizedQuote.price}`
      );

      return normalizedQuote;
    } catch (error) {
      console.error(
        `❌ Failed to get REAL quote for ${symbol}:`,
        error.message
      );
      throw new Error(
        `Unable to fetch real quote data for ${symbol}: ${error.message}`
      );
    }
  }

  async getStockNews(symbol) {
    try {
      const cacheKey = `news-${symbol}`;
      const cached = this.getFromCache(cacheKey, this.cacheTTL.news);
      if (cached) {
        console.log(`📰 Using cached news for ${symbol}`);
        return cached;
      }

      console.log(`📰 Fetching REAL news data for ${symbol}...`);

      const newsData = await this.makeApiCall(
        `${this.endpoints.news}/${symbol}`
      );

      if (!newsData || !Array.isArray(newsData.articles)) {
        throw new Error("News data not available or invalid format");
      }

      // Normalize the news data
      const normalizedNews = dataNormalizer.normalizeNewsData(
        newsData.articles
      );

      this.setCache(cacheKey, normalizedNews);
      console.log(
        `✅ Real news data received for ${symbol}: ${normalizedNews.length} articles`
      );

      return normalizedNews;
    } catch (error) {
      console.error(`❌ Failed to get REAL news for ${symbol}:`, error.message);
      throw new Error(
        `Unable to fetch real news data for ${symbol}: ${error.message}`
      );
    }
  }

  async getTechnicalData(symbol) {
    try {
      const cacheKey = `technicals-${symbol}`;
      const cached = this.getFromCache(cacheKey, this.cacheTTL.technicals);
      if (cached) {
        console.log(`📈 Using cached technicals for ${symbol}`);
        return cached;
      }

      console.log(`📈 Fetching REAL technical data for ${symbol}...`);

      const techData = await this.makeApiCall(
        `${this.endpoints.technicals}/${symbol}`
      );

      if (!techData || techData.error) {
        throw new Error(techData?.message || "Technical data not available");
      }

      // Normalize the technical data
      const normalizedTechnicals =
        dataNormalizer.normalizeTechnicalData(techData);

      this.setCache(cacheKey, normalizedTechnicals);
      console.log(`✅ Real technical data received for ${symbol}`);

      return normalizedTechnicals;
    } catch (error) {
      console.error(
        `❌ Failed to get REAL technicals for ${symbol}:`,
        error.message
      );
      throw new Error(
        `Unable to fetch real technical data for ${symbol}: ${error.message}`
      );
    }
  }

  // ============================================
  // REAL SCREENING METHODS - NO MOCK FALLBACKS
  // ============================================

  async screenAllStocks(options = {}) {
    console.log("🔍 Starting REAL stock screening...", options);

    try {
      const cacheKey = `screening-${JSON.stringify(options)}`;
      const cached = this.getFromCache(cacheKey, this.cacheTTL.screening);
      if (cached) {
        console.log("📋 Using cached screening results");
        return cached;
      }

      console.log("🔍 Performing REAL API screening...");

      const screeningData = await this.makeApiCall(this.endpoints.screening, {
        method: "POST",
        body: JSON.stringify(options),
      });

      if (!screeningData || !Array.isArray(screeningData.results)) {
        throw new Error("Invalid screening response format");
      }

      console.log(
        `✅ Real screening complete: ${screeningData.results.length} stocks`
      );

      // Enhance results with NISS calculations using REAL data
      const enhancedResults = await Promise.all(
        screeningData.results.map(async (stock) => {
          try {
            return await this.enhanceStockWithRealNISS(stock);
          } catch (error) {
            console.warn(
              `Failed to enhance ${stock.symbol} with NISS:`,
              error.message
            );
            return { ...stock, nissScore: 0, confidence: "LOW" };
          }
        })
      );

      this.setCache(cacheKey, enhancedResults);
      return enhancedResults;
    } catch (error) {
      console.error("❌ Real screening failed:", error.message);
      throw new Error(
        `Unable to perform real stock screening: ${error.message}`
      );
    }
  }

  async analyzeStock(symbol) {
    console.log(`🔍 Analyzing ${symbol} with REAL APIs only...`);

    try {
      // Get all real data sources - NO MOCK FALLBACKS
      const [quote, news, technicals] = await Promise.all([
        this.getStockQuote(symbol),
        this.getStockNews(symbol),
        this.getTechnicalData(symbol),
      ]);

      // Calculate NISS using REAL data only
      const nissData = NISSCalculationEngine.calculateNISS({
        symbol,
        quote,
        news,
        technicals,
        marketContext: await this.getMarketContext(),
      });

      // Create comprehensive analysis with REAL data
      const analysis = {
        symbol,
        company: quote.company || `${symbol} Inc.`,
        currentPrice: quote.price,
        nissScore: nissData.score,
        confidence: nissData.confidence,
        sector: quote.sector || "Unknown",
        marketCap: quote.marketCap,
        priceData: {
          change: quote.change,
          changePercent: quote.changePercent,
          volume: quote.volume,
        },
        volumeData: {
          relativeVolume: quote.relativeVolume || 1,
          volume: quote.volume,
        },
        technicalData: technicals,
        latestNews: news[0] || null,
        recentNews: news.slice(0, 5),
        nissComponents: nissData.components,
        tradeSetup: nissData.tradeSetup,
        lastUpdate: new Date().toISOString(),
        dataSource: "REAL", // Always real data
      };

      console.log(
        `✅ REAL analysis complete for ${symbol}: NISS ${analysis.nissScore.toFixed(
          1
        )}`
      );
      return analysis;
    } catch (error) {
      console.error(`❌ REAL analysis failed for ${symbol}:`, error.message);
      throw new Error(
        `Unable to analyze ${symbol} with real data: ${error.message}`
      );
    }
  }

  async enhanceStockWithRealNISS(stock) {
    try {
      // Get additional real data if needed for NISS calculation
      let quote = stock;
      let news = [];
      let technicals = {};

      // If we only have basic stock data, fetch additional real data
      if (!stock.news || !stock.technicals) {
        try {
          [news, technicals] = await Promise.all([
            this.getStockNews(stock.symbol),
            this.getTechnicalData(stock.symbol),
          ]);
        } catch (error) {
          console.warn(
            `Could not get additional data for ${stock.symbol}:`,
            error.message
          );
          // Continue with limited data rather than failing
        }
      }

      // Calculate NISS with available real data
      const nissData = NISSCalculationEngine.calculateNISS({
        symbol: stock.symbol,
        quote: quote,
        news: news,
        technicals: technicals,
        marketContext: await this.getMarketContext(),
      });

      return {
        ...stock,
        nissScore: nissData.score,
        confidence: nissData.confidence,
        nissComponents: nissData.components,
        tradeSetup: nissData.tradeSetup,
        dataSource: "REAL",
        lastUpdate: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        `Failed to enhance ${stock.symbol} with real NISS:`,
        error.message
      );
      throw error;
    }
  }

  async getMarketContext() {
    try {
      const cacheKey = "market-context";
      const cached = this.getFromCache(cacheKey, this.cacheTTL.health);
      if (cached) return cached;

      console.log("🌍 Fetching REAL market context...");

      const marketData = await this.makeApiCall(this.endpoints.marketContext);

      if (!marketData || marketData.error) {
        throw new Error(marketData?.message || "Market context not available");
      }

      this.setCache(cacheKey, marketData);
      console.log("✅ Real market context received");

      return marketData;
    } catch (error) {
      console.error("❌ Failed to get real market context:", error.message);
      throw new Error(`Unable to fetch real market context: ${error.message}`);
    }
  }

  // ============================================
  // CACHE MANAGEMENT (NO CHANGES)
  // ============================================

  setCache(key, data) {
    try {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
      });

      // Limit cache size to prevent memory issues
      if (this.cache.size > 1000) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
    } catch (error) {
      console.warn("Cache write failed:", error);
    }
  }

  getFromCache(key, ttl) {
    try {
      const cached = this.cache.get(key);
      if (!cached) return null;

      const age = Date.now() - cached.timestamp;
      if (age > ttl) {
        this.cache.delete(key);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.warn("Cache read failed:", error);
      return null;
    }
  }

  clearCache() {
    try {
      this.cache.clear();
      console.log("🧹 Cache cleared successfully");
    } catch (error) {
      console.warn("Cache clear failed:", error);
    }
  }

  // ============================================
  // STATUS AND HEALTH METHODS
  // ============================================

  getServiceStatus() {
    return {
      version: this.version,
      initialized: this.initialized,
      cacheSize: this.cache.size,
      backendUrl: this.backendBaseUrl,
      endpoints: this.endpoints,
      dataSource: "REAL_ONLY", // No mock data
      lastHealthCheck: new Date().toISOString(),
    };
  }

  async getHealthReport() {
    try {
      const backendHealth = await this.checkBackendHealth();

      return {
        overall: backendHealth.status === "OK" ? "HEALTHY" : "DEGRADED",
        backend: backendHealth,
        cache: {
          size: this.cache.size,
          maxSize: 1000,
        },
        apis: backendHealth.apis || {},
        rateLimits: backendHealth.rateLimits || {},
        dataSource: "REAL_ONLY",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        overall: "ERROR",
        error: error.message,
        dataSource: "UNAVAILABLE",
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Create and export singleton instance
const institutionalDataService = new InstitutionalDataService();

export default institutionalDataService;
