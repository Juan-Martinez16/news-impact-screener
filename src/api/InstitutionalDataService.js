// src/api/InstitutionalDataService.js - ENHANCED v4.1.0
// Added economic calendar and news detail methods

class InstitutionalDataService {
  constructor() {
    this.version = "4.1.0-economic-calendar";
    this.backendBaseUrl =
      process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
    this.cache = new Map();
    this.cacheTimeout = 2 * 60 * 1000; // 2 minutes

    console.log("🚀 InstitutionalDataService v4.1.0 initialized");
    console.log(`🔗 Backend URL: ${this.backendBaseUrl}`);
  }

  // ============================================
  // EXISTING CORE METHODS (unchanged)
  // ============================================

  async testConnection() {
    try {
      const response = await this.makeRequestWithRetry("/api/health");
      console.log("✅ Backend connection successful");
      return response;
    } catch (error) {
      console.error("❌ Backend connection failed:", error.message);
      throw new Error(`Backend service unavailable: ${error.message}`);
    }
  }

  async performScreening(options = {}) {
    const startTime = Date.now();
    const params = new URLSearchParams({
      limit: options.limit || 50,
      minNissScore: options.minNissScore || 5.0,
      includeAll: options.includeAll || true,
    });

    try {
      console.log("🔍 Starting stock screening...");

      const endpoint = "/api/screening";
      const fullEndpoint = params.toString()
        ? `${endpoint}?${params}`
        : endpoint;

      const response = await this.makeRequestWithRetry(fullEndpoint, {
        timeout: 30000,
      });

      const processingTime = Date.now() - startTime;

      if (!response || !response.stocks) {
        throw new Error("Invalid screening response format");
      }

      console.log(
        `✅ Screening completed: ${response.stocks.length} stocks returned`
      );
      console.log(`⏱️ Processing time: ${processingTime}ms`);

      const enhancedResponse = {
        ...response,
        stocks: response.stocks.map((stock) => ({
          ...stock,
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
          price: stock.currentPrice || stock.price || 0,
          symbol: stock.symbol || "UNKNOWN",
        })),
        processingTime,
        clientVersion: this.version,
        timestamp: new Date().toISOString(),
      };

      this.setCachedData("screening-results", enhancedResponse);
      return enhancedResponse;
    } catch (error) {
      console.error("❌ Stock screening failed:", error.message);

      const cached = this.getCachedData("screening-results");
      if (cached) {
        console.log("📋 Returning cached screening results");
        return { ...cached, fromCache: true };
      }

      throw error;
    }
  }

  async getMarketContext() {
    try {
      console.log("📈 Fetching market context...");

      const cacheKey = "market-context";
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await this.makeRequestWithRetry("/api/market-context");
      console.log("✅ Market context received");

      this.setCachedData(cacheKey, response);
      return response;
    } catch (error) {
      console.error("❌ Market context failed:", error.message);

      return {
        volatility: "UNKNOWN",
        trend: "NEUTRAL",
        breadth: "MIXED",
        spyChange: 0,
        vix: 20,
        lastUpdate: new Date().toISOString(),
        dataSource: "ERROR",
        error: error.message,
      };
    }
  }

  // ============================================
  // NEW ECONOMIC CALENDAR METHODS
  // ============================================

  async getEconomicCalendar(days = 7) {
    try {
      console.log(`📅 Fetching economic calendar for ${days} days...`);

      const cacheKey = `economic-calendar-${days}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        console.log("📋 Returning cached economic calendar");
        return cached;
      }

      const params = new URLSearchParams({ days: days.toString() });
      const response = await this.makeRequestWithRetry(
        `/api/economic-calendar?${params}`
      );

      console.log(
        "✅ Economic calendar received:",
        response.metadata?.totalEvents || 0,
        "events"
      );

      // Cache for shorter time since calendar data is time-sensitive
      this.setCachedData(cacheKey, response, 5 * 60 * 1000); // 5 minutes
      return response;
    } catch (error) {
      console.error("❌ Economic calendar failed:", error.message);

      // Return fallback static calendar
      return this.getFallbackEconomicCalendar(days);
    }
  }

  async getEarningsCalendar(days = 7, symbols = null) {
    try {
      console.log(`📈 Fetching earnings calendar for ${days} days...`);

      const cacheKey = `earnings-calendar-${days}-${symbols || "all"}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        console.log("📋 Returning cached earnings calendar");
        return cached;
      }

      const params = new URLSearchParams({ days: days.toString() });
      if (symbols) params.append("symbols", symbols);

      const response = await this.makeRequestWithRetry(
        `/api/earnings-calendar?${params}`
      );

      console.log(
        "✅ Earnings calendar received:",
        response.metadata?.totalEarnings || 0,
        "earnings"
      );

      // Cache for shorter time
      this.setCachedData(cacheKey, response, 5 * 60 * 1000); // 5 minutes
      return response;
    } catch (error) {
      console.error("❌ Earnings calendar failed:", error.message);

      // Return fallback static earnings
      return this.getFallbackEarningsCalendar(days);
    }
  }

  // ============================================
  // NEWS ANALYSIS METHODS
  // ============================================

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

      // Return mock news data as fallback
      return this.getFallbackNewsData(symbol);
    }
  }

  async getDetailedNewsForStock(symbol) {
    if (!symbol) {
      throw new Error("Symbol is required for detailed news");
    }

    console.log(`📰 Getting detailed news for ${symbol}...`);

    try {
      const cacheKey = `detailed-news-${symbol}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await this.makeRequestWithRetry(
        `/api/news/${symbol}/detailed`
      );
      console.log(`✅ Detailed news received for ${symbol}`);

      this.setCachedData(cacheKey, response, 10 * 60 * 1000); // 10 minutes cache
      return response;
    } catch (error) {
      console.error(`❌ Detailed news failed for ${symbol}:`, error.message);

      // Return enhanced mock news data
      return this.getFallbackDetailedNews(symbol);
    }
  }

  // ============================================
  // FALLBACK DATA METHODS
  // ============================================

  getFallbackEconomicCalendar(days = 7) {
    console.log("📅 Generating fallback economic calendar...");

    const calendarData = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dayEvents = this.getStaticEconomicEvents(date);

      if (dayEvents.length > 0) {
        calendarData.push({
          date: date.toISOString().split("T")[0],
          dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
          dayNumber: date.getDate(),
          month: date.toLocaleDateString("en-US", { month: "short" }),
          events: dayEvents,
        });
      }
    }

    return {
      success: true,
      data: calendarData,
      metadata: {
        daysRequested: days,
        totalEvents: calendarData.reduce(
          (sum, day) => sum + day.events.length,
          0
        ),
        source: "fallback",
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  getFallbackEarningsCalendar(days = 7) {
    console.log("📈 Generating fallback earnings calendar...");

    const earningsData = [];
    const today = new Date();

    const majorStocks = [
      "AAPL",
      "MSFT",
      "GOOGL",
      "AMZN",
      "TSLA",
      "META",
      "NVDA",
    ];

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      if (date.getDay() !== 0 && date.getDay() !== 6) {
        // Weekdays only
        const numEarnings = Math.floor(Math.random() * 2) + 1;
        const dayEarnings = [];

        for (let j = 0; j < numEarnings; j++) {
          const randomStock =
            majorStocks[Math.floor(Math.random() * majorStocks.length)];
          const time = Math.random() > 0.5 ? "Pre-market" : "After-market";

          dayEarnings.push({
            symbol: randomStock,
            companyName: `${randomStock} Company`,
            time,
            impact: "HIGH",
            epsEstimated: (Math.random() * 5).toFixed(2),
            revenueEstimated: (Math.random() * 100000000000).toFixed(0),
            source: "fallback",
          });
        }

        if (dayEarnings.length > 0) {
          earningsData.push({
            date: date.toISOString().split("T")[0],
            dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
            dayNumber: date.getDate(),
            month: date.toLocaleDateString("en-US", { month: "short" }),
            earnings: dayEarnings,
          });
        }
      }
    }

    return {
      success: true,
      data: earningsData,
      metadata: {
        daysRequested: days,
        totalEarnings: earningsData.reduce(
          (sum, day) => sum + day.earnings.length,
          0
        ),
        source: "fallback",
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  getStaticEconomicEvents(date) {
    const dayOfWeek = date.getDay();
    const events = [];

    switch (dayOfWeek) {
      case 1: // Monday
        events.push(
          {
            time: "14:30",
            event: "ISM Manufacturing PMI",
            impact: "HIGH",
            country: "US",
          },
          {
            time: "15:00",
            event: "Construction Spending",
            impact: "MEDIUM",
            country: "US",
          }
        );
        break;
      case 2: // Tuesday
        events.push({
          time: "14:30",
          event: "JOLTs Job Openings",
          impact: "MEDIUM",
          country: "US",
        });
        break;
      case 3: // Wednesday
        events.push(
          {
            time: "14:15",
            event: "ADP Employment Change",
            impact: "HIGH",
            country: "US",
          },
          {
            time: "20:00",
            event: "Fed Beige Book",
            impact: "HIGH",
            country: "US",
          }
        );
        break;
      case 4: // Thursday
        events.push(
          {
            time: "14:30",
            event: "Initial Jobless Claims",
            impact: "MEDIUM",
            country: "US",
          },
          {
            time: "16:00",
            event: "ISM Services PMI",
            impact: "HIGH",
            country: "US",
          }
        );
        break;
      case 5: // Friday
        events.push(
          {
            time: "14:30",
            event: "Non-Farm Payrolls",
            impact: "HIGH",
            country: "US",
          },
          {
            time: "14:30",
            event: "Unemployment Rate",
            impact: "HIGH",
            country: "US",
          }
        );
        break;
    }

    return events.map((event) => ({ ...event, source: "static" }));
  }

  getFallbackNewsData(symbol) {
    console.log(`📰 Generating fallback news for ${symbol}...`);

    const mockNews = [
      {
        headline: `${symbol} Shows Strong Performance in Latest Quarter`,
        source: "MarketWatch",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        sentiment: "BULLISH",
        relevanceScore: 8.5,
        url: `https://marketwatch.com/stocks/${symbol}`,
      },
      {
        headline: `Analysts Upgrade ${symbol} Price Target`,
        source: "Bloomberg",
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        sentiment: "BULLISH",
        relevanceScore: 7.8,
        url: `https://bloomberg.com/stocks/${symbol}`,
      },
    ];

    return {
      success: true,
      symbol,
      articles: mockNews,
      summary: {
        totalArticles: mockNews.length,
        avgSentiment: "BULLISH",
        avgRelevance: 8.2,
        source: "fallback",
      },
      timestamp: new Date().toISOString(),
    };
  }

  getFallbackDetailedNews(symbol) {
    console.log(`📰 Generating detailed fallback news for ${symbol}...`);

    const detailedNews = [
      {
        id: 1,
        headline: `${symbol} Reports Strong Q4 Earnings, Beats Estimates`,
        source: "Reuters",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        url: `https://reuters.com/business/finance/${symbol.toLowerCase()}-earnings`,
        sentiment: "BULLISH",
        relevanceScore: 9.2,
        summary: `${symbol} exceeded analyst expectations with strong quarterly results, driving positive market sentiment.`,
        category: "earnings",
        impact: "HIGH",
      },
      {
        id: 2,
        headline: `Analysts Upgrade ${symbol} Following Product Launch`,
        source: "Bloomberg",
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        url: `https://bloomberg.com/news/articles/${symbol.toLowerCase()}-upgrade`,
        sentiment: "BULLISH",
        relevanceScore: 8.7,
        summary: `Multiple analysts raised price targets for ${symbol} citing successful product launch and market expansion.`,
        category: "analyst",
        impact: "MEDIUM",
      },
      {
        id: 3,
        headline: `${symbol} CEO Discusses Growth Strategy in Interview`,
        source: "CNBC",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        url: `https://cnbc.com/video/${symbol.toLowerCase()}-ceo-interview`,
        sentiment: "NEUTRAL",
        relevanceScore: 7.5,
        summary: `CEO outlines strategic initiatives and addresses market concerns in comprehensive interview.`,
        category: "management",
        impact: "MEDIUM",
      },
      {
        id: 4,
        headline: `Market Volatility Affects ${symbol} Trading Volume`,
        source: "MarketWatch",
        timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        url: `https://marketwatch.com/story/${symbol.toLowerCase()}-trading-volume`,
        sentiment: "NEUTRAL",
        relevanceScore: 6.8,
        summary: `Increased trading volume observed amid broader market volatility and sector rotation.`,
        category: "market",
        impact: "LOW",
      },
    ];

    return {
      success: true,
      symbol,
      articles: detailedNews,
      metadata: {
        totalArticles: detailedNews.length,
        timeframe: "24h",
        avgSentiment: "BULLISH",
        avgRelevance: 8.1,
        highImpactCount: detailedNews.filter((a) => a.impact === "HIGH").length,
        source: "fallback",
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // EXISTING UTILITY METHODS (unchanged)
  // ============================================

  async makeRequestWithRetry(endpoint, options = {}) {
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.makeApiCall(endpoint, options);
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(
          `🔄 Retry ${attempt}/${maxRetries} after ${delay}ms: ${error.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async makeApiCall(endpoint, options = {}) {
    const url = `${this.backendBaseUrl}${endpoint}`;
    const timeout = options.timeout || 15000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  setCachedData(key, data, customTimeout = null) {
    const timeout = customTimeout || this.cacheTimeout;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expires: Date.now() + timeout,
    });
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clearCache() {
    this.cache.clear();
    console.log("🧹 Cache cleared");
  }

  // ============================================
  // EXISTING METHODS (unchanged)
  // ============================================

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

  async healthCheck() {
    try {
      const response = await this.makeRequestWithRetry("/api/health");
      return {
        status: "healthy",
        version: response.version || this.version,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  getVersion() {
    return this.version;
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      version: this.version,
    };
  }
}

// Export singleton instance
const institutionalDataService = new InstitutionalDataService();
export default institutionalDataService;
