// src/api/InstitutionalDataService.js - LAZY INITIALIZATION VERSION
// Delays backend connection until actually needed (like connection test)

class InstitutionalDataService {
  constructor() {
    this.version = "4.0.0-multi-api";
    this.cache = new Map();
    this.initialized = false;
    this.initializing = false;

    // Direct connection to working backend
    this.backendBaseUrl = "https://news-impact-screener-backend.onrender.com";

    this.cacheTTL = {
      quotes: 60000,
      news: 180000,
      technicals: 300000,
      screening: 120000,
      health: 60000,
      marketContext: 60000,
      batch: 30000,
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

    console.log("🚀 InstitutionalDataService v4.0.0 created (LAZY INIT)");
    console.log("🔗 Backend URL:", this.backendBaseUrl);
    console.log("⏳ Will initialize on first API call");

    // DO NOT initialize in constructor - wait for first API call
  }

  async ensureInitialized() {
    // Return immediately if already initialized
    if (this.initialized) return true;

    // Prevent multiple simultaneous initialization attempts
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
        "🔗 Lazy initializing connection to backend:",
        this.backendBaseUrl
      );
      await this.checkBackendHealth();
      this.initialized = true;
      console.log(
        "✅ InstitutionalDataService v4.0.0 lazy initialized - BACKEND READY"
      );
      return true;
    } catch (error) {
      console.error("❌ Lazy initialization failed:", error);
      return false;
    } finally {
      this.initializing = false;
    }
  }

  async makeApiCall(endpoint, options = {}) {
    // Try to ensure initialization before making API call
    const initSuccess = await this.ensureInitialized();
    if (!initSuccess) {
      console.warn(
        "⚠️ Backend not initialized, attempting direct call anyway..."
      );
    }

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
            "X-Client-Version": "4.0.0",
            "Cache-Control": "no-cache",
            ...options.headers,
          },
          mode: "cors",
          cache: "no-cache",
          credentials: "omit", // Don't send cookies
          ...options,
        };

        const response = await fetch(url, requestOptions);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ API Success: ${endpoint}`);

        // Mark as initialized if this call succeeded
        if (!this.initialized) {
          this.initialized = true;
          console.log(
            "✅ Backend connection confirmed via successful API call"
          );
        }

        return data;
      } catch (error) {
        attempt++;
        console.warn(
          `⚠️ API attempt ${attempt} failed for ${endpoint}:`,
          error.message
        );

        if (attempt >= maxRetries) {
          console.error(
            `❌ API call failed after ${maxRetries} attempts:`,
            error
          );
          throw new Error(`Backend API unreachable: ${error.message}`);
        }

        // Progressive delay
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  async checkBackendHealth() {
    try {
      const response = await this.makeApiCall(this.endpoints.health);
      console.log("🏥 Backend Health v4.0.0:", response);

      if (response.status === "OK") {
        console.log("✅ Backend health confirmed");
        return response;
      } else {
        throw new Error("Backend health check failed - invalid response");
      }
    } catch (error) {
      console.error("❌ Backend health check failed:", error);
      throw new Error(`Backend unavailable: ${error.message}`);
    }
  }

  // SCREENING METHOD - Most important for your app
  async getEnhancedScreening(options = {}) {
    const cacheKey = `screening-v4-${JSON.stringify(options)}`;

    const cached = this.getFromCache(cacheKey, this.cacheTTL.screening);
    if (cached) {
      console.log("📋 Using cached screening results");
      return cached;
    }

    try {
      console.log("🔍 Starting enhanced screening...");
      const startTime = Date.now();

      // Direct API call - will trigger lazy initialization
      const response = await this.makeApiCall(this.endpoints.screening);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Screening completed in ${processingTime}ms`);
      console.log(
        `📊 Processed: ${response.summary?.totalProcessed || 0} stocks`
      );
      console.log(`📈 Success rate: ${response.summary?.successRate || 0}%`);

      this.setCache(cacheKey, response, this.cacheTTL.screening);
      return response;
    } catch (error) {
      console.error("❌ Screening failed:", error);

      // Return fallback data to prevent app crash
      return {
        results: [],
        summary: {
          totalProcessed: 0,
          successRate: 0,
          errors: [error.message],
        },
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getBatchQuotes(symbols) {
    if (!symbols || symbols.length === 0) {
      return { quotes: [], source: "none" };
    }

    try {
      console.log(`📦 Fetching batch quotes for ${symbols.length} symbols...`);
      const response = await this.makeApiCall(
        `${this.endpoints.batchQuotes}/${symbols.join(",")}`
      );
      return response;
    } catch (error) {
      console.error("❌ Batch quotes failed:", error);
      // Return empty quotes to prevent crash
      return { quotes: [], source: "error", error: error.message };
    }
  }

  async getMarketContext() {
    try {
      const response = await this.makeApiCall(this.endpoints.marketContext);
      return response;
    } catch (error) {
      console.error("❌ Market context failed:", error);
      // Return fallback market context
      return {
        summary: {
          volatility: "UNKNOWN",
          trend: "NEUTRAL",
          breadth: "MIXED",
        },
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // CACHE MANAGEMENT
  setCache(key, data, ttl) {
    try {
      this.cache.set(key, {
        data: data,
        timestamp: Date.now(),
        version: this.version,
        ttl: ttl,
      });

      // Prevent cache from growing too large
      if (this.cache.size > 1000) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
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
      const size = this.cache.size;
      this.cache.clear();
      console.log(`🧹 Cache cleared (${size} entries)`);
    } catch (error) {
      console.warn("Cache clear failed:", error);
    }
  }

  // HEALTH REPORTING - Non-blocking
  async getHealthReport() {
    try {
      // Try to get health, but don't fail if backend is unreachable
      const backendHealth = await this.checkBackendHealth();
      return {
        overall: "HEALTHY",
        version: this.version,
        backend: backendHealth,
        cache: {
          size: this.cache.size,
          maxSize: 1000,
        },
        dataSource: "OPTIMIZED_BACKEND_v4.0.0",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(
        "Health report failed, returning degraded status:",
        error.message
      );
      return {
        overall: "DEGRADED",
        version: this.version,
        error: error.message,
        cache: {
          size: this.cache.size,
          maxSize: 1000,
        },
        dataSource: "UNAVAILABLE",
        timestamp: new Date().toISOString(),
      };
    }
  }

  // UTILITY METHODS
  formatError(error) {
    if (error.message.includes("Failed to fetch")) {
      return "Unable to connect to data service. Please check your internet connection.";
    }
    if (error.message.includes("404")) {
      return "Data not found for this request.";
    }
    if (error.message.includes("500")) {
      return "Data service is temporarily unavailable. Please try again.";
    }
    return error.message || "An unexpected error occurred.";
  }

  getDebugInfo() {
    return {
      version: this.version,
      initialized: this.initialized,
      initializing: this.initializing,
      backendUrl: this.backendBaseUrl,
      cacheSize: this.cache.size,
      requestCount: this.requestCount,
      lastRequestTime: new Date(this.lastRequestTime).toISOString(),
      expectedFeatures: [
        "Lazy initialization",
        "46+ stock processing",
        "~2 second response",
        "Graceful degradation",
      ],
    };
  }

  // MOCK FALLBACK - If backend completely fails
  getMockScreeningData() {
    console.log("🔄 Returning mock data as fallback");
    return {
      results: [
        {
          symbol: "AAPL",
          currentPrice: 150.0,
          changePercent: 2.1,
          nissScore: 7.5,
          dataSource: "mock",
        },
        {
          symbol: "MSFT",
          currentPrice: 280.0,
          changePercent: -1.2,
          nissScore: 6.8,
          dataSource: "mock",
        },
      ],
      summary: {
        totalProcessed: 2,
        successRate: 100,
        processingTime: 100,
        dataSource: "mock",
      },
      timestamp: new Date().toISOString(),
    };
  }
}

// Create and export singleton instance
const institutionalDataService = new InstitutionalDataService();

export default institutionalDataService;
