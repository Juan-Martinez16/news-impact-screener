// src/api/InstitutionalDataService.js - v4.1.0-fixed
// COMPLETE REPLACEMENT - Fixed timeout and error handling

class InstitutionalDataService {
  constructor() {
    this.version = "4.1.0-fixed";
    this.cache = new Map();
    this.initialized = false;
    this.initializing = false;

    // FIXED: Environment variable detection with better fallback
    this.backendBaseUrl = this.detectBackendUrl();

    console.log(`🚀 InstitutionalDataService v${this.version} initializing...`);
    console.log("🌍 Environment:", process.env.NODE_ENV || "development");
    console.log("🔗 Backend URL:", this.backendBaseUrl);

    // FIXED: More aggressive cache settings for development
    this.cacheTTL = {
      quotes: 30000, // 30 seconds (reduced)
      news: 120000, // 2 minutes
      technicals: 180000, // 3 minutes
      screening: 60000, // 1 minute (reduced)
      health: 30000, // 30 seconds
      marketContext: 30000, // 30 seconds
    };

    // Request tracking
    this.requestCount = 0;
    this.lastRequestTime = Date.now();
    this.consecutiveErrors = 0;
    this.maxRetries = 3;
  }

  detectBackendUrl() {
    // Check multiple possible environment variable names
    const possibleUrls = [
      process.env.REACT_APP_BACKEND_URL,
      process.env.REACT_APP_API_URL,
      process.env.BACKEND_URL,
      process.env.API_URL,
    ].filter(Boolean);

    if (possibleUrls.length > 0) {
      const url = possibleUrls[0];
      console.log(`✅ Found environment URL: ${url}`);
      return url;
    }

    // Development fallback
    if (process.env.NODE_ENV === "development") {
      console.log("🔧 Using development fallback URL");
      return "http://localhost:3001";
    }

    // Production fallback
    console.log("🌐 Using production fallback URL");
    return "https://news-impact-screener-backend.onrender.com";
  }

  async ensureInitialized() {
    if (this.initialized) return true;

    if (this.initializing) {
      // Wait for existing initialization
      let attempts = 0;
      while (this.initializing && attempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }
      return this.initialized;
    }

    this.initializing = true;
    console.log("🔗 Initializing connection to backend:", this.backendBaseUrl);

    try {
      const response = await this.makeApiCall("/api/health", {
        timeout: 10000, // Reduced timeout
        retries: 2,
      });

      if (response && response.version) {
        this.initialized = true;
        this.consecutiveErrors = 0;
        console.log(`✅ Backend connected successfully: ${response.version}`);
        console.log(`📊 APIs available: ${response.summary?.totalApis || 0}`);
        return true;
      } else {
        throw new Error("Invalid health response structure");
      }
    } catch (error) {
      console.error("❌ Backend initialization failed:", error.message);
      this.consecutiveErrors++;
      return false;
    } finally {
      this.initializing = false;
    }
  }

  async makeApiCall(endpoint, options = {}) {
    const url = this.backendBaseUrl + endpoint;
    const timeout = options.timeout || 15000; // Reduced default timeout
    const retries = options.retries || this.maxRetries;
    const method = options.method || "GET";

    console.log(`🌐 Fetch to: ${url}`);

    for (let attempt = 1; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Request timeout after ${timeout}ms`);
        controller.abort();
      }, timeout);

      try {
        const requestOptions = {
          method,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Client-Version": this.version,
            "Cache-Control": "no-cache",
            "User-Agent": `NewsImpactScreener/${this.version}`,
          },
          signal: controller.signal,
          credentials: "omit", // FIXED: Explicit credentials setting
        };

        if (method !== "GET" && options.body) {
          requestOptions.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        console.log(`📡 Response: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.warn("⚠️ Non-JSON response:", text.substring(0, 200));
          throw new Error("Server returned non-JSON response");
        }

        const data = await response.json();
        this.consecutiveErrors = 0; // Reset error count on success

        return data;
      } catch (error) {
        clearTimeout(timeoutId);

        this.consecutiveErrors++;

        if (error.name === "AbortError") {
          console.warn(`⏰ Request aborted (attempt ${attempt}/${retries})`);
        } else {
          console.warn(
            `❌ API call failed (attempt ${attempt}/${retries}):`,
            error.message
          );
        }

        // Don't retry on abort errors or if this is the last attempt
        if (error.name === "AbortError" || attempt === retries) {
          throw new Error(
            `API call failed after ${attempt} attempts: ${error.message}`
          );
        }

        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`🔄 Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Cache management with TTL
  getCachedData(key, ttl = 60000) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const { data, timestamp } = cached;
    const age = Date.now() - timestamp;

    if (age > ttl) {
      this.cache.delete(key);
      return null;
    }

    console.log(`📦 Cache hit for ${key} (age: ${Math.round(age / 1000)}s)`);
    return data;
  }

  setCachedData(key, data, ttl = 60000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Clean old cache entries occasionally
    if (Math.random() < 0.1) {
      this.cleanCache();
    }
  }

  cleanCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  // FIXED: Enhanced stock screening with better error handling
  async getStockScreening(options = {}) {
    const cacheKey = `screening_${JSON.stringify(options)}`;

    // Check cache first
    const cached = this.getCachedData(cacheKey, this.cacheTTL.screening);
    if (cached && !options.forceRefresh) {
      console.log("📦 Returning cached screening results");
      return cached;
    }

    try {
      console.log("🔍 Starting stock screening with options:", options);

      // Ensure backend is initialized
      const initialized = await this.ensureInitialized();
      if (!initialized) {
        throw new Error("Backend service unavailable");
      }

      // Make the screening request with longer timeout
      const response = await this.makeApiCall("/api/screening", {
        timeout: 45000, // 45 second timeout for screening
        retries: 2, // Fewer retries but longer timeout
      });

      if (!response) {
        throw new Error("Empty response from screening API");
      }

      // Validate response structure
      if (!response.summary && !response.stocks && !response.results) {
        console.warn(
          "⚠️ Unexpected response structure:",
          Object.keys(response)
        );
        throw new Error("Invalid response structure from screening API");
      }

      // Normalize response format (handle both 'stocks' and 'results' arrays)
      const normalizedResponse = {
        summary: response.summary || {
          totalProcessed: 0,
          successRate: 0,
          timestamp: new Date().toISOString(),
        },
        stocks: response.stocks || response.results || [],
        performance: response.performance || {},
        metadata: response.metadata || {},
        errors: response.errors || [],
      };

      // Additional validation
      if (!Array.isArray(normalizedResponse.stocks)) {
        throw new Error("Stocks data is not an array");
      }

      console.log(
        `✅ Screening completed: ${normalizedResponse.stocks.length} stocks returned`
      );

      // Cache the results
      this.setCachedData(cacheKey, normalizedResponse, this.cacheTTL.screening);

      return normalizedResponse;
    } catch (error) {
      console.error("❌ Stock screening failed:", error.message);

      // Return cached data if available and error is network-related
      if (
        error.message.includes("timeout") ||
        error.message.includes("aborted")
      ) {
        const staleCache = this.cache.get(cacheKey);
        if (staleCache) {
          console.log("🔄 Returning stale cache due to timeout");
          return staleCache.data;
        }
      }

      throw error;
    }
  }

  // Market context with caching
  async getMarketContext() {
    const cacheKey = "market_context";

    const cached = this.getCachedData(cacheKey, this.cacheTTL.marketContext);
    if (cached) return cached;

    try {
      console.log("📈 Loading market context...");

      const response = await this.makeApiCall("/api/market-context", {
        timeout: 10000,
        retries: 2,
      });

      if (!response) {
        throw new Error("Empty market context response");
      }

      console.log("✅ Market context loaded:", response);
      this.setCachedData(cacheKey, response, this.cacheTTL.marketContext);

      return response;
    } catch (error) {
      console.error("❌ Market context failed:", error.message);

      // Return sensible defaults
      return {
        volatility: "NORMAL",
        trend: "NEUTRAL",
        breadth: "MIXED",
        spyChange: 0,
        vix: 20,
        lastUpdate: new Date().toISOString(),
        dataSource: "FALLBACK",
        error: error.message,
      };
    }
  }

  // Connection testing utility
  async testConnection() {
    console.log("🔌 Testing connection to backend...");

    try {
      const startTime = Date.now();
      const health = await this.makeApiCall("/api/health", {
        timeout: 8000,
        retries: 1,
      });
      const connectionTime = Date.now() - startTime;

      console.log(`✅ Connection test passed in ${connectionTime}ms`);
      return {
        success: true,
        connectionTime,
        version: health.version,
        apis: Object.keys(health.apis || {}).length,
        status: health.status,
      };
    } catch (error) {
      console.error("❌ Connection test failed:", error.message);
      return {
        success: false,
        error: error.message,
        connectionTime: null,
      };
    }
  }

  // Service status and diagnostics
  getServiceStatus() {
    return {
      version: this.version,
      initialized: this.initialized,
      backendUrl: this.backendBaseUrl,
      cacheSize: this.cache.size,
      consecutiveErrors: this.consecutiveErrors,
      lastRequestTime: this.lastRequestTime,
      requestCount: this.requestCount,
    };
  }

  // Debug helper for development
  async debugScreeningResponse() {
    if (process.env.NODE_ENV !== "development") {
      console.warn("Debug method only available in development");
      return null;
    }

    try {
      console.log("🐛 === SCREENING DEBUG SESSION ===");

      // Test connection first
      const connectionTest = await this.testConnection();
      console.log("🔌 Connection test:", connectionTest);

      if (!connectionTest.success) {
        console.log("❌ Connection failed, aborting debug");
        return null;
      }

      // Make direct API call
      const response = await this.makeApiCall("/api/screening", {
        timeout: 30000,
        retries: 1,
      });

      console.log("📊 Response type:", typeof response);
      console.log("📊 Response keys:", Object.keys(response || {}));

      if (response?.stocks) {
        console.log("📈 Stocks array length:", response.stocks.length);
        console.log("📈 First stock sample:", response.stocks[0]);
      }

      if (response?.results) {
        console.log("📈 Results array length:", response.results.length);
        console.log("📈 First result sample:", response.results[0]);
      }

      console.log("🐛 === END DEBUG SESSION ===");
      return response;
    } catch (error) {
      console.error("🐛 Debug session failed:", error);
      return null;
    }
  }

  // Clear all caches
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 Cleared ${size} cache entries`);
  }

  // Reset service state
  reset() {
    this.initialized = false;
    this.initializing = false;
    this.consecutiveErrors = 0;
    this.clearCache();
    console.log("🔄 Service state reset");
  }
}

// Create and export singleton instance
const institutionalDataService = new InstitutionalDataService();

// Development helpers
if (process.env.NODE_ENV === "development") {
  window._dataService = institutionalDataService;
  console.log("🐛 Debug helper available: window._dataService");
  console.log("   Commands:");
  console.log("   • window._dataService.testConnection()");
  console.log("   • window._dataService.debugScreeningResponse()");
  console.log("   • window._dataService.getServiceStatus()");
  console.log("   • window._dataService.clearCache()");
}

export default institutionalDataService;
