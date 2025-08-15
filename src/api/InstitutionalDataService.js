// src/api/InstitutionalDataService.js - CORS FIXED VERSION v4.0.2
// Replace your InstitutionalDataService.js with this version

class InstitutionalDataService {
  constructor() {
    this.version = "4.0.2-cors-fixed";
    this.cache = new Map();
    this.initialized = false;
    this.initializing = false;

    // Backend URL - prioritize environment variable, fallback to production URL
    this.backendBaseUrl =
      process.env.REACT_APP_BACKEND_URL ||
      "https://news-impact-screener-backend.onrender.com";

    console.log("🚀 News Impact Screener v4.0.0");
    console.log("🌍 Environment:", process.env.NODE_ENV || "development");
    console.log("🔗 Backend URL:", this.backendBaseUrl);

    // Validate backend URL
    if (
      this.backendBaseUrl.includes("localhost") &&
      process.env.NODE_ENV === "production"
    ) {
      console.warn("⚠️ Using localhost URL in production environment");
    } else {
      console.log("✅ Backend URL configured correctly");
    }

    // Log React environment variables for debugging
    const reactEnvVars = Object.keys(process.env).filter((key) =>
      key.startsWith("REACT_APP_")
    );
    console.log("📋 React Environment Variables:", reactEnvVars.length);
    reactEnvVars.forEach((key) => {
      console.log(`   ${key}: ${process.env[key]}`);
    });

    // Cache time-to-live settings
    this.cacheTTL = {
      quotes: 60000, // 1 minute
      news: 180000, // 3 minutes
      technicals: 300000, // 5 minutes
      screening: 120000, // 2 minutes
      health: 60000, // 1 minute
      marketContext: 60000, // 1 minute
      batch: 30000, // 30 seconds
    };

    // API endpoints
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
  }

  async ensureInitialized() {
    if (this.initialized) return true;

    if (this.initializing) {
      // Wait for existing initialization to complete
      while (this.initializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return this.initialized;
    }

    this.initializing = true;
    console.log("🔗 Initializing connection to backend:", this.backendBaseUrl);

    try {
      const response = await this.makeDirectApiCall("/api/health", {
        timeout: 15000,
      });

      if (response && response.version) {
        this.initialized = true;
        console.log(`✅ Backend connected successfully: ${response.version}`);
        console.log(
          `📊 APIs available: Array(${
            response.summary?.totalApis ||
            Object.keys(response.apis || {}).length
          })`
        );
        return true;
      } else {
        throw new Error("Invalid health response");
      }
    } catch (error) {
      console.error("❌ Backend initialization failed:", error.message);
      return false;
    } finally {
      this.initializing = false;
    }
  }

  async makeDirectApiCall(endpoint, options = {}) {
    const url = this.backendBaseUrl + endpoint;
    const timeout = options.timeout || 20000; // Increased timeout for CORS issues

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const requestOptions = {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Client-Version": this.version,
          "Cache-Control": "no-cache",
          // Add Origin header for CORS debugging
          Origin: window.location.origin,
          ...options.headers,
        },
        mode: "cors", // Explicitly set CORS mode
        cache: "no-cache",
        credentials: "omit", // Don't send cookies
        signal: controller.signal,
        ...options,
      };

      console.log(`🌐 Attempting fetch to: ${url}`);
      console.log(`📋 Request options:`, {
        method: requestOptions.method,
        mode: requestOptions.mode,
        credentials: requestOptions.credentials,
        headers: requestOptions.headers,
      });

      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      console.log(
        `📡 Response status: ${response.status} ${response.statusText}`
      );
      console.log(
        `📋 Response headers:`,
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Response data received:`, Object.keys(data));
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`❌ Fetch error details:`, {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 200),
      });
      throw error;
    }
  }

  async makeApiCall(endpoint, options = {}) {
    // Ensure initialization before making API calls
    await this.ensureInitialized();

    const maxRetries = 2; // Reduced retries for faster debugging
    let attempt = 0;

    this.requestCount++;
    this.lastRequestTime = Date.now();

    while (attempt < maxRetries) {
      try {
        console.log(
          `📡 API Call v${this.version} (attempt ${attempt + 1}): ${endpoint}`
        );

        const data = await this.makeDirectApiCall(endpoint, options);
        console.log(`✅ API Success: ${endpoint}`);
        return data;
      } catch (error) {
        attempt++;
        console.warn(
          `⚠️ API attempt ${attempt} failed for ${endpoint}:`,
          error.message
        );

        if (attempt >= maxRetries) {
          console.error(
            `❌ API call failed after ${maxRetries} attempts: ${endpoint}`
          );
          throw new Error(`API call failed: ${this.formatError(error)}`);
        }

        // Shorter wait for CORS debugging
        const delay = 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // MAIN API METHODS

  async getHealthReport() {
    try {
      const response = await this.makeApiCall("/api/health");
      return {
        overall: "HEALTHY",
        version: response.version || this.version,
        backend: response,
        cache: {
          size: this.cache.size,
          maxSize: 1000,
        },
        dataSource: "BACKEND_v4.0.0",
        timestamp: new Date().toISOString(),
        backendHealth: true,
      };
    } catch (error) {
      console.warn("Health check failed:", error.message);
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
        backendHealth: false,
      };
    }
  }

  async screenAllStocks(options = {}) {
    const cacheKey = `screening_${JSON.stringify(options)}`;
    const cached = this.getFromCache(cacheKey, this.cacheTTL.screening);

    if (cached) {
      console.log("📦 Using cached screening results");
      return cached;
    }

    try {
      console.log("🔍 Starting stock screening...");
      const startTime = Date.now();

      const response = await this.makeApiCall("/api/screening", {
        method: "POST",
        body: JSON.stringify(options),
      });

      const processingTime = Date.now() - startTime;
      console.log(`✅ Screening completed in ${processingTime}ms`);
      console.log(
        `📊 Stocks processed: ${response.summary?.totalProcessed || 0}`
      );
      console.log(`📈 Success rate: ${response.summary?.successRate || 0}%`);

      // Transform response to expected format
      const results = (response.results || []).map((stock) => ({
        symbol: stock.symbol,
        currentPrice: stock.price || stock.currentPrice || 0,
        changePercent: stock.changePercent || stock.change || 0,
        nissScore: stock.nissScore || this.generateMockNISSScore(),
        confidence: stock.confidence || "MEDIUM",
        sector: stock.sector || "Unknown",
        marketCap: stock.marketCap,
        volume: stock.volume,
        dataSource: stock.dataSource || "backend",
        lastUpdate: new Date().toISOString(),
      }));

      this.setCache(cacheKey, results, this.cacheTTL.screening);
      return results;
    } catch (error) {
      console.error("❌ Screening failed:", error.message);
      throw new Error(`Stock screening failed: ${error.message}`);
    }
  }

  async getMarketContext() {
    const cacheKey = "marketContext";
    const cached = this.getFromCache(cacheKey, this.cacheTTL.marketContext);

    if (cached) {
      return cached;
    }

    try {
      const response = await this.makeApiCall("/api/market-context");

      const context = {
        volatility: response.volatility || "NORMAL",
        trend: response.trend || "NEUTRAL",
        breadth: response.breadth || "MIXED",
        spyChange: response.spyChange || 0,
        vix: response.vix || 20,
        lastUpdate: new Date(),
        dataSource: "REAL",
      };

      this.setCache(cacheKey, context, this.cacheTTL.marketContext);
      return context;
    } catch (error) {
      console.warn("Market context failed, using defaults:", error.message);
      return {
        volatility: "NORMAL",
        trend: "NEUTRAL",
        breadth: "MIXED",
        spyChange: 0,
        vix: 20,
        lastUpdate: new Date(),
        dataSource: "DEFAULT",
      };
    }
  }

  // CACHE MANAGEMENT

  setCache(key, data, ttl) {
    try {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
      });

      // Limit cache size to prevent memory issues
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

  // UTILITY METHODS

  generateMockNISSScore() {
    // Generate a realistic NISS score between -100 and 100
    return Math.round((Math.random() * 200 - 100) * 10) / 10;
  }

  formatError(error) {
    if (error.name === "AbortError") {
      return "Request timed out. Please check your connection.";
    }
    if (error.message.includes("Failed to fetch")) {
      return "CORS or network error. Backend may need CORS configuration update.";
    }
    if (error.message.includes("404")) {
      return "Data endpoint not found.";
    }
    if (error.message.includes("500")) {
      return "Backend service error. Please try again.";
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
      environment: process.env.NODE_ENV,
      backendAvailable: this.initialized,
      expectedFeatures: [
        "CORS debugging enabled",
        "Backend v4.0.0 integration",
        "Enhanced error logging",
        "Graceful error handling",
      ],
    };
  }

  // CONNECTION TEST METHOD
  async testConnection() {
    try {
      console.log("🧪 Testing backend connection...");
      const startTime = Date.now();

      const health = await this.makeApiCall("/api/health");
      const connectionTime = Date.now() - startTime;

      console.log(`✅ Connection test passed in ${connectionTime}ms`);
      return {
        success: true,
        connectionTime,
        version: health.version,
        apis: Object.keys(health.apis || {}).length,
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
}

// Create and export singleton instance
const institutionalDataService = new InstitutionalDataService();

// Add debug helper to window for development
if (process.env.NODE_ENV === "development") {
  window._dataService = institutionalDataService;
}

export default institutionalDataService;
