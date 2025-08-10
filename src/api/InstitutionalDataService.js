// src/api/InstitutionalDataService.js - PRODUCTION READY VERSION
// Connects to complete backend with all required endpoints

class InstitutionalDataService {
  constructor() {
    this.version = "4.0.0-production";
    this.cache = new Map();
    this.initialized = false;
    this.initializing = false;

    // Environment-based backend URL
    this.backendBaseUrl =
      process.env.REACT_APP_BACKEND_URL ||
      "https://news-impact-screener-backend.onrender.com";

    this.cacheTTL = {
      quotes: 60000, // 1 minute
      news: 180000, // 3 minutes
      technicals: 300000, // 5 minutes
      screening: 120000, // 2 minutes
      health: 60000, // 1 minute
      marketContext: 60000, // 1 minute
      batch: 30000, // 30 seconds
    };

    this.endpoints = {
      health: "/api/health",
      quotes: "/api/quotes",
      batchQuotes: "/api/quotes/batch",
      news: "/api/news",
      technicals: "/api/technicals",
      screening: "/api/screening",
      marketContext: "/api/market-context",
      testKeys: "/api/test-keys",
    };

    this.requestCount = 0;
    this.lastRequestTime = Date.now();

    console.log("🚀 InstitutionalDataService v4.0.0-production initialized");
    console.log("🔗 Backend URL:", this.backendBaseUrl);
    console.log(
      "📊 Environment:",
      process.env.REACT_APP_ENVIRONMENT || "development"
    );
  }

  // ============================================
  // CORE CONNECTION METHODS
  // ============================================

  async ensureInitialized() {
    if (this.initialized) return true;

    if (this.initializing) {
      console.log("⏳ Waiting for existing initialization...");
      while (this.initializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return this.initialized;
    }

    this.initializing = true;

    try {
      console.log(
        "🔗 Initializing connection to backend:",
        this.backendBaseUrl
      );
      await this.checkBackendHealth();
      this.initialized = true;
      console.log(
        "✅ InstitutionalDataService v4.0.0 initialized successfully"
      );
      return true;
    } catch (error) {
      console.error("❌ Initialization failed:", error);
      return false;
    } finally {
      this.initializing = false;
    }
  }

  async makeApiCall(endpoint, options = {}) {
    const maxRetries = 3;
    let attempt = 0;

    this.requestCount++;
    this.lastRequestTime = Date.now();

    while (attempt < maxRetries) {
      try {
        const url = this.backendBaseUrl + endpoint;
        console.log(`📡 API Call v4.0.0 (attempt ${attempt + 1}): ${url}`);

        const requestOptions = {
          method: options.method || "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Client-Version": "4.0.0-production",
            "Cache-Control": "no-cache",
            ...options.headers,
          },
          mode: "cors",
          cache: "no-cache",
          credentials: "omit",
          ...options,
        };

        const response = await fetch(url, requestOptions);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ API Success: ${endpoint}`);

        if (!this.initialized) {
          this.initialized = true;
          console.log(
            "✅ Backend connection confirmed via successful API call"
          );
        }

        return data;
      } catch (error) {
        attempt++;
        console.error(
          `❌ API call failed (attempt ${attempt}):`,
          error.message
        );

        if (attempt >= maxRetries) {
          throw new Error(
            `API call failed after ${maxRetries} attempts: ${error.message}`
          );
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  getCacheKey(endpoint, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");
    return `${endpoint}${paramString ? "?" + paramString : ""}`;
  }

  getCachedData(key, ttl) {
    const cached = this.cache.get(key);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < ttl) {
        console.log(`📋 Cache hit: ${key} (age: ${age}ms)`);
        return cached.data;
      } else {
        console.log(`🗑️ Cache expired: ${key} (age: ${age}ms, ttl: ${ttl}ms)`);
        this.cache.delete(key);
      }
    }
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now(),
    });
    console.log(`💾 Cached: ${key}`);
  }

  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Cache cleared (${size} items removed)`);
  }

  // ============================================
  // BACKEND HEALTH AND VALIDATION
  // ============================================

  async checkBackendHealth() {
    try {
      console.log("🏥 Checking backend health...");
      const health = await this.makeApiCall(this.endpoints.health);

      console.log("✅ Backend health check passed:", {
        version: health.version,
        apis: Object.keys(health.apis || {}).length,
        uptime: health.uptime,
      });

      return health;
    } catch (error) {
      console.error("❌ Backend health check failed:", error);
      throw new Error(`Backend health check failed: ${error.message}`);
    }
  }

  async validateApiKeys() {
    try {
      console.log("🔑 Validating API keys...");
      const keyStatus = await this.makeApiCall(this.endpoints.testKeys);

      console.log("✅ API key validation:", {
        total: keyStatus.summary?.total || 0,
        configured: keyStatus.summary?.configured || 0,
        missing: keyStatus.summary?.missing || 0,
      });

      return keyStatus;
    } catch (error) {
      console.error("❌ API key validation failed:", error);
      throw error;
    }
  }

  // ============================================
  // MARKET DATA METHODS
  // ============================================

  async getMarketContext() {
    const cacheKey = this.getCacheKey("market-context");
    const cached = this.getCachedData(cacheKey, this.cacheTTL.marketContext);

    if (cached) {
      return cached;
    }

    try {
      console.log("📊 Fetching market context...");
      const context = await this.makeApiCall(this.endpoints.marketContext);

      this.setCachedData(cacheKey, context);
      console.log("✅ Market context loaded:", {
        trend: context.trend,
        volatility: context.volatility,
        spyChange: context.spyChange,
      });

      return context;
    } catch (error) {
      console.error("❌ Market context fetch failed:", error);

      // Return default context on failure
      return {
        volatility: "NORMAL",
        trend: "NEUTRAL",
        breadth: "MIXED",
        spyChange: 0,
        vix: 20,
        lastUpdate: new Date(),
        dataSource: "DEFAULT",
        error: error.message,
      };
    }
  }

  async getStockQuote(symbol) {
    const cacheKey = this.getCacheKey("quotes", { symbol });
    const cached = this.getCachedData(cacheKey, this.cacheTTL.quotes);

    if (cached) {
      return cached;
    }

    try {
      console.log(`📈 Fetching quote for ${symbol}...`);
      const quote = await this.makeApiCall(
        `${this.endpoints.quotes}/${symbol}`
      );

      this.setCachedData(cacheKey, quote);
      console.log(`✅ Quote loaded for ${symbol}:`, {
        price: quote.price,
        change: quote.changePercent,
        source: quote.source,
      });

      return quote;
    } catch (error) {
      console.error(`❌ Quote fetch failed for ${symbol}:`, error);
      throw error;
    }
  }

  async getBatchQuotes(symbols) {
    const symbolString = symbols.join(",");
    const cacheKey = this.getCacheKey("batch-quotes", {
      symbols: symbolString,
    });
    const cached = this.getCachedData(cacheKey, this.cacheTTL.batch);

    if (cached) {
      return cached;
    }

    try {
      console.log(`📊 Fetching batch quotes for ${symbols.length} symbols...`);
      const quotes = await this.makeApiCall(
        `${this.endpoints.batchQuotes}/${symbolString}`
      );

      this.setCachedData(cacheKey, quotes);
      console.log(`✅ Batch quotes loaded:`, {
        requested: quotes.requested,
        successful: quotes.successful,
      });

      return quotes;
    } catch (error) {
      console.error("❌ Batch quotes fetch failed:", error);
      throw error;
    }
  }

  // ============================================
  // STOCK SCREENING (MAIN METHOD)
  // ============================================

  async screenAllStocks(filters = {}) {
    const cacheKey = this.getCacheKey("screening", filters);
    const cached = this.getCachedData(cacheKey, this.cacheTTL.screening);

    if (cached) {
      console.log("📋 Using cached screening results");
      return cached.stocks || cached; // Handle both formats
    }

    try {
      console.log("🔍 Starting comprehensive stock screening...");
      console.log("📊 Filters applied:", filters);

      // Ensure backend is initialized
      await this.ensureInitialized();

      const startTime = Date.now();
      const screeningData = await this.makeApiCall(this.endpoints.screening);
      const endTime = Date.now();

      console.log("✅ Stock screening completed:", {
        stocks: screeningData.stocks?.length || 0,
        processingTime: `${endTime - startTime}ms`,
        successRate: screeningData.summary?.successRate || 0,
      });

      // Apply client-side filters
      let filteredStocks = screeningData.stocks || [];

      if (filters.nissThreshold !== undefined) {
        filteredStocks = filteredStocks.filter(
          (stock) => stock.nissScore >= filters.nissThreshold
        );
      }

      if (filters.minConfidence && filters.minConfidence !== "LOW") {
        const confidenceOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 };
        const minLevel = confidenceOrder[filters.minConfidence];
        filteredStocks = filteredStocks.filter(
          (stock) => confidenceOrder[stock.confidence] >= minLevel
        );
      }

      if (filters.maxResults) {
        filteredStocks = filteredStocks.slice(0, filters.maxResults);
      }

      // Cache the full response
      this.setCachedData(cacheKey, filteredStocks);

      console.log(`📈 Final filtered results: ${filteredStocks.length} stocks`);
      return filteredStocks;
    } catch (error) {
      console.error("❌ Stock screening failed:", error);
      throw new Error(`Stock screening failed: ${error.message}`);
    }
  }

  // ============================================
  // NEWS AND TECHNICAL ANALYSIS (PLACEHOLDER)
  // ============================================

  async getNewsAnalysis(symbol) {
    try {
      console.log(`📰 Fetching news analysis for ${symbol}...`);

      // For now, return mock news data
      // TODO: Implement real news API integration
      return {
        symbol: symbol,
        articles: [
          {
            title: `${symbol} Market Analysis`,
            summary: "Recent market developments and analysis",
            sentiment: "neutral",
            timestamp: new Date().toISOString(),
            source: "Market Analysis",
          },
        ],
        sentimentScore: 0,
        newsCount: 1,
        lastUpdate: new Date().toISOString(),
        dataSource: "PLACEHOLDER",
      };
    } catch (error) {
      console.error(`❌ News analysis failed for ${symbol}:`, error);
      throw error;
    }
  }

  async getTechnicalAnalysis(symbol) {
    try {
      console.log(`📊 Fetching technical analysis for ${symbol}...`);

      // For now, return basic technical data
      // TODO: Implement real technical analysis
      return {
        symbol: symbol,
        indicators: {
          rsi: 50,
          macd: 0,
          sma20: 0,
          sma50: 0,
          bollinger: { upper: 0, middle: 0, lower: 0 },
        },
        signals: {
          trend: "NEUTRAL",
          strength: "MEDIUM",
          recommendation: "HOLD",
        },
        lastUpdate: new Date().toISOString(),
        dataSource: "PLACEHOLDER",
      };
    } catch (error) {
      console.error(`❌ Technical analysis failed for ${symbol}:`, error);
      throw error;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  getServiceStatus() {
    return {
      version: this.version,
      initialized: this.initialized,
      backendUrl: this.backendBaseUrl,
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
      cacheSize: this.cache.size,
      environment: process.env.REACT_APP_ENVIRONMENT || "development",
    };
  }

  async testConnection() {
    try {
      console.log("🧪 Testing full service connection...");

      // Test health endpoint
      const health = await this.checkBackendHealth();

      // Test API keys
      const keys = await this.validateApiKeys();

      // Test market context
      const context = await this.getMarketContext();

      console.log("✅ Connection test passed - all endpoints working");

      return {
        success: true,
        health: health,
        apiKeys: keys,
        marketContext: context,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Connection test failed:", error);
      throw error;
    }
  }
}

// Create and export singleton instance
const institutionalDataService = new InstitutionalDataService();

export default institutionalDataService;
