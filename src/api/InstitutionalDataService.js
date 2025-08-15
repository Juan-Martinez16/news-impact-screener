// src/api/InstitutionalDataService.js - v4.0.4-debug-enhanced
// COMPLETE REPLACEMENT - Enhanced data extraction with comprehensive debugging

class InstitutionalDataService {
  constructor() {
    this.version = "4.0.4-debug-enhanced";
    this.cache = new Map();
    this.initialized = false;
    this.initializing = false;

    // Backend URL - prioritize environment variable, fallback to production URL
    this.backendBaseUrl =
      process.env.REACT_APP_BACKEND_URL ||
      "https://news-impact-screener-backend.onrender.com";

    console.log(
      "🚀 InstitutionalDataService v4.0.4 initializing (DEBUG-ENHANCED)..."
    );
    console.log("🌍 Environment:", process.env.NODE_ENV || "development");
    console.log("🔗 Backend URL:", this.backendBaseUrl);

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
    const timeout = options.timeout || 20000;

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
          Origin: window.location.origin,
          ...options.headers,
        },
        mode: "cors",
        cache: "no-cache",
        credentials: "omit",
        signal: controller.signal,
        ...options,
      };

      console.log(`🌐 Fetch to: ${url}`);
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      console.log(`📡 Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.requestCount++;
      this.lastRequestTime = Date.now();

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`❌ API call failed for ${endpoint}:`, error.message);
      throw error;
    }
  }

  // ENHANCED: Comprehensive data extraction with deep debugging
  async screenAllStocks(options = {}) {
    console.log("🔍 Starting stock screening with options:", options);

    try {
      await this.ensureInitialized();

      const startTime = Date.now();
      const response = await this.makeDirectApiCall("/api/screening");
      const duration = Date.now() - startTime;

      console.log(`✅ API Success: /api/screening`);
      console.log(`✅ Screening completed in ${duration}ms`);

      // COMPREHENSIVE DEBUG: Log everything about the response
      console.log("🔍 === RESPONSE DEBUGGING ===");
      console.log("Response type:", typeof response);
      console.log("Response is array:", Array.isArray(response));
      console.log("Response keys:", response ? Object.keys(response) : "none");
      console.log("Raw response structure:", JSON.stringify(response, null, 2));

      // ENHANCED DATA EXTRACTION: Multiple strategies with detailed logging
      let stocksData = [];
      let processedCount = 0;
      let successRate = 0;

      if (response && typeof response === "object") {
        // Strategy 1: Look for 'stocks' array
        if (response.stocks && Array.isArray(response.stocks)) {
          stocksData = response.stocks;
          console.log("✅ Strategy 1: Found stocks in response.stocks");
          console.log(`   Array length: ${stocksData.length}`);
          console.log(`   First item:`, stocksData[0]);
        }
        // Strategy 2: Look for 'results' array
        else if (response.results && Array.isArray(response.results)) {
          stocksData = response.results;
          console.log("✅ Strategy 2: Found stocks in response.results");
          console.log(`   Array length: ${stocksData.length}`);
          console.log(`   First item:`, stocksData[0]);
        }
        // Strategy 3: Look for 'data' array
        else if (response.data && Array.isArray(response.data)) {
          stocksData = response.data;
          console.log("✅ Strategy 3: Found stocks in response.data");
          console.log(`   Array length: ${stocksData.length}`);
          console.log(`   First item:`, stocksData[0]);
        }
        // Strategy 4: Response itself is array
        else if (Array.isArray(response)) {
          stocksData = response;
          console.log("✅ Strategy 4: Response is array directly");
          console.log(`   Array length: ${stocksData.length}`);
          console.log(`   First item:`, stocksData[0]);
        }
        // Strategy 5: Deep search for any array containing stock-like objects
        else {
          console.log("🔍 Strategy 5: Deep searching for stock data...");

          const findStockArrays = (obj, path = "") => {
            const arrays = [];

            if (Array.isArray(obj)) {
              // Check if this array contains stock-like objects
              if (obj.length > 0 && obj[0] && typeof obj[0] === "object") {
                const firstItem = obj[0];
                const hasStockFields =
                  firstItem.symbol ||
                  firstItem.ticker ||
                  firstItem.price ||
                  firstItem.currentPrice ||
                  firstItem.nissScore ||
                  firstItem.score;
                if (hasStockFields) {
                  arrays.push({ path, data: obj, length: obj.length });
                }
              }
            } else if (obj && typeof obj === "object") {
              for (const [key, value] of Object.entries(obj)) {
                const subArrays = findStockArrays(
                  value,
                  path ? `${path}.${key}` : key
                );
                arrays.push(...subArrays);
              }
            }

            return arrays;
          };

          const foundArrays = findStockArrays(response);
          console.log("🔍 Found potential stock arrays:", foundArrays);

          if (foundArrays.length > 0) {
            // Use the largest array found
            const bestArray = foundArrays.reduce((best, current) =>
              current.length > best.length ? current : best
            );
            stocksData = bestArray.data;
            console.log(
              `✅ Strategy 5: Using array at ${bestArray.path} with ${bestArray.length} items`
            );
            console.log(`   First item:`, stocksData[0]);
          }
        }

        // Extract summary information with detailed logging
        if (response.summary) {
          processedCount =
            response.summary.totalProcessed ||
            response.summary.processed ||
            response.summary.totalRequested ||
            0;
          successRate = response.summary.successRate || 0;
          console.log("📊 Summary found:", response.summary);
        } else {
          console.log("⚠️ No summary object found in response");
        }

        console.log(
          `📊 Stocks processed: ${processedCount || stocksData.length}`
        );
        console.log(`📈 Success rate: ${successRate}%`);
        console.log(`🎯 Stocks data extracted: ${stocksData.length} items`);

        if (stocksData.length === 0) {
          console.error("❌ === NO STOCK DATA FOUND ===");
          console.error("Full response for manual inspection:");
          console.error(response);
          console.error("=== END RESPONSE DEBUG ===");
          return [];
        }

        // Enhanced validation and normalization with detailed logging
        console.log("🔧 Starting data normalization...");
        const normalizedStocks = [];

        for (let i = 0; i < stocksData.length; i++) {
          const stock = stocksData[i];
          console.log(
            `Processing stock ${i + 1}/${stocksData.length}:`,
            stock?.symbol || stock?.ticker || "UNKNOWN"
          );

          if (!stock || typeof stock !== "object") {
            console.warn(`⚠️ Stock ${i} is invalid (not object):`, stock);
            continue;
          }

          const normalized = this.normalizeStockData(stock);
          if (normalized !== null) {
            normalizedStocks.push(normalized);
            console.log(
              `✅ Stock ${i + 1} normalized successfully: ${normalized.symbol}`
            );
          } else {
            console.warn(`❌ Stock ${i + 1} normalization failed`);
          }
        }

        console.log(
          `✅ Normalized stocks: ${normalizedStocks.length} valid items`
        );

        if (normalizedStocks.length === 0) {
          console.error("❌ === NORMALIZATION FAILED ===");
          console.error("Sample raw stock data:");
          console.error(stocksData.slice(0, 3));
          console.error("=== END NORMALIZATION DEBUG ===");
        }

        return normalizedStocks;
      }

      console.warn("⚠️ Unexpected response structure:", typeof response);
      console.error("❌ Full response:", response);
      return [];
    } catch (error) {
      console.error("❌ Stock screening failed:", error.message);
      throw new Error(`Stock screening failed: ${error.message}`);
    }
  }

  // ENHANCED: Comprehensive stock data normalization with detailed field mapping
  normalizeStockData(stock) {
    try {
      console.log(
        "🔧 Normalizing stock:",
        stock?.symbol || stock?.ticker || "UNKNOWN"
      );

      // Enhanced field mapping with comprehensive fallbacks
      const normalized = {
        // Core identifiers - try all possible field names
        symbol:
          stock.symbol || stock.ticker || stock.stock || stock.name || null,

        // NISS score - multiple possible field names
        nissScore: parseFloat(
          stock.nissScore || stock.niss || stock.score || stock.rating || 0
        ),

        // Confidence levels - various formats
        confidence:
          stock.confidence ||
          stock.level ||
          stock.grade ||
          stock.rating ||
          "MEDIUM",

        // Price data - comprehensive mapping
        currentPrice: parseFloat(
          stock.currentPrice ||
            stock.price ||
            stock.last ||
            stock.close ||
            stock.c ||
            0
        ),
        change: parseFloat(
          stock.change || stock.priceChange || stock.netChange || stock.d || 0
        ),
        changePercent: parseFloat(
          stock.changePercent ||
            stock.changesPercentage ||
            stock.percentChange ||
            stock.pctChange ||
            stock.dp ||
            0
        ),

        // Volume and market data
        volume: parseInt(stock.volume || stock.vol || stock.v || 0),
        avgVolume: parseInt(
          stock.avgVolume ||
            stock.averageVolume ||
            stock.avgVol ||
            stock.volume ||
            0
        ),
        marketCap: parseInt(
          stock.marketCap || stock.market_cap || stock.mcap || 0
        ),

        // OHLC data
        high: parseFloat(stock.high || stock.dayHigh || stock.h || 0),
        low: parseFloat(stock.low || stock.dayLow || stock.l || 0),
        open: parseFloat(stock.open || stock.o || 0),

        // News and sentiment data
        newsCount: parseInt(
          stock.newsCount || stock.articles || stock.news || 0
        ),
        sentiment:
          stock.sentiment || stock.direction || stock.trend || "NEUTRAL",

        // Sector and classification
        sector: stock.sector || stock.industry || stock.category || "Unknown",

        // Catalyst information
        catalysts: stock.catalysts || stock.events || stock.news || [],

        // Metadata
        lastUpdated:
          stock.lastUpdated || stock.timestamp || new Date().toISOString(),
        source: stock.source || stock.dataSource || "backend-v4.0.0",

        // Keep original data for debugging
        rawData: stock,
      };

      // Validation with detailed logging
      if (!normalized.symbol) {
        console.warn("⚠️ Stock missing symbol. Raw data:", stock);
        console.warn("   Tried fields: symbol, ticker, stock, name");
        return null;
      }

      // Ensure numeric fields are valid numbers
      if (isNaN(normalized.nissScore)) {
        console.warn(
          `⚠️ Invalid NISS score for ${normalized.symbol}, defaulting to 0`
        );
        normalized.nissScore = 0;
      }

      if (isNaN(normalized.currentPrice)) {
        console.warn(
          `⚠️ Invalid price for ${normalized.symbol}, defaulting to 0`
        );
        normalized.currentPrice = 0;
      }

      console.log(
        `✅ Successfully normalized ${normalized.symbol}: NISS=${normalized.nissScore}, Price=${normalized.currentPrice}`
      );
      return normalized;
    } catch (error) {
      console.error("❌ Error normalizing stock data:", error);
      console.error("   Stock data was:", stock);
      return null;
    }
  }

  // ENHANCED: Market context with comprehensive error handling
  async getMarketContext() {
    try {
      await this.ensureInitialized();
      console.log("📈 Loading market context...");

      const response = await this.makeDirectApiCall("/api/market-context");

      if (response && typeof response === "object") {
        const context = {
          volatility: response.volatility || "NORMAL",
          trend: response.trend || "NEUTRAL",
          breadth: response.breadth || "MIXED",
          spyChange: parseFloat(response.spyChange || 0),
          vix: parseFloat(response.vix || 20),
          lastUpdate: response.lastUpdate || new Date(),
          dataSource: response.dataSource || "REAL",
          ...response,
        };

        console.log("✅ Market context loaded:", context);
        return context;
      }

      // Return default context if backend doesn't have market data
      console.log("⚠️ Using default market context");
      return {
        volatility: "NORMAL",
        trend: "NEUTRAL",
        breadth: "MIXED",
        spyChange: 0,
        vix: 20,
        lastUpdate: new Date(),
        dataSource: "DEFAULT",
      };
    } catch (error) {
      console.warn(
        "⚠️ Market context unavailable, using defaults:",
        error.message
      );
      return {
        volatility: "NORMAL",
        trend: "NEUTRAL",
        breadth: "MIXED",
        spyChange: 0,
        vix: 20,
        lastUpdate: new Date(),
        dataSource: "FALLBACK",
      };
    }
  }

  // ENHANCED: Health report with comprehensive status
  async getHealthReport() {
    try {
      const response = await this.makeDirectApiCall("/api/health");

      if (response && response.version) {
        return {
          overall: "HEALTHY",
          version: response.version,
          apis: response.apis || {},
          summary: response.summary || {},
          uptime: response.uptime || "unknown",
          error: null,
        };
      }

      throw new Error("Invalid health response");
    } catch (error) {
      return {
        overall: "UNHEALTHY",
        version: "unknown",
        apis: {},
        summary: {},
        uptime: "unknown",
        error: error.message,
      };
    }
  }

  // Utility methods
  clearCache() {
    this.cache.clear();
    console.log("🗑️ Cache cleared");
  }

  getDebugInfo() {
    return {
      version: this.version,
      initialized: this.initialized,
      backendUrl: this.backendBaseUrl,
      cacheSize: this.cache.size,
      requestCount: this.requestCount,
      lastRequestTime: new Date(this.lastRequestTime).toISOString(),
      environment: process.env.NODE_ENV,
    };
  }

  // CONNECTION TEST METHOD
  async testConnection() {
    try {
      console.log("🧪 Testing backend connection...");
      const startTime = Date.now();

      const health = await this.makeDirectApiCall("/api/health");
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

  // DEBUG HELPER: Manual response inspection
  async debugScreeningResponse() {
    try {
      console.log("🐛 === MANUAL SCREENING DEBUG ===");
      const response = await this.makeDirectApiCall("/api/screening");

      console.log("Response type:", typeof response);
      console.log("Response keys:", Object.keys(response || {}));
      console.log("Full response:", response);

      if (response?.stocks) {
        console.log("Stocks array length:", response.stocks.length);
        console.log("First stock:", response.stocks[0]);
      }

      if (response?.results) {
        console.log("Results array length:", response.results.length);
        console.log("First result:", response.results[0]);
      }

      console.log("🐛 === END DEBUG ===");
      return response;
    } catch (error) {
      console.error("Debug failed:", error);
      return null;
    }
  }
}

// Create and export singleton instance
const institutionalDataService = new InstitutionalDataService();

// Add debug helper to window for development
if (process.env.NODE_ENV === "development") {
  window._dataService = institutionalDataService;
  console.log("🐛 Debug helper available: window._dataService");
  console.log("   Try: window._dataService.debugScreeningResponse()");
}

export default institutionalDataService;
