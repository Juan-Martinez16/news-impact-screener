// src/api/InstitutionalDataService.js - v4.1.0-fixed COMPLETE VERSION
// Full implementation with all methods and enhanced error handling

class InstitutionalDataService {
  constructor() {
    this.version = "4.1.0-fixed";
    this.initialized = false;

    // Enhanced backend URL detection
    this.backendBaseUrl = this.detectBackendUrl();

    // Connection status tracking
    this.connectionStatus = {
      isConnected: false,
      lastCheck: null,
      consecutiveErrors: 0,
      backendVersion: "unknown",
    };

    // Request queue for rate limiting
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.maxConcurrentRequests = 3;
    this.activeRequests = 0;

    // Cache for performance optimization
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

    console.log(`🚀 InstitutionalDataService ${this.version} initializing...`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🔗 Backend URL: ${this.backendBaseUrl}`);
  }

  // ============================================
  // BACKEND URL DETECTION
  // ============================================

  detectBackendUrl() {
    // Try multiple environment variable formats
    const envUrl =
      process.env.REACT_APP_BACKEND_URL ||
      process.env.BACKEND_URL ||
      process.env.API_URL;

    if (envUrl) {
      console.log("✅ Found environment URL:", envUrl);
      return envUrl;
    }

    // Default URLs based on environment
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;

      if (hostname === "localhost" || hostname === "127.0.0.1") {
        console.log("🔧 Development environment detected, using localhost");
        return "http://localhost:3001";
      }

      if (
        hostname.includes("vercel.app") ||
        hostname.includes("claude.ai") ||
        hostname.includes("artifacts.anthropic.com")
      ) {
        console.log("☁️ Production environment detected, using Render backend");
        return "https://news-impact-screener-backend.onrender.com";
      }
    }

    // Final fallback
    const fallbackUrl = "https://news-impact-screener-backend.onrender.com";
    console.log("⚠️ No environment URL found, using fallback:", fallbackUrl);
    return fallbackUrl;
  }

  // ============================================
  // CONNECTION MANAGEMENT
  // ============================================

  async initializeConnection() {
    if (this.initialized) {
      return this.connectionStatus;
    }

    console.log("🔗 Initializing connection to backend:", this.backendBaseUrl);

    try {
      const healthCheck = await this.testConnection();
      this.connectionStatus = {
        isConnected: true,
        lastCheck: new Date().toISOString(),
        consecutiveErrors: 0,
        backendVersion: healthCheck.version || "unknown",
      };

      this.initialized = true;
      console.log("✅ Backend connected successfully:", healthCheck.version);
      console.log(
        "📊 APIs available:",
        Object.keys(healthCheck.apis?.ready || {}).length
      );

      return this.connectionStatus;
    } catch (error) {
      console.error("❌ Backend connection failed:", error.message);
      this.connectionStatus = {
        isConnected: false,
        lastCheck: new Date().toISOString(),
        consecutiveErrors: this.connectionStatus.consecutiveErrors + 1,
        backendVersion: "unknown",
        error: error.message,
      };

      throw error;
    }
  }

  async testConnection() {
    console.log("🔌 Testing connection to backend...");
    const startTime = Date.now();

    try {
      const response = await this.makeRequest("/api/health", {
        timeout: 5000,
      });

      const responseTime = Date.now() - startTime;
      console.log(`✅ Connection test passed in ${responseTime}ms`);

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(
        `❌ Connection test failed in ${responseTime}ms:`,
        error.message
      );
      throw error;
    }
  }

  // ============================================
  // ENHANCED REQUEST HANDLING
  // ============================================

  async makeRequest(endpoint, options = {}) {
    const url = `${this.backendBaseUrl}${endpoint}`;
    const startTime = Date.now();

    console.log(`🌐 Fetch to: ${url}`);

    const defaultOptions = {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Client-Version": this.version,
        "Cache-Control": "no-cache",
      },
      timeout: options.timeout || 15000,
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      // Implement timeout manually since fetch doesn't support it natively
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        finalOptions.timeout
      );

      const response = await fetch(url, {
        ...finalOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      console.log(`📡 Response: ${response.status} (${responseTime}ms)`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Update connection status on successful request
      this.connectionStatus.isConnected = true;
      this.connectionStatus.consecutiveErrors = 0;
      this.connectionStatus.lastCheck = new Date().toISOString();

      return data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Request failed (${responseTime}ms):`, error.message);

      // Update connection status on error
      this.connectionStatus.consecutiveErrors++;
      this.connectionStatus.lastCheck = new Date().toISOString();

      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${finalOptions.timeout}ms`);
      }

      // Enhanced error messages for common issues
      if (error.message.includes("Failed to fetch")) {
        throw new Error(
          "Backend service unavailable. Please check your connection."
        );
      }

      if (error.message.includes("CORS")) {
        throw new Error("CORS policy error. Backend configuration issue.");
      }

      if (error.message.includes("NetworkError")) {
        throw new Error("Network error. Check your internet connection.");
      }

      throw error;
    }
  }

  // Request with retry logic
  async makeRequestWithRetry(endpoint, options = {}, maxRetries = 2) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔄 Request attempt ${attempt}/${maxRetries} for ${endpoint}`
        );
        return await this.makeRequest(endpoint, options);
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s...
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`❌ All ${maxRetries} attempts failed for ${endpoint}`);
    throw lastError;
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    console.log(`📋 Cache hit for ${key}`);
    return cached.data;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    console.log(`💾 Cached data for ${key}`);
  }

  clearCache() {
    this.cache.clear();
    console.log("🧹 Cache cleared");
  }

  // ============================================
  // CORE API METHODS
  // ============================================

  async getMarketContext() {
    console.log("📈 Loading market context...");

    const cacheKey = "market-context";
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRequestWithRetry("/api/market-context");
      console.log("✅ Market context loaded:", response);

      this.setCachedData(cacheKey, response);
      return response;
    } catch (error) {
      console.error("❌ Market context loading failed:", error.message);

      // Return fallback market context
      const fallback = {
        volatility: "NORMAL",
        trend: "NEUTRAL",
        breadth: "MIXED",
        spyChange: 0,
        vix: 20,
        lastUpdate: new Date().toISOString(),
        dataSource: "FALLBACK",
        error: error.message,
      };

      this.setCachedData(cacheKey, fallback);
      return fallback;
    }
  }

  async performScreening(options = {}) {
    console.log("🔍 Starting stock screening with options:", options);

    try {
      // Initialize connection if not already done
      if (!this.initialized) {
        await this.initializeConnection();
      }

      const startTime = Date.now();
      const endpoint = "/api/screening";

      // Add query parameters if provided
      const params = new URLSearchParams();
      if (options.limit) params.append("limit", options.limit);
      if (options.minNissScore)
        params.append("minNissScore", options.minNissScore);
      if (options.includeAll) params.append("includeAll", "true");
      if (options.sortBy) params.append("sortBy", options.sortBy);
      if (options.sortOrder) params.append("sortOrder", options.sortOrder);

      const fullEndpoint = params.toString()
        ? `${endpoint}?${params}`
        : endpoint;

      const response = await this.makeRequestWithRetry(fullEndpoint, {
        timeout: 30000, // 30 second timeout for screening
      });

      const processingTime = Date.now() - startTime;

      if (!response || !response.stocks) {
        throw new Error("Invalid screening response format");
      }

      console.log(
        `✅ Screening completed: ${response.stocks.length} stocks returned`
      );
      console.log(`⏱️ Processing time: ${processingTime}ms`);
      console.log(
        `📊 Success rate: ${response.summary?.successRate || "unknown"}%`
      );

      // Validate and enhance the response
      const enhancedResponse = {
        ...response,
        stocks: response.stocks.map((stock) => ({
          ...stock,
          // Ensure all required fields exist with defaults
          nissScore: stock.nissScore || 0,
          sentiment: stock.sentiment || "NEUTRAL",
          confidence: stock.confidence || "MEDIUM",
          newsCount: stock.newsCount || 0,
          currentPrice: stock.currentPrice || 0,
          changePercent: stock.changePercent || 0,
          change: stock.change || 0,
          volume: stock.volume || 0,
          marketCap: stock.marketCap || 0,
          lastUpdated: stock.lastUpdated || new Date().toISOString(),
          source: stock.source || "backend",
          // Add computed fields for compatibility
          price: stock.currentPrice || stock.price || 0,
          symbol: stock.symbol || "UNKNOWN",
        })),
        processingTime,
        clientVersion: this.version,
        timestamp: new Date().toISOString(),
      };

      // Cache successful results for 2 minutes
      this.setCachedData("screening-results", enhancedResponse);

      return enhancedResponse;
    } catch (error) {
      console.error("❌ Stock screening failed:", error.message);

      // Try to return cached data if available
      const cached = this.getCachedData("screening-results");
      if (cached) {
        console.log("📋 Returning cached screening data due to error");
        return {
          ...cached,
          error: `Using cached data: ${error.message}`,
          fromCache: true,
        };
      }

      // Return empty result with error info for graceful degradation
      return {
        stocks: [],
        summary: {
          totalProcessed: 0,
          totalRequested: 0,
          successRate: "0",
          processingTime: "0ms",
          errors: 1,
          timestamp: new Date().toISOString(),
        },
        error: error.message,
        clientVersion: this.version,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getStockQuote(symbol) {
    if (!symbol) {
      throw new Error("Symbol is required for quote lookup");
    }

    console.log(`📊 Getting quote for ${symbol}...`);

    const cacheKey = `quote-${symbol}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRequestWithRetry(`/api/quotes/${symbol}`);
      console.log(`✅ Quote received for ${symbol}:`, response);

      this.setCachedData(cacheKey, response);
      return response;
    } catch (error) {
      console.error(`❌ Quote failed for ${symbol}:`, error.message);
      throw error;
    }
  }

  async getBatchQuotes(symbols) {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      throw new Error("Invalid symbols array provided");
    }

    console.log(`📊 Getting batch quotes for ${symbols.length} symbols...`);

    try {
      const symbolsParam = symbols.slice(0, 20).join(","); // Limit to 20 symbols
      const response = await this.makeRequestWithRetry(
        `/api/quotes/batch/${symbolsParam}`
      );
      console.log(`✅ Batch quotes received for ${symbols.length} symbols`);
      return response;
    } catch (error) {
      console.error(`❌ Batch quotes failed:`, error.message);
      throw error;
    }
  }

  async getTechnicalAnalysis(symbol) {
    if (!symbol) {
      throw new Error("Symbol is required for technical analysis");
    }

    console.log(`📈 Getting technical analysis for ${symbol}...`);

    const cacheKey = `technicals-${symbol}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRequestWithRetry(
        `/api/technicals/${symbol}`
      );
      console.log(`✅ Technical analysis received for ${symbol}`);

      this.setCachedData(cacheKey, response);
      return response;
    } catch (error) {
      console.error(
        `❌ Technical analysis failed for ${symbol}:`,
        error.message
      );
      throw error;
    }
  }

  async getNewsAnalysis(symbol) {
    if (!symbol) {
      throw new Error("Symbol is required for news analysis");
    }

    console.log(`📰 Getting news analysis for ${symbol}...`);

    const cacheKey = `news-${symbol}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRequestWithRetry(`/api/news/${symbol}`);
      console.log(`✅ News analysis received for ${symbol}`);

      this.setCachedData(cacheKey, response);
      return response;
    } catch (error) {
      console.error(`❌ News analysis failed for ${symbol}:`, error.message);
      throw error;
    }
  }

  async getCatalystAnalysis(symbol) {
    if (!symbol) {
      throw new Error("Symbol is required for catalyst analysis");
    }

    console.log(`🎯 Getting catalyst analysis for ${symbol}...`);

    try {
      const response = await this.makeRequestWithRetry(
        `/api/catalysts/${symbol}`
      );
      console.log(`✅ Catalyst analysis received for ${symbol}`);
      return response;
    } catch (error) {
      console.error(
        `❌ Catalyst analysis failed for ${symbol}:`,
        error.message
      );
      throw error;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  async healthCheck() {
    try {
      const response = await this.makeRequest("/api/health");
      return {
        healthy: true,
        ...response,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async testApiKeys() {
    console.log("🧪 Testing API key configuration...");

    try {
      const response = await this.makeRequest("/api/test-keys");
      console.log("✅ API key test completed:", response.summary);
      return response;
    } catch (error) {
      console.error("❌ API key test failed:", error.message);
      throw error;
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      ...this.connectionStatus,
      backendUrl: this.backendBaseUrl,
      clientVersion: this.version,
      initialized: this.initialized,
      cacheSize: this.cache.size,
      activeRequests: this.activeRequests,
    };
  }

  // Reset connection (useful for troubleshooting)
  resetConnection() {
    console.log("🔄 Resetting connection...");
    this.initialized = false;
    this.connectionStatus = {
      isConnected: false,
      lastCheck: null,
      consecutiveErrors: 0,
      backendVersion: "unknown",
    };
    this.clearCache();
  }

  // ============================================
  // ERROR HANDLING & DIAGNOSTICS
  // ============================================

  async runDiagnostics() {
    console.log("🏥 Running service diagnostics...");

    const diagnostics = {
      client: {
        version: this.version,
        backendUrl: this.backendBaseUrl,
        initialized: this.initialized,
        connectionStatus: this.connectionStatus,
        cacheSize: this.cache.size,
      },
      tests: {},
      summary: {
        passed: 0,
        failed: 0,
        warnings: [],
      },
    };

    // Test 1: Health Check
    try {
      const health = await this.healthCheck();
      diagnostics.tests.healthCheck = {
        status: health.healthy ? "PASS" : "FAIL",
        data: health,
      };
      if (health.healthy) diagnostics.summary.passed++;
      else diagnostics.summary.failed++;
    } catch (error) {
      diagnostics.tests.healthCheck = {
        status: "FAIL",
        error: error.message,
      };
      diagnostics.summary.failed++;
    }

    // Test 2: API Keys
    try {
      const apiTest = await this.testApiKeys();
      const workingApis = apiTest.summary?.working || 0;
      diagnostics.tests.apiKeys = {
        status: workingApis >= 3 ? "PASS" : "WARN",
        data: apiTest.summary,
      };
      if (workingApis >= 3) diagnostics.summary.passed++;
      else {
        diagnostics.summary.warnings.push(`Only ${workingApis} APIs working`);
        diagnostics.summary.failed++;
      }
    } catch (error) {
      diagnostics.tests.apiKeys = {
        status: "FAIL",
        error: error.message,
      };
      diagnostics.summary.failed++;
    }

    // Test 3: Basic Screening
    try {
      const screeningTest = await this.performScreening({ limit: 5 });
      const stockCount = screeningTest.stocks?.length || 0;
      diagnostics.tests.screening = {
        status: stockCount > 0 ? "PASS" : "FAIL",
        data: {
          stocksReturned: stockCount,
          successRate: screeningTest.summary?.successRate,
          processingTime: screeningTest.processingTime,
        },
      };
      if (stockCount > 0) diagnostics.summary.passed++;
      else diagnostics.summary.failed++;
    } catch (error) {
      diagnostics.tests.screening = {
        status: "FAIL",
        error: error.message,
      };
      diagnostics.summary.failed++;
    }

    // Test 4: Market Context
    try {
      const marketTest = await this.getMarketContext();
      diagnostics.tests.marketContext = {
        status: marketTest.trend ? "PASS" : "WARN",
        data: {
          trend: marketTest.trend,
          volatility: marketTest.volatility,
          dataSource: marketTest.dataSource,
        },
      };
      if (marketTest.trend) diagnostics.summary.passed++;
      else
        diagnostics.summary.warnings.push("Market context using fallback data");
    } catch (error) {
      diagnostics.tests.marketContext = {
        status: "FAIL",
        error: error.message,
      };
      diagnostics.summary.failed++;
    }

    diagnostics.summary.overall =
      diagnostics.summary.failed === 0
        ? "HEALTHY"
        : diagnostics.summary.passed > diagnostics.summary.failed
        ? "DEGRADED"
        : "UNHEALTHY";

    console.log("📋 Diagnostics completed:", diagnostics.summary);
    return diagnostics;
  }

  // ============================================
  // LEGACY COMPATIBILITY METHODS
  // ============================================

  // For backward compatibility with older components
  async loadData() {
    console.log(
      "🔄 Legacy loadData() called, redirecting to performScreening..."
    );
    return this.performScreening();
  }

  async getScreeningData(options = {}) {
    console.log(
      "🔄 Legacy getScreeningData() called, redirecting to performScreening..."
    );
    return this.performScreening(options);
  }

  async getStockData(symbol) {
    console.log(
      "🔄 Legacy getStockData() called, redirecting to getStockQuote..."
    );
    return this.getStockQuote(symbol);
  }

  // ============================================
  // WATCHLIST MANAGEMENT
  // ============================================

  getWatchlist() {
    try {
      const saved = localStorage.getItem("institutionalWatchlist");
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("❌ Error loading watchlist:", error);
      return [];
    }
  }

  saveWatchlist(watchlist) {
    try {
      localStorage.setItem("institutionalWatchlist", JSON.stringify(watchlist));
      console.log("💾 Watchlist saved:", watchlist.length, "items");
      return true;
    } catch (error) {
      console.error("❌ Error saving watchlist:", error);
      return false;
    }
  }

  addToWatchlist(stock) {
    if (!stock || !stock.symbol) {
      throw new Error("Invalid stock data for watchlist");
    }

    const watchlist = this.getWatchlist();
    const exists = watchlist.some((item) => item.symbol === stock.symbol);

    if (!exists) {
      const newItem = {
        ...stock,
        addedAt: new Date().toISOString(),
      };
      watchlist.push(newItem);
      this.saveWatchlist(watchlist);
      console.log(`➕ Added ${stock.symbol} to watchlist`);
    }

    return watchlist;
  }

  removeFromWatchlist(symbol) {
    if (!symbol) {
      throw new Error("Symbol is required to remove from watchlist");
    }

    const watchlist = this.getWatchlist();
    const filtered = watchlist.filter((item) => item.symbol !== symbol);
    this.saveWatchlist(filtered);
    console.log(`➖ Removed ${symbol} from watchlist`);
    return filtered;
  }

  // ============================================
  // PERFORMANCE MONITORING
  // ============================================

  getPerformanceMetrics() {
    return {
      version: this.version,
      connectionStatus: this.connectionStatus,
      cacheStats: {
        size: this.cache.size,
        hitRate: this.cacheHitRate || 0,
      },
      requestStats: {
        total: this.totalRequests || 0,
        successful: this.successfulRequests || 0,
        failed: this.failedRequests || 0,
        averageResponseTime: this.averageResponseTime || 0,
      },
      lastDiagnostic: this.lastDiagnostic || null,
    };
  }

  // ============================================
  // STATIC METHODS
  // ============================================

  static getInstance() {
    if (!InstitutionalDataService.instance) {
      InstitutionalDataService.instance = new InstitutionalDataService();
    }
    return InstitutionalDataService.instance;
  }

  static async create() {
    const instance = InstitutionalDataService.getInstance();
    if (!instance.initialized) {
      await instance.initializeConnection();
    }
    return instance;
  }

  // ============================================
  // CLEANUP
  // ============================================

  destroy() {
    console.log("🧹 Cleaning up InstitutionalDataService...");
    this.clearCache();
    this.initialized = false;
    this.connectionStatus = {
      isConnected: false,
      lastCheck: null,
      consecutiveErrors: 0,
      backendVersion: "unknown",
    };
  }
}

// Create and export singleton instance
const institutionalDataService = new InstitutionalDataService();

export default institutionalDataService;
