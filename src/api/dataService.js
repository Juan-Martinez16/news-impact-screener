// src/api/dataService.js
import { API_CONFIG } from "./config";

class DataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute
  }

  async fetchWithCache(url, cacheKey, headers = {}) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(url, { headers });
      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error(`Error fetching ${cacheKey}:`, error);
      throw error;
    }
  }

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

  async getQuote(symbol) {
    try {
      const url = `${API_CONFIG.finnhub.baseUrl}/quote?symbol=${symbol}&token=${API_CONFIG.finnhub.key}`;
      const data = await this.fetchWithCache(url, `quote_${symbol}`);

      return {
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc,
      };
    } catch (error) {
      console.error("Quote error:", error);
      return null;
    }
  }

  async getNews(symbol) {
    try {
      const url = `${
        API_CONFIG.finnhub.baseUrl
      }/company-news?symbol=${symbol}&from=${
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
      }&to=${new Date().toISOString().split("T")[0]}&token=${
        API_CONFIG.finnhub.key
      }`;
      const news = await this.fetchWithCache(url, `news_${symbol}`);

      return news.slice(0, 5).map((article) => ({
        headline: article.headline,
        summary: article.summary,
        datetime: article.datetime,
        source: article.source,
        sentiment: this.analyzeSentiment(
          article.headline + " " + article.summary
        ),
      }));
    } catch (error) {
      console.error("News error:", error);
      return [];
    }
  }

  analyzeSentiment(text) {
    const positiveWords = [
      "beat",
      "exceed",
      "positive",
      "growth",
      "approval",
      "success",
      "breakthrough",
      "upgrade",
      "strong",
      "gain",
      "profit",
      "up",
      "surge",
      "rally",
      "bullish",
      "outperform",
      "buy",
      "target raised",
      "optimistic",
    ];
    const negativeWords = [
      "miss",
      "decline",
      "negative",
      "fail",
      "reject",
      "delay",
      "concern",
      "downgrade",
      "weak",
      "loss",
      "down",
      "plunge",
      "drop",
      "bearish",
      "sell",
      "target lowered",
      "pessimistic",
      "warning",
      "disappointing",
    ];

    const textLower = text.toLowerCase();
    const positiveCount = positiveWords.filter((word) =>
      textLower.includes(word)
    ).length;
    const negativeCount = negativeWords.filter((word) =>
      textLower.includes(word)
    ).length;

    if (positiveCount + negativeCount === 0) return 0;
    return (positiveCount - negativeCount) / (positiveCount + negativeCount);
  }

  // ENHANCED NISS Calculation - Fixed to handle negative scores properly
  calculateNISS(quote, news) {
    if (!quote) return 0;

    // CRITICAL FIX: Use actual price change (not absolute value) to preserve direction
    const priceChange = quote.changePercent || 0; // This preserves positive/negative
    const newsCount = news.length;
    const recentNews = news.filter(
      (n) => Date.now() - n.datetime * 1000 < 86400000
    ).length;
    const avgSentiment =
      news.length > 0
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

  // NEW: Get multiple stocks efficiently with batching
  async getMultipleStockData(symbols, batchSize = 10) {
    const results = [];

    // Process in batches to avoid API rate limits
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map((symbol) => this.getStockData(symbol));

      try {
        const batchResults = await Promise.allSettled(promises);

        batchResults.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value.quote) {
            results.push(result.value);
          } else {
            console.warn(`Failed to fetch data for ${batch[index]}`);
          }
        });

        // Small delay between batches to respect rate limits
        if (i + batchSize < symbols.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error fetching batch starting at index ${i}:`, error);
      }
    }

    return results;
  }

  // NEW: Get institutional screening data
  async getInstitutionalScreeningData(maxStocks = 50) {
    const allStocks = this.getAllStocksForScreening();

    // Take a subset for initial screening to manage API calls
    const stocksToScreen = allStocks.slice(0, maxStocks);

    console.log(`Screening ${stocksToScreen.length} institutional stocks...`);

    return await this.getMultipleStockData(stocksToScreen);
  }
}

export default new DataService();
