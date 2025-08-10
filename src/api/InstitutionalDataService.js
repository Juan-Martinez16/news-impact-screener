// src/api/InstitutionalDataService.js
// Version 4.0.1 - FIXED BACKEND CONNECTION
// This version directly connects to the working Render backend

class InstitutionalDataService {
  constructor() {
    this.version = "4.0.1-fixed";
    this.cache = new Map();
    this.initialized = false;

    // CRITICAL FIX: Use the working backend URL directly
    // Environment variable as fallback only
    this.backendBaseUrl =
      process.env.REACT_APP_BACKEND_URL ||
      "https://news-impact-screener-backend.onrender.com";

    // Log immediately to verify correct URL
    console.log("🚀 InstitutionalDataService v4.0.1 initializing");
    console.log("🔗 Backend URL:", this.backendBaseUrl);
    console.log("📍 Environment:", process.env.NODE_ENV);

    this.cacheTTL = {
      quotes: 60000,
      news: 180000,
      technicals: 300000,
      screening: 120000,
      health: 30000,
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
    this.backendAvailable = false;

    // Start connection test immediately
    this.testConnection();
  }

  async testConnection() {
    console.log("🔍 Testing backend connection...");
    try {
      const health = await this.checkBackendHealth();
      if (health && health.status === "OK") {
        this.backendAvailable = true;
        this.initialized = true;
        console.log("✅ Backend connected successfully:", health.version);
        console.log(
          "✅ APIs available:",
          Object.keys(health.apis || {}).filter((api) => health.apis[api])
        );
        return true;
      }
    } catch (error) {
      console.error("❌ Backend connection test failed:", error.message);
      this.backendAvailable = false;
    }
    return false;
  }

  async makeApiCall(endpoint, options = {}) {
    const maxRetries = 3;
    let attempt = 0;

    this.requestCount++;
    this.lastRequestTime = Date.now();

    while (attempt < maxRetries) {
      try {
        const url = `${this.backendBaseUrl}${endpoint}`;
        console.log(
          `📡 API Call (attempt ${attempt + 1}/${maxRetries}): ${url}`
        );

        const requestOptions = {
          method: options.method || "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Client-Version": this.version,
            ...options.headers,
          },
          mode: "cors",
          cache: "no-cache",
          ...options,
        };

        const response = await fetch(url, requestOptions);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ API Error ${response.status}:`, errorText);

          if (response.status === 404) {
            throw new Error(`Endpoint not found: ${endpoint}`);
          }
          if (response.status >= 500) {
            throw new Error(`Server error: ${response.status}`);
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ API Success: ${endpoint}`);

        // Mark backend as available if we get a successful response
        if (!this.backendAvailable) {
          this.backendAvailable = true;
          console.log("✅ Backend connection restored");
        }

        return data;
      } catch (error) {
        attempt++;
        console.error(`❌ API attempt ${attempt} failed:`, error.message);

        if (attempt >= maxRetries) {
          this.backendAvailable = false;
          throw error;
        }

        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // HEALTH CHECK
  async checkBackendHealth() {
    try {
      const cached = this.getFromCache("health", this.cacheTTL.health);
      if (cached) return cached;

      const data = await this.makeApiCall(this.endpoints.health, {
        method: "GET",
      });

      this.saveToCache("health", data);
      return data;
    } catch (error) {
      console.error("Health check failed:", error);
      return null;
    }
  }

  // MAIN SCREENING METHOD - With better error handling
  async screenAllStocks() {
    console.log("🎯 Starting enhanced stock screening v4.0.1...");

    // Check if backend is available
    if (!this.backendAvailable) {
      console.log("⏳ Backend not ready, testing connection...");
      const connected = await this.testConnection();
      if (!connected) {
        console.error("❌ Cannot screen stocks - backend unavailable");
        throw new Error(
          "Backend service is currently unavailable. Please try again in a moment."
        );
      }
    }

    try {
      const cached = this.getFromCache("screening", this.cacheTTL.screening);
      if (cached) {
        console.log("📦 Returning cached screening data");
        return cached;
      }

      console.log("🔄 Fetching fresh screening data from backend...");
      const startTime = Date.now();

      const data = await this.makeApiCall(this.endpoints.screening, {
        method: "GET",
        timeout: 30000, // 30 second timeout for screening
      });

      const processingTime = Date.now() - startTime;
      console.log(`✅ Screening completed in ${processingTime}ms`);
      console.log(`📊 Stocks processed: ${data.summary?.totalProcessed || 0}`);
      console.log(`📈 Success rate: ${data.summary?.successRate || 0}%`);

      this.saveToCache("screening", data);
      return data;
    } catch (error) {
      console.error("❌ Screening failed:", error);

      // Provide more helpful error messages
      if (error.message.includes("404")) {
        throw new Error(
          "Screening endpoint not available. Please ensure backend is updated."
        );
      }
      if (error.message.includes("timeout")) {
        throw new Error(
          "Screening request timed out. The backend may be processing too many requests."
        );
      }
      if (error.message.includes("unavailable")) {
        throw new Error(
          "Backend service is temporarily unavailable. Please try again."
        );
      }

      throw error;
    }
  }

  // MARKET CONTEXT
  async getMarketContext() {
    try {
      const cached = this.getFromCache(
        "marketContext",
        this.cacheTTL.marketContext
      );
      if (cached) return cached;

      const data = await this.makeApiCall(this.endpoints.marketContext);
      this.saveToCache("marketContext", data);
      return data;
    } catch (error) {
      console.error("Market context fetch failed:", error);
      throw error;
    }
  }

  // INDIVIDUAL QUOTE
  async getQuote(symbol) {
    if (!symbol) throw new Error("Symbol is required");

    const cacheKey = `quote_${symbol}`;
    const cached = this.getFromCache(cacheKey, this.cacheTTL.quotes);
    if (cached) return cached;

    try {
      const data = await this.makeApiCall(`${this.endpoints.quotes}/${symbol}`);
      this.saveToCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Quote fetch failed for ${symbol}:`, error);
      throw error;
    }
  }

  // BATCH QUOTES
  async getBatchQuotes(symbols) {
    if (!symbols || symbols.length === 0) {
      throw new Error("Symbols array is required");
    }

    const symbolsStr = symbols.join(",");
    const cacheKey = `batch_${symbolsStr}`;
    const cached = this.getFromCache(cacheKey, this.cacheTTL.batch);
    if (cached) return cached;

    try {
      const data = await this.makeApiCall(
        `${this.endpoints.batchQuotes}/${symbolsStr}`
      );
      this.saveToCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Batch quotes failed for ${symbolsStr}:`, error);
      throw error;
    }
  }

  // NEWS
  async getNews(symbol) {
    if (!symbol) throw new Error("Symbol is required");

    const cacheKey = `news_${symbol}`;
    const cached = this.getFromCache(cacheKey, this.cacheTTL.news);
    if (cached) return cached;

    try {
      const data = await this.makeApiCall(`${this.endpoints.news}/${symbol}`);
      this.saveToCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`News fetch failed for ${symbol}:`, error);
      throw error;
    }
  }

  // TECHNICALS
  async getTechnicals(symbol) {
    if (!symbol) throw new Error("Symbol is required");

    const cacheKey = `technicals_${symbol}`;
    const cached = this.getFromCache(cacheKey, this.cacheTTL.technicals);
    if (cached) return cached;

    try {
      const data = await this.makeApiCall(
        `${this.endpoints.technicals}/${symbol}`
      );
      this.saveToCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Technicals fetch failed for ${symbol}:`, error);
      throw error;
    }
  }

  // TEST API KEYS
  async testApiKeys() {
    try {
      const data = await this.makeApiCall(this.endpoints.testKeys);
      console.log("🔑 API Key Test Results:", data);
      return data;
    } catch (error) {
      console.error("API key test failed:", error);
      throw error;
    }
  }

  // CACHE MANAGEMENT
  saveToCache(key, data) {
    try {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
      });

      // Limit cache size
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
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 Cache cleared (${size} entries)`);
  }

  // DEBUGGING HELPERS
  getDebugInfo() {
    return {
      version: this.version,
      initialized: this.initialized,
      backendAvailable: this.backendAvailable,
      backendUrl: this.backendBaseUrl,
      cacheSize: this.cache.size,
      requestCount: this.requestCount,
      lastRequestTime: new Date(this.lastRequestTime).toISOString(),
      environment: process.env.NODE_ENV,
      expectedFeatures: [
        "46+ stock processing",
        "Sub-15 second response time",
        "6 API integration",
        "Smart failover",
        "Batch processing",
      ],
    };
  }

  async getHealthReport() {
    try {
      const health = await this.checkBackendHealth();
      return {
        service: "InstitutionalDataService",
        version: this.version,
        status: this.backendAvailable ? "HEALTHY" : "DEGRADED",
        backend: {
          url: this.backendBaseUrl,
          available: this.backendAvailable,
          health: health,
        },
        cache: {
          size: this.cache.size,
          maxSize: 1000,
        },
        performance: {
          requestCount: this.requestCount,
          lastRequest: new Date(this.lastRequestTime).toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: "InstitutionalDataService",
        version: this.version,
        status: "ERROR",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Create and export singleton instance
const institutionalDataService = new InstitutionalDataService();

// Make it available globally for debugging in browser console
if (typeof window !== "undefined") {
  window._dataService = institutionalDataService;
  console.log(
    "💡 Debug helper: Access service via window._dataService in console"
  );
}

export default institutionalDataService;
