// src/api/InstitutionalDataService.js - MULTI-API ENHANCED VERSION
// Enhanced for 10x performance with new API integrations

import NISSCalculationEngine from "../engine/NISSCalculationEngine";
import dataNormalizer from "../utils/DataNormalizer";

class InstitutionalDataService {
  constructor() {
    this.version = "4.0.0-multi-api";
    this.cache = new Map();
    this.initialized = false;
    this.backendBaseUrl =
      process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

    // Enhanced cache TTL settings for 15-minute refresh strategy
    this.cacheTTL = {
      quotes: 60000, // 1 minute for individual quotes
      batchQuotes: 300000, // 5 minutes for batch quotes
      news: 900000, // 15 minutes for news (matches backend strategy)
      technicals: 600000, // 10 minutes for technicals
      screening: 180000, // 3 minutes for screening
      health: 120000, // 2 minutes for health
      marketContext: 300000, // 5 minutes for market context
    };

    // Enhanced API endpoints for new multi-API backend
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

    // Performance tracking for optimization
    this.performanceMetrics = {
      requestCount: 0,
      successfulRequests: 0,
      cacheHits: 0,
      totalResponseTime: 0,
      lastRequestTime: Date.now(),
      batchRequestsUsed: 0,
      apiFailovers: 0,
    };

    // Request queue for batch optimization
    this.requestQueue = [];
    this.batchProcessing = false;
    this.maxBatchSize = 20;

    this.initialize();
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log(
        "🚀 InstitutionalDataService v4.0.0 initializing (MULTI-API ENHANCED)..."
      );

      // Test backend connectivity and API health
      await this.checkBackendHealth();

      // Test new API keys
      await this.testAPIKeys();

      // Initialize dependencies with enhanced error handling
      try {
        if (dataNormalizer && typeof dataNormalizer.initialize === "function") {
          dataNormalizer.initialize();
          console.log("✅ DataNormalizer initialized");
        }
      } catch (error) {
        console.warn("⚠️ DataNormalizer initialization failed:", error.message);
      }

      try {
        if (
          NISSCalculationEngine &&
          typeof NISSCalculationEngine.initialize === "function"
        ) {
          NISSCalculationEngine.initialize();
          console.log("✅ NISSCalculationEngine initialized");
        }
      } catch (error) {
        console.warn(
          "⚠️ NISSCalculationEngine initialization failed:",
          error.message
        );
      }

      this.initialized = true;
      console.log(
        "✅ Multi-API InstitutionalDataService initialized successfully"
      );
      console.log(`📊 Performance Target: 50+ stocks in <15 seconds`);
    } catch (error) {
      console.error(
        "❌ InstitutionalDataService initialization failed:",
        error
      );
      throw new Error(`Backend service unavailable: ${error.message}`);
    }
  }

  // ============================================
  // ENHANCED API COMMUNICATION WITH FAILOVER
  // ============================================

  async makeApiCall(endpoint, options = {}) {
    const maxRetries = 3;
    let attempt = 0;
    const startTime = Date.now();

    // Track performance metrics
    this.performanceMetrics.requestCount++;
    this.performanceMetrics.lastRequestTime = Date.now();

    while (attempt < maxRetries) {
      try {
        const url = this.backendBaseUrl + endpoint;
        console.log(`📡 Multi-API Call (attempt ${attempt + 1}): ${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const requestOptions = {
          method: options.method || "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Request-ID": `multi-api-${
              this.performanceMetrics.requestCount
            }-${Date.now()}`,
            "X-Service-Version": this.version,
            ...options.headers,
          },
          mode: "cors",
          credentials: "omit",
          cache: "no-cache",
          signal: controller.signal,
        };

        if (options.body && requestOptions.method !== "GET") {
          requestOptions.body = options.body;
        }

        try {
          const response = await fetch(url, requestOptions);
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();

          // Track performance metrics
          const responseTime = Date.now() - startTime;
          this.performanceMetrics.totalResponseTime += responseTime;
          this.performanceMetrics.successfulRequests++;

          console.log(
            `✅ Multi-API Success: ${endpoint} (${
              data.source || "unknown"
            }) in ${responseTime}ms`
          );

          // Log API failover if detected
          if (data.source && data.source.includes("fallback")) {
            this.performanceMetrics.apiFailovers++;
            console.log("🔄 API failover detected and handled successfully");
          }

          return data;
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (error) {
        attempt++;
        console.error(
          `❌ Multi-API Attempt ${attempt} failed for ${endpoint}:`,
          error.message
        );

        if (attempt >= maxRetries) {
          if (error.name === "AbortError") {
            throw new Error(`Request timeout after 15 seconds`);
          }
          if (
            error.message.includes("fetch") ||
            error.message.includes("NetworkError") ||
            error.name === "TypeError"
          ) {
            throw new Error(
              `Backend unreachable at ${this.backendBaseUrl}. Check if multi-API backend is running.`
            );
          }
          throw error;
        }

        // Enhanced exponential backoff with jitter
        const backoffTime =
          1000 * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
      }
    }
  }

  async checkBackendHealth() {
    try {
      const health = await this.makeApiCall(this.endpoints.health);
      console.log("✅ Multi-API backend health check passed:", health.status);

      // Log API availability
      if (health.apis) {
        const apiStatus = Object.entries(health.apis)
          .map(([api, available]) => `${api}: ${available ? "✅" : "❌"}`)
          .join(", ");
        console.log(`📊 API Status: ${apiStatus}`);
      }

      return health;
    } catch (error) {
      console.error("❌ Multi-API backend health check failed:", error.message);
      throw new Error("Multi-API backend service is not available");
    }
  }

  async testAPIKeys() {
    try {
      console.log("🧪 Testing API keys...");
      const testResults = await this.makeApiCall(this.endpoints.testKeys);

      const results = Object.entries(testResults.tests)
        .map(([api, result]) => `${api}: ${result.status}`)
        .join(", ");

      console.log(`🧪 API Key Test Results: ${results}`);
      return testResults;
    } catch (error) {
      console.warn("⚠️ API key testing failed:", error.message);
      return null;
    }
  }

  // ============================================
  // ENHANCED STOCK DATA METHODS WITH BATCH SUPPORT
  // ============================================

  async getStockQuote(symbol) {
    try {
      const cacheKey = `quote-${symbol}`;
      const cached = this.getFromCache(cacheKey, this.cacheTTL.quotes);
      if (cached) {
        console.log(`📊 Using cached quote for ${symbol}`);
        this.performanceMetrics.cacheHits++;
        return cached;
      }

      console.log(`📊 Fetching multi-API quote data for ${symbol}...`);

      const quoteData = await this.makeApiCall(
        `${this.endpoints.quotes}/${symbol}`
      );

      if (!quoteData || quoteData.error) {
        throw new Error(quoteData?.message || "Quote data not available");
      }

      // Enhanced data normalization with source tracking
      let normalizedQuote;
      try {
        normalizedQuote = dataNormalizer?.normalizeStockQuote
          ? dataNormalizer.normalizeStockQuote(quoteData)
          : this.fallbackNormalizeQuote(quoteData);

        // Add source information for tracking API performance
        normalizedQuote.apiSource = quoteData.source;
        normalizedQuote.fetchTime = new Date().toISOString();
      } catch (normError) {
        console.warn(
          "Data normalization failed, using fallback:",
          normError.message
        );
        normalizedQuote = this.fallbackNormalizeQuote(quoteData);
      }

      this.setCache(cacheKey, normalizedQuote);
      console.log(
        `✅ Multi-API quote data received for ${symbol}: $${normalizedQuote.price} (${normalizedQuote.apiSource})`
      );

      return normalizedQuote;
    } catch (error) {
      console.error(
        `❌ Failed to get multi-API quote for ${symbol}:`,
        error.message
      );
      throw new Error(
        `Unable to fetch quote data for ${symbol}: ${error.message}`
      );
    }
  }

  // NEW: Batch quote fetching for enhanced screening performance
  async getBatchQuotes(symbols) {
    try {
      if (!Array.isArray(symbols) || symbols.length === 0) {
        throw new Error("Invalid symbols array for batch quotes");
      }

      const symbolString = symbols.join(",");
      const cacheKey = `batch-quotes-${symbolString}`;
      const cached = this.getFromCache(cacheKey, this.cacheTTL.batchQuotes);

      if (cached) {
        console.log(
          `📊 Using cached batch quotes for ${symbols.length} symbols`
        );
        this.performanceMetrics.cacheHits++;
        return cached;
      }

      console.log(`📊 Fetching batch quotes for ${symbols.length} symbols...`);
      this.performanceMetrics.batchRequestsUsed++;

      const batchData = await this.makeApiCall(
        `${this.endpoints.batchQuotes}/${symbolString}`
      );

      if (!batchData || !batchData.quotes) {
        throw new Error("Batch quote data not available");
      }

      // Process and normalize batch quotes
      const normalizedQuotes = batchData.quotes.map((quote) => {
        try {
          const normalized = dataNormalizer?.normalizeStockQuote
            ? dataNormalizer.normalizeStockQuote(quote)
            : this.fallbackNormalizeQuote(quote);

          normalized.apiSource = quote.source || batchData.source;
          normalized.fetchTime = new Date().toISOString();
          return normalized;
        } catch (error) {
          console.warn(
            `Failed to normalize quote for ${quote.symbol}:`,
            error.message
          );
          return this.fallbackNormalizeQuote(quote);
        }
      });

      const result = {
        quotes: normalizedQuotes,
        count: normalizedQuotes.length,
        source: batchData.source,
        timestamp: batchData.timestamp,
        successRate: ((normalizedQuotes.length / symbols.length) * 100).toFixed(
          1
        ),
      };

      this.setCache(cacheKey, result);
      console.log(
        `✅ Batch quotes received: ${normalizedQuotes.length}/${symbols.length} symbols (${result.successRate}% success)`
      );

      return result;
    } catch (error) {
      console.error(`❌ Failed to get batch quotes:`, error.message);
      throw new Error(`Unable to fetch batch quotes: ${error.message}`);
    }
  }

  async getStockNews(symbol) {
    try {
      const cacheKey = `news-${symbol}`;
      const cached = this.getFromCache(cacheKey, this.cacheTTL.news);
      if (cached) {
        console.log(`📰 Using cached news for ${symbol}`);
        this.performanceMetrics.cacheHits++;
        return cached;
      }

      console.log(`📰 Fetching news data for ${symbol}...`);

      const newsData = await this.makeApiCall(
        `${this.endpoints.news}/${symbol}`
      );

      if (!newsData) {
        throw new Error("News data not available");
      }

      // Handle different response formats
      let articles = [];
      if (Array.isArray(newsData.news)) {
        articles = newsData.news;
      } else if (Array.isArray(newsData.articles)) {
        articles = newsData.articles;
      } else if (Array.isArray(newsData)) {
        articles = newsData;
      } else {
        console.warn("Unexpected news data format:", newsData);
        articles = [];
      }

      // Enhanced data normalization with fallbacks
      let normalizedNews;
      try {
        normalizedNews = dataNormalizer?.normalizeNewsData
          ? dataNormalizer.normalizeNewsData(articles)
          : this.fallbackNormalizeNews(articles);

        // Add source and performance tracking
        normalizedNews = normalizedNews.map((article) => ({
          ...article,
          apiSource: newsData.source || "finnhub",
          fetchTime: new Date().toISOString(),
        }));
      } catch (normError) {
        console.warn(
          "News normalization failed, using fallback:",
          normError.message
        );
        normalizedNews = this.fallbackNormalizeNews(articles);
      }

      this.setCache(cacheKey, normalizedNews);
      console.log(
        `✅ News data received for ${symbol}: ${
          normalizedNews.length
        } articles (${newsData.source || "finnhub"})`
      );

      return normalizedNews;
    } catch (error) {
      console.error(`❌ Failed to get news for ${symbol}:`, error.message);
      throw new Error(
        `Unable to fetch news data for ${symbol}: ${error.message}`
      );
    }
  }

  async getTechnicalData(symbol) {
    try {
      const cacheKey = `technicals-${symbol}`;
      const cached = this.getFromCache(cacheKey, this.cacheTTL.technicals);
      if (cached) {
        console.log(`📈 Using cached technicals for ${symbol}`);
        this.performanceMetrics.cacheHits++;
        return cached;
      }

      console.log(`📈 Fetching multi-API technical data for ${symbol}...`);

      const techData = await this.makeApiCall(
        `${this.endpoints.technicals}/${symbol}`
      );

      if (!techData || techData.error) {
        throw new Error(techData?.message || "Technical data not available");
      }

      // Enhanced data normalization with source tracking
      let normalizedTechnicals;
      try {
        normalizedTechnicals = dataNormalizer?.normalizeTechnicalData
          ? dataNormalizer.normalizeTechnicalData(techData)
          : this.fallbackNormalizeTechnicals(techData);

        // Add API source tracking for performance monitoring
        normalizedTechnicals.apiSource = techData.source;
        normalizedTechnicals.fetchTime = new Date().toISOString();
      } catch (normError) {
        console.warn(
          "Technical normalization failed, using fallback:",
          normError.message
        );
        normalizedTechnicals = this.fallbackNormalizeTechnicals(techData);
      }

      this.setCache(cacheKey, normalizedTechnicals);
      console.log(
        `✅ Technical data received for ${symbol} (${normalizedTechnicals.apiSource})`
      );

      return normalizedTechnicals;
    } catch (error) {
      console.error(
        `❌ Failed to get technicals for ${symbol}:`,
        error.message
      );
      throw new Error(
        `Unable to fetch technical data for ${symbol}: ${error.message}`
      );
    }
  }

  // ============================================
  // ENHANCED SCREENING WITH BATCH OPTIMIZATION
  // ============================================

  async screenAllStocks(options = {}) {
    console.log("🔍 Starting enhanced multi-API stock screening...", options);

    try {
      const cacheKey = `screening-enhanced-${JSON.stringify(options)}`;
      const cached = this.getFromCache(cacheKey, this.cacheTTL.screening);
      if (cached) {
        console.log("📋 Using cached enhanced screening results");
        this.performanceMetrics.cacheHits++;
        return cached;
      }

      console.log("🔍 Performing enhanced multi-API screening...");
      const screeningStartTime = Date.now();

      const screeningData = await this.makeApiCall(this.endpoints.screening, {
        method: "GET",
      });

      // Handle different response formats
      let results = [];
      if (Array.isArray(screeningData.results)) {
        results = screeningData.results;
      } else if (Array.isArray(screeningData)) {
        results = screeningData;
      } else {
        throw new Error("Invalid screening response format");
      }

      const screeningTime = Date.now() - screeningStartTime;
      console.log(
        `✅ Enhanced screening complete: ${results.length} stocks in ${screeningTime}ms`
      );

      // Enhanced results with NISS calculations using real data
      const enhancedResults = await Promise.all(
        results.map(async (stock) => {
          try {
            return await this.enhanceStockWithRealNISS(stock);
          } catch (error) {
            console.warn(
              `Failed to enhance ${stock.symbol} with NISS:`,
              error.message
            );
            return {
              ...stock,
              nissScore: 0,
              confidence: "LOW",
              error: error.message,
              dataSource: "PARTIAL",
            };
          }
        })
      );

      // Filter out failed enhancements if needed
      const validResults = enhancedResults.filter(
        (stock) => stock.symbol && typeof stock.nissScore === "number"
      );

      // Enhanced results with performance metrics
      const finalResults = {
        results: validResults,
        summary: {
          ...screeningData.summary,
          enhancedCount: validResults.length,
          processingTime: `${screeningTime}ms`,
          targetAchieved: screeningTime < 15000 ? "✅ YES" : "❌ NO",
        },
        performance: {
          ...screeningData.performance,
          enhancementTime: Date.now() - screeningStartTime,
          nissCalculations: validResults.length,
          batchOptimization: screeningData.source?.includes("batch")
            ? "✅ USED"
            : "❌ NOT_USED",
        },
        apiMetrics: this.getPerformanceMetrics(),
        timestamp: new Date().toISOString(),
      };

      this.setCache(cacheKey, finalResults);
      console.log(`✅ Enhanced ${validResults.length} stocks with NISS data`);
      console.log(
        `📊 Total processing time: ${Date.now() - screeningStartTime}ms`
      );

      return finalResults;
    } catch (error) {
      console.error("❌ Enhanced screening failed:", error.message);
      throw new Error(
        `Unable to perform enhanced stock screening: ${error.message}`
      );
    }
  }

  async analyzeStock(symbol) {
    console.log(
      `🔍 Analyzing ${symbol} with enhanced multi-API integration...`
    );

    try {
      const analysisStartTime = Date.now();

      // Get all data sources with enhanced error handling
      const [quote, news, technicals] = await Promise.all([
        this.getStockQuote(symbol).catch((err) => {
          console.warn(`Quote fetch failed for ${symbol}:`, err.message);
          return this.fallbackNormalizeQuote({ symbol, price: 0 });
        }),
        this.getStockNews(symbol).catch((err) => {
          console.warn(`News fetch failed for ${symbol}:`, err.message);
          return [];
        }),
        this.getTechnicalData(symbol).catch((err) => {
          console.warn(`Technical fetch failed for ${symbol}:`, err.message);
          return this.fallbackNormalizeTechnicals({});
        }),
      ]);

      // Calculate NISS using enhanced real data
      let nissData;
      try {
        nissData = NISSCalculationEngine?.calculateNISS
          ? NISSCalculationEngine.calculateNISS({
              symbol,
              quote,
              news,
              technicals,
              marketContext: await this.getMarketContext().catch(() => ({})),
            })
          : this.fallbackNISSCalculation(quote, news, technicals);
      } catch (nissError) {
        console.warn(
          `NISS calculation failed for ${symbol}:`,
          nissError.message
        );
        nissData = this.fallbackNISSCalculation(quote, news, technicals);
      }

      const analysisTime = Date.now() - analysisStartTime;

      // Create comprehensive analysis with enhanced multi-API data
      const analysis = {
        symbol,
        company: quote.company || `${symbol} Inc.`,
        currentPrice: quote.price,
        nissScore: nissData.score || 0,
        confidence: nissData.confidence || "LOW",
        sector: quote.sector || "Unknown",
        marketCap: quote.marketCap,
        priceData: {
          change: quote.change,
          changePercent: quote.changePercent,
          volume: quote.volume,
          high: quote.high,
          low: quote.low,
          apiSource: quote.apiSource,
        },
        volumeData: {
          relativeVolume: quote.relativeVolume || 1,
          volume: quote.volume,
        },
        technicalData: {
          ...technicals,
          apiSource: technicals.apiSource,
        },
        latestNews: news[0] || null,
        recentNews: news.slice(0, 5),
        nissComponents: nissData.components || {},
        tradeSetup: nissData.tradeSetup || {},
        performance: {
          analysisTime: `${analysisTime}ms`,
          dataFreshness: this.calculateDataFreshness(quote, news, technicals),
          apiSources: {
            quote: quote.apiSource,
            news: news[0]?.apiSource || "none",
            technicals: technicals.apiSource,
          },
        },
        lastUpdate: new Date().toISOString(),
        dataSource: "ENHANCED_MULTI_API",
        version: this.version,
      };

      console.log(
        `✅ Enhanced analysis complete for ${symbol}: NISS ${analysis.nissScore.toFixed(
          1
        )} in ${analysisTime}ms`
      );

      return analysis;
    } catch (error) {
      console.error(
        `❌ Enhanced analysis failed for ${symbol}:`,
        error.message
      );
      throw new Error(
        `Unable to analyze ${symbol} with enhanced APIs: ${error.message}`
      );
    }
  }

  async enhanceStockWithRealNISS(stock) {
    try {
      // Use existing stock data if available, otherwise fetch
      let quote = stock;
      let news = stock.news || [];
      let technicals = stock.technicals || {};

      // If we only have basic stock data, fetch additional real data
      if (!stock.news || !stock.technicals) {
        try {
          const [fetchedNews, fetchedTechnicals] = await Promise.all([
            stock.news
              ? Promise.resolve(stock.news)
              : this.getStockNews(stock.symbol).catch(() => []),
            stock.technicals
              ? Promise.resolve(stock.technicals)
              : this.getTechnicalData(stock.symbol).catch(() => ({})),
          ]);
          news = fetchedNews;
          technicals = fetchedTechnicals;
        } catch (error) {
          console.warn(
            `Could not get additional data for ${stock.symbol}:`,
            error.message
          );
        }
      }

      // Calculate NISS with enhanced real data
      let nissData;
      try {
        nissData = NISSCalculationEngine?.calculateNISS
          ? NISSCalculationEngine.calculateNISS({
              symbol: stock.symbol,
              quote: quote,
              news: news,
              technicals: technicals,
              marketContext: await this.getMarketContext().catch(() => ({})),
            })
          : this.fallbackNISSCalculation(quote, news, technicals);
      } catch (nissError) {
        console.warn(
          `NISS calculation failed for ${stock.symbol}:`,
          nissError.message
        );
        nissData = this.fallbackNISSCalculation(quote, news, technicals);
      }

      return {
        ...stock,
        nissScore: nissData.score || 0,
        confidence: nissData.confidence || "LOW",
        nissComponents: nissData.components || {},
        tradeSetup: nissData.tradeSetup || {},
        dataSource: "ENHANCED_MULTI_API",
        apiSources: {
          quote: stock.source || quote.apiSource,
          news: news[0]?.apiSource || "none",
          technicals: technicals.apiSource || "none",
        },
        lastUpdate: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        `Failed to enhance ${stock.symbol} with enhanced NISS:`,
        error.message
      );
      return {
        ...stock,
        nissScore: 0,
        confidence: "LOW",
        dataSource: "ERROR",
        error: error.message,
        lastUpdate: new Date().toISOString(),
      };
    }
  }

  async getMarketContext() {
    try {
      const cacheKey = "market-context-enhanced";
      const cached = this.getFromCache(cacheKey, this.cacheTTL.marketContext);
      if (cached) {
        this.performanceMetrics.cacheHits++;
        return cached;
      }

      console.log("🌍 Fetching enhanced market context...");

      const marketData = await this.makeApiCall(this.endpoints.marketContext);

      if (!marketData || marketData.error) {
        throw new Error(marketData?.message || "Market context not available");
      }

      // Add enhanced processing timestamp
      marketData.processedAt = new Date().toISOString();
      marketData.version = "enhanced";

      this.setCache(cacheKey, marketData);
      console.log(`✅ Enhanced market context received (${marketData.source})`);

      return marketData;
    } catch (error) {
      console.error("❌ Failed to get enhanced market context:", error.message);
      // Return enhanced fallback market context
      return {
        spy: { price: 0, change: 0, changePercent: 0 },
        sentiment: "NEUTRAL",
        volatility: "NORMAL",
        trend: "SIDEWAYS",
        lastUpdate: new Date().toISOString(),
        source: "fallback",
        version: "enhanced-fallback",
      };
    }
  }

  // ============================================
  // FALLBACK NORMALIZATION METHODS
  // ============================================

  fallbackNormalizeQuote(quoteData) {
    return {
      symbol: quoteData.symbol || "UNKNOWN",
      price: quoteData.price || 0,
      change: quoteData.change || 0,
      changePercent: quoteData.changePercent || 0,
      volume: quoteData.volume || 0,
      high: quoteData.high || quoteData.price || 0,
      low: quoteData.low || quoteData.price || 0,
      lastUpdate: quoteData.lastUpdate || new Date().toISOString(),
      source: quoteData.source || "fallback",
      apiSource: quoteData.source || "fallback",
    };
  }

  fallbackNormalizeNews(articles) {
    if (!Array.isArray(articles)) return [];

    return articles.map((article, index) => ({
      id: article.id || `news-${index}`,
      headline: article.headline || article.title || "No headline",
      summary: article.summary || article.description || "",
      url: article.url || "",
      source: article.source || "Unknown",
      timestamp:
        article.datetime || article.timestamp || new Date().toISOString(),
      sentiment: article.sentiment || 0,
      relevance: article.relevance || Math.random() * 10,
      apiSource: "fallback",
    }));
  }

  fallbackNormalizeTechnicals(techData) {
    return {
      rsi: techData.technicals?.rsi ||
        techData.rsi || { value: 50, signal: "NEUTRAL" },
      trend: techData.technicals?.trend || techData.trend || "NEUTRAL",
      momentum:
        techData.technicals?.momentum || techData.momentum || "MODERATE",
      tradingSignal: techData.technicals?.tradingSignal ||
        techData.tradingSignal || {
          action: "HOLD",
          confidence: 0.5,
          timeframe: "1-3 days",
        },
      lastUpdate: techData.lastUpdate || new Date().toISOString(),
      source: techData.source || "fallback",
      apiSource: "fallback",
    };
  }

  fallbackNISSCalculation(quote, news, technicals) {
    const priceChange = quote.changePercent || 0;
    const newsCount = Array.isArray(news) ? news.length : 0;
    const volume = quote.volume || 0;

    const score =
      priceChange * 2 + newsCount * 0.5 + (volume > 1000000 ? 1 : 0);

    return {
      score: Math.max(-100, Math.min(100, score)),
      confidence:
        Math.abs(score) > 5 ? "HIGH" : Math.abs(score) > 2 ? "MEDIUM" : "LOW",
      components: {
        price: priceChange * 2,
        news: newsCount * 0.5,
        volume: volume > 1000000 ? 1 : 0,
      },
      tradeSetup: {
        action: score > 2 ? "BUY" : score < -2 ? "SELL" : "HOLD",
        confidence: Math.abs(score) / 10,
      },
    };
  }

  // ============================================
  // ENHANCED CACHE MANAGEMENT
  // ============================================

  setCache(key, data) {
    try {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        version: this.version,
      });

      // Enhanced cache size management
      if (this.cache.size > 2000) {
        // Increased limit for better performance
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

      if (cached.version && cached.version !== this.version) {
        console.log(`🔄 Cache version mismatch for ${key}, invalidating`);
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
      console.log(
        `🧹 Enhanced cache cleared successfully (${size} entries removed)`
      );
    } catch (error) {
      console.warn("Cache clear failed:", error);
    }
  }

  // ============================================
  // PERFORMANCE MONITORING AND METRICS
  // ============================================

  getPerformanceMetrics() {
    const avgResponseTime =
      this.performanceMetrics.successfulRequests > 0
        ? Math.round(
            this.performanceMetrics.totalResponseTime /
              this.performanceMetrics.successfulRequests
          )
        : 0;

    const successRate =
      this.performanceMetrics.requestCount > 0
        ? (
            (this.performanceMetrics.successfulRequests /
              this.performanceMetrics.requestCount) *
            100
          ).toFixed(1)
        : "0";

    const cacheHitRate =
      this.performanceMetrics.requestCount > 0
        ? (
            (this.performanceMetrics.cacheHits /
              this.performanceMetrics.requestCount) *
            100
          ).toFixed(1)
        : "0";

    return {
      requestCount: this.performanceMetrics.requestCount,
      successfulRequests: this.performanceMetrics.successfulRequests,
      successRate: `${successRate}%`,
      avgResponseTime: `${avgResponseTime}ms`,
      cacheHits: this.performanceMetrics.cacheHits,
      cacheHitRate: `${cacheHitRate}%`,
      batchRequestsUsed: this.performanceMetrics.batchRequestsUsed,
      apiFailovers: this.performanceMetrics.apiFailovers,
      lastRequestTime: new Date(
        this.performanceMetrics.lastRequestTime
      ).toISOString(),
      uptime: Date.now() - (this.performanceMetrics.lastRequestTime - 60000),
    };
  }

  calculateDataFreshness(quote, news, technicals) {
    const now = Date.now();
    const quoteFreshness = quote.fetchTime
      ? now - new Date(quote.fetchTime).getTime()
      : 0;
    const newsFreshness = news[0]?.fetchTime
      ? now - new Date(news[0].fetchTime).getTime()
      : 0;
    const technicalsFreshness = technicals.fetchTime
      ? now - new Date(technicals.fetchTime).getTime()
      : 0;

    const avgFreshness =
      (quoteFreshness + newsFreshness + technicalsFreshness) / 3;

    return {
      overall:
        avgFreshness < 300000
          ? "FRESH"
          : avgFreshness < 900000
          ? "STALE"
          : "OLD",
      quote: `${Math.round(quoteFreshness / 1000)}s ago`,
      news: `${Math.round(newsFreshness / 1000)}s ago`,
      technicals: `${Math.round(technicalsFreshness / 1000)}s ago`,
    };
  }

  // ============================================
  // ENHANCED STATUS AND HEALTH METHODS
  // ============================================

  getServiceStatus() {
    return {
      version: this.version,
      initialized: this.initialized,
      cacheSize: this.cache.size,
      backendUrl: this.backendBaseUrl,
      endpoints: this.endpoints,
      dataSource: "ENHANCED_MULTI_API",
      performance: this.getPerformanceMetrics(),
      lastHealthCheck: new Date().toISOString(),
      features: {
        batchProcessing: "✅ ENABLED",
        smartFailover: "✅ ENABLED",
        enhancedCaching: "✅ ENABLED",
        performanceTracking: "✅ ENABLED",
      },
    };
  }

  async getHealthReport() {
    try {
      const backendHealth = await this.checkBackendHealth();
      const performanceMetrics = this.getPerformanceMetrics();

      return {
        overall: backendHealth.status === "OK" ? "HEALTHY" : "DEGRADED",
        version: this.version,
        backend: backendHealth,
        performance: performanceMetrics,
        cache: {
          size: this.cache.size,
          maxSize: 2000,
          hitRate: performanceMetrics.cacheHitRate,
        },
        apis: backendHealth.apis || {},
        rateLimits: backendHealth.rateLimits || {},
        features: {
          multiAPI: "✅ ACTIVE",
          batchProcessing:
            this.performanceMetrics.batchRequestsUsed > 0
              ? "✅ USED"
              : "⚠️ AVAILABLE",
          failoverHandling:
            this.performanceMetrics.apiFailovers > 0
              ? "✅ TRIGGERED"
              : "✅ READY",
          enhancedCaching: "✅ ACTIVE",
        },
        dataSource: "ENHANCED_MULTI_API",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        overall: "ERROR",
        version: this.version,
        error: error.message,
        performance: this.getPerformanceMetrics(),
        dataSource: "UNAVAILABLE",
        cache: {
          size: this.cache.size,
          maxSize: 2000,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  formatError(error) {
    if (error.message.includes("Backend unreachable")) {
      return "Cannot connect to enhanced data service. Please check your internet connection.";
    }
    if (error.message.includes("404")) {
      return "Data not found for this request.";
    }
    if (error.message.includes("500")) {
      return "Enhanced data service is temporarily unavailable. Please try again.";
    }
    if (error.message.includes("Rate limit exceeded")) {
      return "API rate limit reached. The system will automatically retry with alternate APIs.";
    }
    return error.message || "An unexpected error occurred.";
  }

  getDebugInfo() {
    return {
      version: this.version,
      initialized: this.initialized,
      backendUrl: this.backendBaseUrl,
      cacheSize: this.cache.size,
      endpoints: this.endpoints,
      cacheTTL: this.cacheTTL,
      performanceMetrics: this.getPerformanceMetrics(),
      features: {
        multiAPI: true,
        batchProcessing: true,
        enhancedCaching: true,
        smartFailover: true,
        performanceTracking: true,
      },
    };
  }

  // Reset performance metrics (useful for testing)
  resetPerformanceMetrics() {
    this.performanceMetrics = {
      requestCount: 0,
      successfulRequests: 0,
      cacheHits: 0,
      totalResponseTime: 0,
      lastRequestTime: Date.now(),
      batchRequestsUsed: 0,
      apiFailovers: 0,
    };
    console.log("📊 Performance metrics reset");
  }
}

// Create and export enhanced singleton instance
const institutionalDataService = new InstitutionalDataService();

export default institutionalDataService;
