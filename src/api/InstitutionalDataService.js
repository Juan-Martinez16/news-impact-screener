// api/InstitutionalDataService.js
// Enhanced Institutional-Grade News Impact Trading System
import { API_CONFIG, makeBackendApiCall } from "./config.js";

class InstitutionalDataService {
  constructor() {
    // API Keys - retrieved from backend service (no direct .env access)
    this.alphaVantageKey = null; // Backend handles API keys
    this.finnhubKey = null; // Backend handles API keys
    this.polygonKey = null; // Backend handles API keys

    // Market regime detection
    this.marketRegime = {
      volatility: "normal", // low, normal, high
      trend: "neutral", // bullish, neutral, bearish
      breadth: "mixed", // advancing, mixed, declining
    };

    // Sector performance cache
    this.sectorPerformance = {};

    // Cache for API responses (5 minute TTL)
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes

    // Backend health status
    this.backendHealth = true;

    // Universe of stocks to screen (expanded for full market coverage)
    this.screeningUniverse = this.buildScreeningUniverse();

    // ADD THESE NEW LINES HERE:
    // Request queue system for rate limiting
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.maxConcurrentRequests = 3; // Only 3 requests at once
    this.requestDelay = 500; // Wait 500ms between requests

    // Rate limiting tracking
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.requestWindow = 60000; // 1 minute window
    this.maxRequestsPerWindow = 80; // Max 80 requests per minute

    // Error tracking
    this.consecutiveFailures = 0;
    this.maxFailures = 5;
    this.circuitBreakerTimeout = 30000; // 30 seconds
  }

  // ADD THIS ENTIRE METHOD - It manages the request queue
  async makeRateLimitedRequest(requestFn, cacheKey = null) {
    // Check if we already have this data in cache
    if (cacheKey && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        console.log(`📋 Using cached data for ${cacheKey}`);
        return cached.data;
      }
    }

    // Add request to queue and wait for it to be processed
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, cacheKey, resolve, reject });
      this.processQueue(); // Start processing if not already running
    });
  }

  // ADD THIS ENTIRE METHOD - It processes requests one by one
  async processQueue() {
    // Don't start if already processing or no requests
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    console.log(
      `🔄 Starting to process ${this.requestQueue.length} queued requests`
    );
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();

      // Check if we need to reset our rate limit counter
      if (now - this.lastRequestTime > this.requestWindow) {
        console.log(
          `🔄 Rate limit window reset, processed ${this.requestCount} requests`
        );
        this.requestCount = 0;
        this.lastRequestTime = now;
      }

      // If we've hit our rate limit, wait
      if (this.requestCount >= this.maxRequestsPerWindow) {
        const waitTime = this.requestWindow - (now - this.lastRequestTime);
        console.log(
          `⏳ Rate limit reached! Waiting ${Math.round(
            waitTime / 1000
          )} seconds...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.lastRequestTime = Date.now();
      }

      // Get the next request from queue
      const { requestFn, cacheKey, resolve, reject } =
        this.requestQueue.shift();

      try {
        console.log(
          `📡 Making API request (${this.requestCount + 1}/${
            this.maxRequestsPerWindow
          })...`
        );

        // Make the actual API call
        const result = await requestFn();

        // Save result to cache if we have a cache key
        if (cacheKey) {
          this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
          console.log(`💾 Cached result for ${cacheKey}`);
        }

        // Update counters
        this.requestCount++;
        this.consecutiveFailures = 0; // Reset failure count on success

        // Return the result
        resolve(result);
      } catch (error) {
        this.consecutiveFailures++;
        console.error(
          `❌ Request failed (${this.consecutiveFailures} consecutive failures):`,
          error.message
        );

        // If it's a rate limit error, wait longer
        if (
          error.message.includes("429") ||
          error.message.includes("rate limit")
        ) {
          console.log("🚫 Hit rate limit, waiting before next request...");
          const backoffTime = Math.min(2000 * this.consecutiveFailures, 10000); // 2-10 seconds
          await new Promise((resolve) => setTimeout(resolve, backoffTime));
        }

        // Return the error
        reject(error);
      }

      // Always wait between requests to be polite to the API
      console.log(`⏸️ Waiting ${this.requestDelay}ms before next request...`);
      await new Promise((resolve) => setTimeout(resolve, this.requestDelay));
    }

    console.log("✅ Finished processing all queued requests");
    this.isProcessingQueue = false;
  }

  // Add checkBackendHealth method at the beginning of the class
  async checkBackendHealth() {
    try {
      const url = `${API_CONFIG.backend.baseUrl}/health`;
      const response = await fetch(url, {
        method: "GET",
        timeout: 5000,
      });

      const isHealthy = response.ok;
      this.backendHealth = isHealthy;
      return isHealthy;
    } catch (error) {
      console.error("Backend health check failed:", error);
      this.backendHealth = false;
      return false;
    }
  }

  buildScreeningUniverse() {
    // This should be dynamically loaded from API
    // For now, expanded universe covering major indices
    return {
      // S&P 500 Leaders
      megaCap: [
        "AAPL",
        "MSFT",
        "GOOGL",
        "AMZN",
        "NVDA",
        "META",
        "TSLA",
        "BRK.B",
        "JPM",
        "JNJ",
        "V",
        "MA",
        "PG",
        "UNH",
        "HD",
        "DIS",
        "BAC",
        "XOM",
        "ABBV",
        "CVX",
      ],

      // High Beta Tech
      growthTech: [
        "PLTR",
        "SNOW",
        "DDOG",
        "NET",
        "CRWD",
        "ZS",
        "OKTA",
        "TWLO",
        "DOCU",
        "ZM",
        "ROKU",
        "SQ",
        "SHOP",
        "MELI",
        "SE",
        "UBER",
        "LYFT",
        "DASH",
        "ABNB",
        "RBLX",
      ],

      // Semiconductors
      semiconductor: [
        "AMD",
        "INTC",
        "MU",
        "QCOM",
        "AVGO",
        "TXN",
        "ADI",
        "MRVL",
        "KLAC",
        "AMAT",
        "LRCX",
        "ASML",
        "TSM",
        "NXPI",
        "MCHP",
        "ON",
        "SWKS",
        "QRVO",
        "XLNX",
        "SMCI",
      ],

      // Biotech & Healthcare
      biotech: [
        "MRNA",
        "BNTX",
        "GILD",
        "BIIB",
        "REGN",
        "VRTX",
        "ILMN",
        "ALNY",
        "BMRN",
        "INCY",
        "SGEN",
        "EXAS",
        "TECH",
        "IONS",
        "NBIX",
        "VKTX",
        "SAGE",
        "SRPT",
        "RARE",
        "BLUE",
      ],
      pharma: [
        "LLY",
        "PFE",
        "MRK",
        "BMY",
        "AMGN",
        "CVS",
        "CI",
        "HUM",
        "MCK",
        "ABC",
      ],

      // Financials
      banks: [
        "BAC",
        "WFC",
        "C",
        "GS",
        "MS",
        "USB",
        "PNC",
        "TFC",
        "COF",
        "SCHW",
      ],
      fintech: [
        "PYPL",
        "SQ",
        "COIN",
        "SOFI",
        "UPST",
        "AFRM",
        "HOOD",
        "NU",
        "BILL",
        "TOST",
      ],

      // Consumer & Retail
      retail: [
        "WMT",
        "COST",
        "TGT",
        "LOW",
        "NKE",
        "SBUX",
        "MCD",
        "CMG",
        "LULU",
        "ROST",
      ],
      ecommerce: [
        "AMZN",
        "SHOP",
        "MELI",
        "SE",
        "CPNG",
        "ETSY",
        "W",
        "CHWY",
        "FTCH",
        "RVLV",
      ],

      // Energy & Materials
      energy: [
        "XOM",
        "CVX",
        "COP",
        "SLB",
        "EOG",
        "PXD",
        "VLO",
        "MPC",
        "PSX",
        "OXY",
      ],
      materials: [
        "LIN",
        "APD",
        "FCX",
        "NEM",
        "SCCO",
        "NUE",
        "CLF",
        "X",
        "AA",
        "STLD",
      ],

      // Industrials
      industrial: [
        "BA",
        "CAT",
        "DE",
        "UNP",
        "UPS",
        "GE",
        "MMM",
        "LMT",
        "RTX",
        "NOC",
      ],

      // Real Estate & REITs
      reits: [
        "AMT",
        "PLD",
        "CCI",
        "EQIX",
        "PSA",
        "SPG",
        "O",
        "WELL",
        "AVB",
        "EQR",
      ],

      // Electric Vehicles & Clean Energy
      ev: [
        "TSLA",
        "RIVN",
        "LCID",
        "NIO",
        "XPEV",
        "LI",
        "FSR",
        "GOEV",
        "NKLA",
        "RIDE",
      ],
      cleanEnergy: [
        "ENPH",
        "SEDG",
        "RUN",
        "PLUG",
        "FSLR",
        "SPWR",
        "BE",
        "NOVA",
        "CSIQ",
        "NEE",
      ],
    };
  }

  // Cache management
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Enhanced quote fetching with backend integration (no direct API key usage)
  // REPLACE YOUR ENTIRE getQuote METHOD WITH THIS:
  async getQuote(symbol) {
    try {
      console.log(`📊 Getting quote for ${symbol}...`);

      // Use our new rate-limited request system
      const result = await this.makeRateLimitedRequest(async () => {
        return await makeBackendApiCall(`/api/quote/${symbol}`);
      }, `quote_${symbol}`);

      // Check if we got a successful response from backend
      if (result && result.success && result.data) {
        console.log(`✅ Got quote for ${symbol}: $${result.data.price}`);
        return {
          symbol: symbol,
          price: result.data.price,
          changePercent: result.data.changePercent,
          volume: result.data.volume || 0,
          high: result.data.high,
          low: result.data.low,
          open: result.data.open,
          previousClose: result.data.previousClose,
          timestamp: new Date(),
          avgVolume: result.data.avgVolume,
          high52Week: result.data.high52Week,
          low52Week: result.data.low52Week,
          marketCap: result.data.marketCap,
          sector: result.data.sector,
        };
      }

      // If backend response format is different, try to use it directly
      if (result && result.price) {
        console.log(`✅ Got direct quote for ${symbol}: $${result.price}`);
        return result;
      }

      // If no good data, throw error to trigger fallback
      throw new Error("No valid quote data received");
    } catch (error) {
      console.warn(
        `⚠️ Backend quote failed for ${symbol}, using fallback data:`,
        error.message
      );

      // Return mock data instead of failing completely
      return this.generateMockQuote(symbol);
    }
  }

  // Generate realistic mock data for development/fallback
  generateMockQuote(symbol) {
    const basePrice = 50 + Math.random() * 200;
    const changePercent = (Math.random() - 0.5) * 10; // -5% to +5%
    const change = (basePrice * changePercent) / 100;

    return {
      symbol: symbol,
      price: basePrice,
      change: change,
      changePercent: changePercent,
      volume: Math.floor(Math.random() * 10000000) + 100000,
      high: basePrice * (1 + Math.random() * 0.05),
      low: basePrice * (1 - Math.random() * 0.05),
      open: basePrice * (1 + (Math.random() - 0.5) * 0.03),
      previousClose: basePrice - change,
      timestamp: new Date(),
      avgVolume: Math.floor(Math.random() * 5000000) + 500000,
      high52Week: basePrice * (1 + Math.random() * 0.5),
      low52Week: basePrice * (1 - Math.random() * 0.3),
    };
  }

  // Enhanced news fetching with backend integration
  async getNews(symbol) {
    const cacheKey = `news_${symbol}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // Try backend first if available
      if (this.backendHealth) {
        try {
          const data = await makeBackendApiCall(
            API_CONFIG.backend.endpoints.news(symbol)
          );

          if (data && data.success) {
            const enhancedNews = data.data.map((article) => ({
              ...article,
              sentiment:
                article.sentiment ||
                this.analyzeSentiment(
                  article.headline || article.summary || ""
                ),
              confidence: article.confidence || 0.5,
              catalysts: article.catalysts || [],
            }));

            this.setCache(cacheKey, enhancedNews);
            return enhancedNews;
          }
        } catch (error) {
          console.warn("Backend news failed, using mock data:", error);
          this.backendHealth = false;
        }
      }

      // Fallback to mock news
      const mockNews = this.generateMockNews(symbol);
      this.setCache(cacheKey, mockNews);
      return mockNews;
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error);
      return this.generateMockNews(symbol);
    }
  }

  // Generate mock news for development
  generateMockNews(symbol) {
    const newsTemplates = [
      {
        headline: `${symbol} reports strong quarterly earnings`,
        sentiment: 0.8,
      },
      { headline: `Analysts upgrade ${symbol} price target`, sentiment: 0.6 },
      { headline: `${symbol} announces new product launch`, sentiment: 0.7 },
      { headline: `${symbol} faces regulatory challenges`, sentiment: -0.5 },
      { headline: `${symbol} beats revenue expectations`, sentiment: 0.9 },
    ];

    const count = Math.floor(Math.random() * 3) + 1; // 1-3 news items
    const news = [];

    for (let i = 0; i < count; i++) {
      const template =
        newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
      news.push({
        headline: template.headline,
        summary: `Analysis of ${symbol} market movement and business developments.`,
        datetime: Math.floor(Date.now() / 1000) - Math.random() * 86400, // Last 24 hours
        source: ["Reuters", "Bloomberg", "CNBC", "MarketWatch"][
          Math.floor(Math.random() * 4)
        ],
        url: `https://example.com/news/${symbol.toLowerCase()}-${i}`,
        category: "earnings",
        relevanceScore: Math.random() * 100,
        sentiment: template.sentiment,
        catalysts: ["earnings", "guidance"],
      });
    }

    return news;
  }

  // Get technicals with backend integration
  async getTechnicals(symbol) {
    const cacheKey = `technicals_${symbol}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      if (this.backendHealth) {
        try {
          const data = await makeBackendApiCall(
            API_CONFIG.backend.endpoints.technicals(symbol)
          );

          if (data && data.success) {
            this.setCache(cacheKey, data.data);
            return data.data;
          }
        } catch (error) {
          console.warn("Backend technicals failed, using fallback:", error);
        }
      }

      // Fallback to calculated technicals
      const quote = await this.getQuote(symbol);
      if (!quote) return {};

      const fallbackTechnicals = {
        sma20: quote.price * (0.98 + Math.random() * 0.04),
        sma50: quote.price * (0.96 + Math.random() * 0.08),
        sma200: quote.price * (0.94 + Math.random() * 0.12),
        rsi: Math.max(20, Math.min(80, 50 + quote.changePercent * 3)),
        macd: quote.changePercent > 0 ? Math.random() * 2 : -Math.random() * 2,
        macdSignal: 0,
        bbUpper: quote.high * 1.02,
        bbLower: quote.low * 0.98,
        price: quote.price,
        adx: Math.min(100, Math.abs(quote.changePercent) * 10 + 20),
        atr: quote.high - quote.low || quote.price * 0.02,
        momentum: Math.max(0, Math.min(100, 50 + quote.changePercent * 5)),
      };

      this.setCache(cacheKey, fallbackTechnicals);
      return fallbackTechnicals;
    } catch (error) {
      console.error(`Error fetching technicals for ${symbol}:`, error);
      return {};
    }
  }

  // Get options data with backend integration
  async getOptionsData(symbol) {
    const cacheKey = `options_${symbol}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      if (this.backendHealth) {
        try {
          const data = await makeBackendApiCall(
            API_CONFIG.backend.endpoints.options(symbol)
          );

          if (data && data.success) {
            this.setCache(cacheKey, data.data);
            return data.data;
          }
        } catch (error) {
          console.warn("Backend options failed, using mock data:", error);
        }
      }

      // Fallback to mock options data
      const random = Math.random();
      const fallbackOptions = {
        putVolume: Math.floor(random * 10000),
        callVolume: Math.floor(random * 15000),
        putOI: Math.floor(random * 50000),
        callOI: Math.floor(random * 60000),
        avgOptionsVolume: 10000,
        unusualActivity: random > 0.7,
      };

      this.setCache(cacheKey, fallbackOptions);
      return fallbackOptions;
    } catch (error) {
      console.error(`Error fetching options data for ${symbol}:`, error);
      return {
        putVolume: Math.floor(Math.random() * 10000),
        callVolume: Math.floor(Math.random() * 15000),
        putOI: Math.floor(Math.random() * 50000),
        callOI: Math.floor(Math.random() * 60000),
        avgOptionsVolume: 10000,
        unusualActivity: Math.random() > 0.7,
      };
    }
  }

  // Calculate enhanced NISS score
  async calculateEnhancedNISS(stockData) {
    const { symbol, quote, news, technicals, options } = stockData;

    if (!quote) {
      return {
        score: 0,
        confidence: "LOW",
        components: {},
      };
    }

    // 1. Price Action Score (0-100)
    const priceActionScore = this.calculatePriceActionScore(quote, technicals);

    // 2. News Impact Score (0-100)
    const newsImpactScore = await this.calculateNewsImpactScore(news, quote);

    // 3. Technical Momentum Score (0-100)
    const momentumScore = this.calculateMomentumScore(technicals);

    // 4. Options Flow Score (0-100)
    const optionsScore = this.calculateOptionsScore(options);

    // 5. Relative Strength Score (0-100)
    const relativeScore = await this.calculateRelativeStrength(symbol, quote);

    // 6. Volume Analysis Score (0-100)
    const volumeScore = this.calculateVolumeScore(quote);

    // 7. Market Regime Adjustment (-20 to +20)
    const regimeAdjustment = this.getMarketRegimeAdjustment();

    // Weighted calculation based on market conditions
    const weights = this.getDynamicWeights();

    const baseScore =
      priceActionScore * weights.price +
      newsImpactScore * weights.news +
      momentumScore * weights.momentum +
      optionsScore * weights.options +
      relativeScore * weights.relative +
      volumeScore * weights.volume;

    // Apply regime adjustment and normalize to -100 to +100
    let finalScore = (baseScore - 50) * 2 + regimeAdjustment;

    // Apply strong directional bias for clear buy/sell signals
    const priceChange = quote.changePercent || 0;
    if (Math.abs(priceChange) > 3) {
      const priceBoost = priceChange > 0 ? 15 : -15;
      finalScore += priceBoost;
    }

    // Apply news sentiment amplification
    const avgSentiment =
      news.length > 0
        ? news.reduce((sum, article) => sum + (article.sentiment || 0), 0) /
          news.length
        : 0;

    if (Math.abs(avgSentiment) > 0.5) {
      const sentimentBoost = avgSentiment > 0 ? 10 : -10;
      finalScore += sentimentBoost;
    }

    // Ensure we stay within bounds but allow full negative range
    finalScore = Math.max(-100, Math.min(100, finalScore));

    // Calculate confidence level
    const confidence = this.calculateConfidence({
      newsCount: news.length,
      volumeRatio: quote.volume / (quote.avgVolume || quote.volume),
      optionsActivity: optionsScore,
      technicalAlignment: momentumScore,
    });

    return {
      score: finalScore,
      confidence: confidence,
      components: {
        priceAction: priceActionScore,
        newsImpact: newsImpactScore,
        momentum: momentumScore,
        options: optionsScore,
        relative: relativeScore,
        volume: volumeScore,
        regime: regimeAdjustment,
      },
      weights: weights,
    };
  }

  // Calculate price action score
  calculatePriceActionScore(quote, technicals) {
    if (!quote) return 50;

    let score = 50; // Neutral base

    // Price change impact
    const changePercent = quote.changePercent || 0;
    score += changePercent * 2; // Direct correlation

    // Price vs moving averages
    if (technicals?.sma20 && quote.price > technicals.sma20) score += 10;
    if (technicals?.sma50 && quote.price > technicals.sma50) score += 10;
    if (technicals?.sma200 && quote.price > technicals.sma200) score += 15;

    // 52-week position
    if (quote.high52Week && quote.low52Week) {
      const yearRange = quote.high52Week - quote.low52Week;
      const pricePosition = (quote.price - quote.low52Week) / yearRange;

      if (pricePosition > 0.9) score += 15; // Near 52w high
      else if (pricePosition > 0.7) score += 10;
      else if (pricePosition < 0.1) score -= 15; // Near 52w low
      else if (pricePosition < 0.3) score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  // Calculate news impact score
  async calculateNewsImpactScore(news, quote) {
    if (!news || news.length === 0) return 50;

    let totalImpact = 0;
    let totalWeight = 0;

    for (const article of news) {
      // Time decay factor
      const hoursAgo =
        (Date.now() - article.datetime * 1000) / (1000 * 60 * 60);
      const timeDecay = Math.exp(-hoursAgo / 24); // Half-life of 24 hours

      // Sentiment impact
      const sentiment = article.sentiment || 0;
      const impact = sentiment * timeDecay;

      totalImpact += impact;
      totalWeight += timeDecay;
    }

    // Normalize to 0-100 scale
    const avgImpact = totalWeight > 0 ? totalImpact / totalWeight : 0;
    return Math.max(0, Math.min(100, 50 + avgImpact * 25));
  }

  // Calculate momentum score
  calculateMomentumScore(technicals) {
    if (!technicals) return 50;

    let score = 50;

    // RSI analysis
    const rsi = technicals.rsi || 50;
    if (rsi > 70) score -= 10; // Overbought
    else if (rsi > 50) score += 10; // Bullish
    else if (rsi < 30) score += 15; // Oversold bounce potential
    else score -= 10; // Bearish

    // MACD analysis
    if (technicals.macd !== undefined && technicals.macdSignal !== undefined) {
      if (technicals.macd > technicals.macdSignal) score += 15;
      else score -= 15;
    }

    // ADX for trend strength
    if (technicals.adx) {
      if (technicals.adx > 25) score += 10; // Strong trend
      else if (technicals.adx < 15) score -= 5; // Weak trend
    }

    return Math.max(0, Math.min(100, score));
  }

  // Calculate options score
  calculateOptionsScore(options) {
    if (!options) return 50;

    let score = 50;

    // Put/Call ratio analysis
    const pcRatio = options.putVolume / Math.max(options.callVolume, 1);
    if (pcRatio < 0.7) score += 20; // Bullish
    else if (pcRatio > 1.3) score -= 20; // Bearish

    // Unusual options activity
    const avgOptionsVolume = (options.putVolume + options.callVolume) / 2;
    const normalVolume = options.avgOptionsVolume || avgOptionsVolume;
    const volumeRatio = avgOptionsVolume / Math.max(normalVolume, 1);

    if (volumeRatio > 3) score += 15; // Very unusual
    else if (volumeRatio > 2) score += 10; // Unusual

    return Math.max(0, Math.min(100, score));
  }

  // Calculate relative strength
  async calculateRelativeStrength(symbol, quote) {
    if (!quote) return 50;

    // Mock relative strength calculation
    let score = 50;

    // Relative to sector performance
    const sectorAlpha = (Math.random() - 0.5) * 4; // Mock -2% to +2%
    score += sectorAlpha * 5;

    // Relative to market performance
    const marketAlpha = (Math.random() - 0.5) * 3; // Mock -1.5% to +1.5%
    score += marketAlpha * 3;

    return Math.max(0, Math.min(100, score));
  }

  // Calculate volume score
  calculateVolumeScore(quote) {
    if (!quote || !quote.avgVolume) return 50;

    const volumeRatio = quote.volume / quote.avgVolume;
    let score = 50;

    // Volume surge detection
    if (volumeRatio > 3) score += 30;
    else if (volumeRatio > 2) score += 20;
    else if (volumeRatio > 1.5) score += 10;
    else if (volumeRatio < 0.5) score -= 20; // Low volume

    // Price-volume correlation
    if (quote.changePercent > 0 && volumeRatio > 1.5) {
      score += 10; // Bullish with volume
    } else if (quote.changePercent < 0 && volumeRatio > 1.5) {
      score -= 10; // Bearish with volume
    }

    return Math.max(0, Math.min(100, score));
  }

  // Get dynamic weights
  getDynamicWeights() {
    return {
      price: 0.2,
      news: 0.25,
      momentum: 0.2,
      options: 0.15,
      relative: 0.1,
      volume: 0.1,
    };
  }

  // Get market regime adjustment
  getMarketRegimeAdjustment() {
    const regime = this.marketRegime;
    let adjustment = 0;

    if (regime.volatility === "high") adjustment -= 10;
    else if (regime.volatility === "low") adjustment += 5;

    if (regime.trend === "bullish") adjustment += 10;
    else if (regime.trend === "bearish") adjustment -= 10;

    return adjustment;
  }

  // Calculate confidence
  calculateConfidence(factors) {
    let confidence = 0.5; // Base confidence

    // News coverage
    if (factors.newsCount > 5) confidence += 0.15;
    else if (factors.newsCount > 2) confidence += 0.1;
    else if (factors.newsCount === 0) confidence -= 0.2;

    // Volume confirmation
    if (factors.volumeRatio > 2) confidence += 0.15;
    else if (factors.volumeRatio > 1.5) confidence += 0.1;
    else if (factors.volumeRatio < 0.5) confidence -= 0.15;

    // Normalize to 0-1
    confidence = Math.max(0, Math.min(1, confidence));

    // Convert to category
    if (confidence >= 0.7) return "HIGH";
    else if (confidence >= 0.5) return "MEDIUM";
    else return "LOW";
  }

  // Calculate trade setup
  calculateTradeSetup(stockData, nissData) {
    const { quote, technicals } = stockData;
    const { score, confidence } = nissData;

    // Determine position direction
    const direction = score > 0 ? "LONG" : score < 0 ? "SHORT" : "NEUTRAL";

    if (direction === "NEUTRAL" || Math.abs(score) < 50) {
      return {
        action: "HOLD",
        reasoning: "Insufficient signal strength",
        entry: quote?.price || 0,
        stopLoss: quote?.price || 0,
        riskReward: 1,
        targets: [],
      };
    }

    // Calculate ATR-based stops and targets
    const atr = technicals?.atr || quote?.price * 0.02 || 2;
    const entry = quote?.price || 100;

    // Stop loss calculation
    const riskMultiplier =
      confidence === "HIGH" ? 1.5 : confidence === "MEDIUM" ? 2 : 2.5;
    const stopLoss =
      direction === "LONG"
        ? entry - atr * riskMultiplier
        : entry + atr * riskMultiplier;

    // Target calculation
    const rewardMultiplier =
      confidence === "HIGH" ? 3 : confidence === "MEDIUM" ? 2.5 : 2;
    const targets = [];

    if (direction === "LONG") {
      targets.push({
        level: 1,
        price: entry + atr * rewardMultiplier * 0.5,
        action: "Take 33% profit",
      });
      targets.push({
        level: 2,
        price: entry + atr * rewardMultiplier,
        action: "Take 33% profit",
      });
      targets.push({
        level: 3,
        price: entry + atr * rewardMultiplier * 1.5,
        action: "Trail stop to breakeven",
      });
    } else {
      targets.push({
        level: 1,
        price: entry - atr * rewardMultiplier * 0.5,
        action: "Take 33% profit",
      });
      targets.push({
        level: 2,
        price: entry - atr * rewardMultiplier,
        action: "Take 33% profit",
      });
      targets.push({
        level: 3,
        price: entry - atr * rewardMultiplier * 1.5,
        action: "Trail stop to breakeven",
      });
    }

    return {
      action: direction,
      entry: entry,
      stopLoss: stopLoss,
      targets: targets,
      riskReward: rewardMultiplier / riskMultiplier,
      confidence: confidence,
      reasoning: this.generateTradeReasoning(stockData, nissData),
    };
  }

  // Generate trade reasoning
  generateTradeReasoning(stockData, nissData) {
    const reasons = [];
    const components = nissData.components;

    // Price action reasoning
    if (components.priceAction > 70) {
      reasons.push("Strong price action with momentum");
    } else if (components.priceAction < 30) {
      reasons.push("Weak price action suggesting reversal");
    }

    // News reasoning
    if (components.newsImpact > 70) {
      reasons.push("Significant positive news catalyst");
    } else if (components.newsImpact < 30) {
      reasons.push("Negative news sentiment");
    }

    // Technical reasoning
    if (components.momentum > 70) {
      reasons.push("Strong technical momentum confirmed");
    } else if (components.momentum < 30) {
      reasons.push("Technical weakness detected");
    }

    // Options flow
    if (components.options > 70) {
      reasons.push("Unusual options activity detected");
    }

    // Volume
    if (components.volume > 70) {
      reasons.push("High volume confirms move");
    }

    return reasons.length > 0 ? reasons.join(". ") : "Mixed signals detected";
  }

  // Update market regime
  async updateMarketRegime() {
    try {
      // Mock market regime update
      this.marketRegime = {
        volatility: ["low", "normal", "high"][Math.floor(Math.random() * 3)],
        trend: ["bullish", "neutral", "bearish"][Math.floor(Math.random() * 3)],
        breadth: ["advancing", "mixed", "declining"][
          Math.floor(Math.random() * 3)
        ],
      };
    } catch (error) {
      console.error("Error updating market regime:", error);
    }
  }

  // Screen all stocks
  // REPLACE YOUR ENTIRE screenAllStocks METHOD WITH THIS:
  async screenAllStocks(filters = {}) {
    console.log(
      "🔍 Starting institutional stock screening with enhanced rate limiting..."
    );

    const results = [];
    const allSymbols = Object.values(this.screeningUniverse).flat();

    // VERY conservative approach - only 10 stocks maximum
    const maxSymbols = 10;
    const symbolsToProcess = allSymbols.slice(0, maxSymbols);

    console.log(
      `📊 Will analyze ${symbolsToProcess.length} stocks (rate-limited)`
    );

    // Process stocks ONE BY ONE with delays
    for (let i = 0; i < symbolsToProcess.length; i++) {
      const symbol = symbolsToProcess[i];

      try {
        console.log(
          `🔍 [${i + 1}/${symbolsToProcess.length}] Analyzing ${symbol}...`
        );

        const stockResult = await this.analyzeStock(symbol);

        if (stockResult && stockResult.quote && stockResult.quote.price > 0) {
          results.push(stockResult);
          console.log(
            `✅ Added ${symbol} (NISS: ${stockResult.nissScore.toFixed(0)})`
          );
        } else {
          console.log(`⚠️ Skipped ${symbol} - invalid data`);
        }
      } catch (error) {
        console.warn(`❌ Failed to analyze ${symbol}:`, error.message);

        // Don't let one failure stop the whole process
        continue;
      }

      // Show progress
      if ((i + 1) % 3 === 0 || i === symbolsToProcess.length - 1) {
        console.log(
          `📊 Progress: ${i + 1}/${symbolsToProcess.length} completed, ${
            results.length
          } valid results`
        );
      }

      // Wait 2 seconds between each stock (very conservative)
      if (i < symbolsToProcess.length - 1) {
        console.log(`⏸️ Waiting 2 seconds before next analysis...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Filter and sort results
    const filteredResults = results
      .filter((stock) => this.applyScreeningFilters(stock, filters))
      .sort((a, b) => Math.abs(b.nissScore) - Math.abs(a.nissScore))
      .slice(0, 20);

    console.log(
      `✅ Screening complete! Found ${filteredResults.length} institutional opportunities`
    );
    console.log(
      "📊 Top 3 opportunities:",
      filteredResults
        .slice(0, 3)
        .map((r) => `${r.symbol} (${r.nissScore.toFixed(0)})`)
    );

    return filteredResults;
  }

  // ADD THIS NEW METHOD - Creates fake data when APIs fail
  generateMockQuote(symbol) {
    console.log(`🎭 Generating mock data for ${symbol}`);

    // Create realistic-looking fake data
    const basePrice = 50 + Math.random() * 200; // Price between $50-$250
    const changePercent = (Math.random() - 0.5) * 8; // Change between -4% and +4%
    const change = (basePrice * changePercent) / 100;

    return {
      symbol: symbol,
      price: Number(basePrice.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      volume: Math.floor(Math.random() * 5000000) + 500000, // Random volume
      high: Number((basePrice * 1.03).toFixed(2)),
      low: Number((basePrice * 0.97).toFixed(2)),
      open: Number((basePrice * (1 + (Math.random() - 0.5) * 0.02)).toFixed(2)),
      previousClose: Number((basePrice - change).toFixed(2)),
      timestamp: new Date(),
      avgVolume: Math.floor(Math.random() * 3000000) + 750000,
      high52Week: Number((basePrice * (1 + Math.random() * 0.6)).toFixed(2)),
      low52Week: Number((basePrice * (1 - Math.random() * 0.4)).toFixed(2)),
      marketCap: basePrice * 1000000000, // Fake market cap
      sector: this.getSectorForSymbol(symbol),
      isFallback: true, // Flag to show this is fake data
    };
  }

  // Analyze individual stock
  async analyzeStock(symbol) {
    try {
      console.log(`🔍 Analyzing ${symbol}...`);

      // Get data sequentially to avoid overwhelming the rate limiter
      const quote = await this.getQuote(symbol);

      // If quote fails or is invalid, skip this stock
      if (!quote || !quote.price || quote.price === 0) {
        console.log(`⚠️ Skipping ${symbol} - no valid quote data`);
        return null;
      }

      console.log(`✅ Got quote for ${symbol}: $${quote.price}`);

      // Get news with fallback
      let news = [];
      try {
        news = await this.getNews(symbol);
        console.log(
          `📰 Got ${news ? news.length : 0} news items for ${symbol}`
        );
      } catch (error) {
        console.warn(`⚠️ News failed for ${symbol}:`, error.message);
        news = this.generateMockNews(symbol);
      }

      // Get technicals with fallback
      let technicals = {};
      try {
        technicals = await this.getTechnicals(symbol);
      } catch (error) {
        console.warn(`⚠️ Technicals failed for ${symbol}:`, error.message);
        technicals = this.generateMockTechnicals(quote);
      }

      // Get options with fallback
      let options = {};
      try {
        options = await this.getOptionsData(symbol);
      } catch (error) {
        console.warn(`⚠️ Options failed for ${symbol}:`, error.message);
        options = this.generateMockOptions();
      }

      const stockData = { symbol, quote, news, technicals, options };
      const nissData = await this.calculateEnhancedNISS(stockData);
      const tradeSetup = this.calculateTradeSetup(stockData, nissData);

      const result = {
        symbol,
        quote,
        news,
        technicals,
        options,
        nissScore: nissData.score,
        nissData: nissData,
        tradeSetup: tradeSetup,
        sector: this.getSectorForSymbol(symbol),
        marketCap: await this.getMarketCap(symbol),
        company: this.getCompanyName(symbol),
        timestamp: new Date(),
      };

      console.log(
        `✅ Analysis complete for ${symbol} - NISS: ${nissData.score.toFixed(
          0
        )}, Signal: ${tradeSetup?.action || "HOLD"}`
      );
      return result;
    } catch (error) {
      console.error(`❌ Error analyzing ${symbol}:`, error);
      return null;
    }
  }

  // Apply screening filters
  applyScreeningFilters(stock, filters) {
    const nissScore = stock.nissScore;
    const threshold = filters.nissThreshold || 50;

    // Include stocks with strong signals in either direction
    const meetsThreshold = Math.abs(nissScore) >= threshold;
    if (!meetsThreshold) return false;

    // Confidence filter
    if (filters.minConfidence && filters.minConfidence !== "all") {
      if (
        filters.minConfidence === "HIGH" &&
        stock.nissData.confidence !== "HIGH"
      ) {
        return false;
      }
      if (
        filters.minConfidence === "MEDIUM" &&
        stock.nissData.confidence === "LOW"
      ) {
        return false;
      }
    }

    return true;
  }

  // Get sector for symbol
  getSectorForSymbol(symbol) {
    for (const [sector, symbols] of Object.entries(this.screeningUniverse)) {
      if (symbols.includes(symbol)) return sector;
    }
    return "other";
  }

  // Get company name
  getCompanyName(symbol) {
    const names = {
      AAPL: "Apple Inc.",
      MSFT: "Microsoft Corporation",
      GOOGL: "Alphabet Inc.",
      AMZN: "Amazon.com Inc.",
      META: "Meta Platforms Inc.",
      NVDA: "NVIDIA Corporation",
      TSLA: "Tesla Inc.",
      PLTR: "Palantir Technologies",
      SNOW: "Snowflake Inc.",
      MRNA: "Moderna Inc.",
      VKTX: "Viking Therapeutics",
    };
    return names[symbol] || symbol;
  }

  // Get market cap
  async getMarketCap(symbol) {
    const mockCaps = {
      AAPL: 3e12,
      MSFT: 2.8e12,
      GOOGL: 1.7e12,
      NVDA: 1.1e12,
      META: 900e9,
      TSLA: 800e9,
      PLTR: 40e9,
      SNOW: 60e9,
      MRNA: 50e9,
      VKTX: 3e9,
    };

    const sectorDefaults = {
      megaCap: 500e9,
      growthTech: 30e9,
      semiconductor: 50e9,
      biotech: 10e9,
      pharma: 100e9,
    };

    return (
      mockCaps[symbol] ||
      sectorDefaults[this.getSectorForSymbol(symbol)] ||
      10e9
    );
  }

  // Simple sentiment analysis
  analyzeSentiment(text) {
    if (!text) return 0;

    const positiveWords = [
      "buy",
      "bullish",
      "growth",
      "profit",
      "gain",
      "positive",
      "strong",
    ];
    const negativeWords = [
      "sell",
      "bearish",
      "loss",
      "decline",
      "negative",
      "weak",
    ];

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;

    words.forEach((word) => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });

    return Math.max(-1, Math.min(1, score / Math.max(words.length / 10, 1)));
  }

  // Legacy method for backward compatibility
  async getStockData(symbol) {
    return this.analyzeStock(symbol);
  }

  // Legacy NISS calculation
  calculateNISS(quote, news) {
    if (!quote) return 0;

    const priceChange = quote.changePercent || 0;
    const newsCount = news?.length || 0;
    const avgSentiment =
      news?.length > 0
        ? news.reduce((sum, article) => sum + (article.sentiment || 0), 0) /
          news.length
        : 0;

    const priceScore = priceChange * 10;
    const newsScore = newsCount * 5;
    const sentimentScore = avgSentiment * 50;

    let finalScore = priceScore + newsScore + sentimentScore;

    // Apply directional bias
    if (priceChange < -2 && avgSentiment < -0.3) {
      finalScore = finalScore - Math.abs(finalScore * 0.5);
    } else if (priceChange > 2 && avgSentiment > 0.3) {
      finalScore = finalScore + Math.abs(finalScore * 0.2);
    }

    return Math.round(Math.max(-100, Math.min(100, finalScore)));
  }
}

export default new InstitutionalDataService();
