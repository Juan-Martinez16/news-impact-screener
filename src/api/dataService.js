// src/api/dataService.js
// Updated to use backend proxy instead of direct API calls

import { API_CONFIG } from "./config";

class DataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute
  }

  async fetchWithCache(url, cacheKey, options = {}) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      console.log(`🔄 Fetching: ${url}`);

      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error(`❌ Error fetching ${cacheKey}:`, error);
      throw error;
    }
  }

  // Test backend connection
  async testBackendConnection() {
    try {
      const url = `${
        API_CONFIG.backend.baseUrl
      }${API_CONFIG.backend.endpoints.health()}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Backend connection successful:", data);
        return true;
      } else {
        console.error("❌ Backend connection failed:", response.status);
        return false;
      }
    } catch (error) {
      console.error("❌ Backend connection error:", error);
      return false;
    }
  }

  // Updated to use backend proxy
  async getQuote(symbol) {
    try {
      const url = `${
        API_CONFIG.backend.baseUrl
      }${API_CONFIG.backend.endpoints.quote(symbol)}`;
      const data = await this.fetchWithCache(url, `quote_${symbol}`);

      // Handle the response format from your backend
      if (data && typeof data === "object") {
        return {
          price: data.c || data.price,
          change: data.d || data.change,
          changePercent: data.dp || data.changePercent,
          high: data.h || data.high,
          low: data.l || data.low,
          open: data.o || data.open,
          previousClose: data.pc || data.previousClose,
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ Quote error for ${symbol}:`, error);
      return null;
    }
  }

  // Updated to use backend proxy
  async getNews(symbol) {
    try {
      const url = `${
        API_CONFIG.backend.baseUrl
      }${API_CONFIG.backend.endpoints.news(symbol)}`;
      const news = await this.fetchWithCache(url, `news_${symbol}`);

      if (Array.isArray(news)) {
        return news.slice(0, 5).map((article) => ({
          headline: article.headline,
          summary: article.summary,
          datetime: article.datetime,
          source: article.source,
          url: article.url,
          category: article.category,
          relevanceScore: article.relevanceScore,
          sentiment:
            article.sentiment ||
            this.analyzeSentiment(
              article.headline + " " + (article.summary || "")
            ),
        }));
      }

      return [];
    } catch (error) {
      console.error(`❌ News error for ${symbol}:`, error);
      return [];
    }
  }

  // Batch processing using backend
  async getMultipleStockData(symbols, batchSize = 10) {
    try {
      // Use backend batch endpoint if available
      const url = `${
        API_CONFIG.backend.baseUrl
      }${API_CONFIG.backend.endpoints.batchQuotes()}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbols }),
      });

      if (response.ok) {
        const batchData = await response.json();
        const results = [];

        // Process batch results
        for (const symbol of symbols) {
          if (batchData[symbol]) {
            const quote = batchData[symbol];
            const news = await this.getNews(symbol); // Get news separately
            const nissScore = this.calculateNISS(quote, news);

            results.push({
              symbol,
              quote,
              news,
              nissScore,
            });
          }
        }

        return results;
      } else {
        // Fallback to individual requests
        console.warn(
          "Batch endpoint failed, falling back to individual requests"
        );
        return await this.getMultipleStockDataFallback(symbols, batchSize);
      }
    } catch (error) {
      console.error("❌ Batch processing error:", error);
      return await this.getMultipleStockDataFallback(symbols, batchSize);
    }
  }

  // Fallback method for individual requests
  async getMultipleStockDataFallback(symbols, batchSize = 10) {
    const results = [];

    // Process in batches to avoid overwhelming the backend
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map((symbol) => this.getStockData(symbol));

      try {
        const batchResults = await Promise.allSettled(promises);

        batchResults.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value.quote) {
            results.push(result.value);
          } else {
            console.warn(`❌ Failed to fetch data for ${batch[index]}`);
          }
        });

        // Small delay between batches to respect rate limits
        if (i + batchSize < symbols.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`❌ Error fetching batch starting at index ${i}:`, error);
      }
    }

    return results;
  }

  // Rest of your existing methods remain the same...

  // Expanded institutional stock universe across multiple markets
  getInstitutionalStocks() {
    return {
      // US Large Cap Tech
      usTech: [
        "AAPL",
        "MSFT",
        "GOOGL",
        "AMZN",
        "META",
        "NVDA",
        "AMD",
        "INTC",
        "CRM",
        "ADBE",
      ],

      // US Large Cap Non-Tech
      usLargeCap: [
        "JPM",
        "JNJ",
        "PG",
        "UNH",
        "HD",
        "V",
        "MA",
        "WMT",
        "PFE",
        "KO",
      ],

      // US Growth & Momentum
      usGrowth: [
        "TSLA",
        "NFLX",
        "SHOP",
        "SQ",
        "ROKU",
        "ZOOM",
        "PELOTON",
        "TWTR",
        "SNAP",
        "UBER",
      ],

      // US Biotech & Healthcare
      usBiotech: [
        "MRNA",
        "BNTX",
        "VKTX",
        "GILD",
        "AMGN",
        "BMY",
        "ABBV",
        "LLY",
        "TMO",
        "DHR",
      ],

      // US Financial
      usFinancial: [
        "BAC",
        "WFC",
        "C",
        "GS",
        "MS",
        "AXP",
        "BRK.B",
        "BLK",
        "SPGI",
        "CME",
      ],

      // US Energy & Materials
      usEnergy: [
        "XOM",
        "CVX",
        "COP",
        "EOG",
        "SLB",
        "HAL",
        "DVN",
        "MRO",
        "OKE",
        "KMI",
      ],

      // US Small/Mid Cap High Beta
      usSmallCap: [
        "PLTR",
        "SMCI",
        "RIVN",
        "LCID",
        "SOFI",
        "HOOD",
        "COIN",
        "RBLX",
        "U",
        "DKNG",
      ],

      // US REITs & Utilities
      usREITs: [
        "AMT",
        "PLD",
        "CCI",
        "EQIX",
        "SPG",
        "O",
        "WELL",
        "DLR",
        "PSA",
        "EXR",
      ],

      // International Markets (ADRs)
      international: [
        "TSM",
        "ASML",
        "TM",
        "NVO",
        "NESN",
        "SAP",
        "AZN",
        "TTE",
        "UL",
        "SNY",
      ],

      // ETFs for Market Exposure
      etfs: [
        "SPY",
        "QQQ",
        "IWM",
        "EFA",
        "EEM",
        "VTI",
        "BND",
        "GLD",
        "SLV",
        "USO",
      ],

      // Crypto Related
      crypto: [
        "BTC-USD",
        "ETH-USD",
        "COIN",
        "MSTR",
        "RIOT",
        "MARA",
        "HUT",
        "BITF",
        "CAN",
        "HIVE",
      ],
    };
  }

  // Get all stocks for institutional screening
  getAllStocksForScreening() {
    const stocks = this.getInstitutionalStocks();
    return Object.values(stocks).flat();
  }

  analyzeSentiment(text) {
    const positiveWords = [
      "buy",
      "bullish",
      "growth",
      "profit",
      "gain",
      "increase",
      "positive",
      "upgrade",
      "strong",
      "beat",
      "exceed",
      "outperform",
      "boost",
      "rise",
    ];

    const negativeWords = [
      "sell",
      "bearish",
      "loss",
      "decline",
      "decrease",
      "negative",
      "downgrade",
      "weak",
      "miss",
      "underperform",
      "drop",
      "fall",
      "crash",
    ];

    if (!text) return 0;

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;

    words.forEach((word) => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });

    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, score / Math.max(words.length / 10, 1)));
  }

  calculateNISS(quote, news) {
    if (!quote) return 0;

    const priceChange = quote.changePercent || 0;
    const newsCount = news ? news.length : 0;

    // Recent news (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentNews = news
      ? news.filter((article) => article.datetime * 1000 > oneDayAgo).length
      : 0;

    // Average sentiment
    const avgSentiment =
      news && news.length > 0
        ? news.reduce((sum, article) => sum + article.sentiment, 0) /
          news.length
        : 0;

    // Enhanced NISS calculation that can go negative
    const priceScore = priceChange * 10; // Preserves sign (+/-)
    const newsScore = newsCount * 5;
    const recencyScore = recentNews * 10;
    const sentimentScore = avgSentiment * 50; // Can be negative

    // Final NISS score - can range from highly negative to highly positive
    let nissScore = priceScore + newsScore + recencyScore + sentimentScore;

    // Apply directional bias based on sentiment and price action
    if (priceChange < -2 && avgSentiment < -0.3) {
      // Strong negative bias
      nissScore = nissScore - Math.abs(nissScore * 0.5);
    } else if (priceChange > 2 && avgSentiment > 0.3) {
      // Strong positive bias
      nissScore = nissScore + Math.abs(nissScore * 0.2);
    }

    return Math.round(nissScore);
  }

  async getStockData(symbol) {
    const [quote, news] = await Promise.all([
      this.getQuote(symbol),
      this.getNews(symbol),
    ]);

    const nissScore = this.calculateNISS(quote, news);

    return {
      symbol,
      quote,
      news,
      nissScore,
    };
  }

  // NEW: Get institutional screening data
  async getInstitutionalScreeningData(maxStocks = 50) {
    // Test backend connection first
    const isConnected = await this.testBackendConnection();
    if (!isConnected) {
      throw new Error(
        "Backend connection failed. Please check if the backend server is running."
      );
    }

    const allStocks = this.getAllStocksForScreening();

    // Take a subset for initial screening to manage API calls
    const stocksToScreen = allStocks.slice(0, maxStocks);

    console.log(
      `📊 Screening ${stocksToScreen.length} institutional stocks...`
    );

    return await this.getMultipleStockData(stocksToScreen);
  }
}

export default new DataService();
