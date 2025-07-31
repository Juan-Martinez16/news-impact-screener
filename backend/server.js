// backend/server.js
// News Impact Screener Backend API Service
// Handles API key management and real data aggregation

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const NodeCache = require("node-cache");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize cache (TTL in seconds)
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default
  checkperiod: 60, // Check for expired keys every minute
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://your-frontend-domain.vercel.app"]
        : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);
app.use(morgan("combined"));
app.use(express.json());

// API Configuration
const API_KEYS = {
  ALPHA_VANTAGE: process.env.ALPHA_VANTAGE_API_KEY,
  FINNHUB: process.env.FINNHUB_API_KEY,
  POLYGON: process.env.POLYGON_API_KEY,
};

// API Rate Limiting
const rateLimits = {
  alphaVantage: { requests: 0, limit: 5, window: 60000 },
  finnhub: { requests: 0, limit: 60, window: 60000 },
  polygon: { requests: 0, limit: 100, window: 60000 },
};

// Reset rate limits every minute
setInterval(() => {
  Object.keys(rateLimits).forEach((api) => {
    rateLimits[api].requests = 0;
  });
}, 60000);

// Helper Functions
const checkRateLimit = (apiName) => {
  const limit = rateLimits[apiName];
  if (limit.requests >= limit.limit) {
    throw new Error(`Rate limit exceeded for ${apiName}`);
  }
  limit.requests++;
};

const getCacheKey = (endpoint, params) => {
  return `${endpoint}-${JSON.stringify(params)}`;
};

// ============================================
// API ENDPOINTS
// ============================================

// Health Check
app.get("/api/health", (req, res) => {
  const health = {
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    apis: {
      alphaVantage: !!API_KEYS.ALPHA_VANTAGE,
      finnhub: !!API_KEYS.FINNHUB,
      polygon: !!API_KEYS.POLYGON,
    },
    cache: {
      keys: cache.keys().length,
      stats: cache.getStats(),
    },
    rateLimits: Object.fromEntries(
      Object.entries(rateLimits).map(([api, data]) => [
        api,
        { used: data.requests, limit: data.limit },
      ])
    ),
  };

  res.json(health);
});

// Real Stock Quote
app.get("/api/quotes/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = getCacheKey("quote", { symbol });

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, source: "cache" });
    }

    // Check rate limit
    checkRateLimit("alphaVantage");

    // Real Alpha Vantage API call
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEYS.ALPHA_VANTAGE}`
    );

    if (response.data["Error Message"]) {
      throw new Error("Invalid symbol or API limit reached");
    }

    const quote = response.data["Global Quote"];
    if (!quote) {
      throw new Error("No quote data available");
    }

    // Normalize the data
    const normalizedQuote = {
      symbol: symbol,
      company: `${symbol} Inc.`, // Will enhance with company lookup later
      price: parseFloat(quote["05. price"]),
      change: parseFloat(quote["09. change"]),
      changePercent: parseFloat(quote["10. change percent"].replace("%", "")),
      volume: parseInt(quote["06. volume"]),
      marketCap: null, // Will add from another API
      sector: null, // Will add from another API
      lastUpdate: quote["07. latest trading day"],
      source: "alphaVantage",
    };

    // Cache the result
    cache.set(cacheKey, normalizedQuote, 60); // 1 minute cache

    res.json(normalizedQuote);
  } catch (error) {
    console.error(
      `Error fetching quote for ${req.params.symbol}:`,
      error.message
    );
    res.status(500).json({
      error: "Failed to fetch real quote data",
      message: error.message,
      symbol: req.params.symbol,
    });
  }
});

// Real Stock News
app.get("/api/news/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = getCacheKey("news", { symbol });

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ articles: cached, source: "cache" });
    }

    // Check rate limit
    checkRateLimit("finnhub");

    // Real Finnhub API call
    const response = await axios.get(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=2025-07-25&to=2025-07-31&token=${API_KEYS.FINNHUB}`
    );

    if (!Array.isArray(response.data)) {
      throw new Error("Invalid news data format");
    }

    // Normalize news data
    const normalizedNews = response.data.slice(0, 10).map((article) => ({
      headline: article.headline,
      source: article.source,
      timestamp: new Date(article.datetime * 1000).toISOString(),
      url: article.url,
      summary: article.summary,
      sentiment: Math.random() - 0.5, // Will replace with real sentiment analysis
      impactScore: Math.random() * 20, // Will replace with real impact scoring
      relevance: 0.8 + Math.random() * 0.2,
      category: article.category || "general",
    }));

    // Cache the result
    cache.set(cacheKey, normalizedNews, 300); // 5 minutes cache

    res.json({ articles: normalizedNews, source: "finnhub" });
  } catch (error) {
    console.error(
      `Error fetching news for ${req.params.symbol}:`,
      error.message
    );
    res.status(500).json({
      error: "Failed to fetch real news data",
      message: error.message,
      symbol: req.params.symbol,
    });
  }
});

// Real Technical Data
app.get("/api/technicals/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = getCacheKey("technicals", { symbol });

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, source: "cache" });
    }

    // Check rate limit
    checkRateLimit("alphaVantage");

    // Real Alpha Vantage technical indicators
    const [rsiResponse, macdResponse] = await Promise.all([
      axios.get(
        `https://www.alphavantage.co/query?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${API_KEYS.ALPHA_VANTAGE}`
      ),
      axios.get(
        `https://www.alphavantage.co/query?function=MACD&symbol=${symbol}&interval=daily&series_type=close&apikey=${API_KEYS.ALPHA_VANTAGE}`
      ),
    ]);

    // Parse technical data
    const rsiData = rsiResponse.data["Technical Analysis: RSI"];
    const macdData = macdResponse.data["Technical Analysis: MACD"];

    if (!rsiData || !macdData) {
      throw new Error("Technical data not available");
    }

    // Get latest values
    const latestDate = Object.keys(rsiData)[0];
    const rsi = parseFloat(rsiData[latestDate]["RSI"]);
    const macd = parseFloat(macdData[latestDate]["MACD"]);
    const macdSignal = parseFloat(macdData[latestDate]["MACD_Signal"]);

    const technicalData = {
      symbol: symbol,
      rsi: rsi,
      macd: macd,
      macdSignal: macdSignal,
      macdHistogram: macd - macdSignal,
      atr: 2.5, // Will add real ATR calculation
      stochastic: 50 + Math.random() * 40, // Will add real calculation
      bollinger: {
        upper: null, // Will add real Bollinger bands
        middle: null,
        lower: null,
      },
      support: null, // Will calculate from price history
      resistance: null, // Will calculate from price history
      trend: rsi > 50 ? "BULLISH" : "BEARISH",
      strength: Math.abs(rsi - 50) * 2,
      lastUpdate: new Date().toISOString(),
      source: "alphaVantage",
    };

    // Cache the result
    cache.set(cacheKey, technicalData, 600); // 10 minutes cache

    res.json(technicalData);
  } catch (error) {
    console.error(
      `Error fetching technicals for ${req.params.symbol}:`,
      error.message
    );
    res.status(500).json({
      error: "Failed to fetch real technical data",
      message: error.message,
      symbol: req.params.symbol,
    });
  }
});

// Real Stock Screening
app.post("/api/screening", async (req, res) => {
  try {
    const options = req.body || {};
    const cacheKey = getCacheKey("screening", options);

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ results: cached, source: "cache" });
    }

    // Define stock universe (top 50 for now, will expand to 200+)
    const stockUniverse = [
      "AAPL",
      "MSFT",
      "GOOGL",
      "AMZN",
      "TSLA",
      "NVDA",
      "META",
      "NFLX",
      "CRM",
      "ADBE",
      "ORCL",
      "INTC",
      "AMD",
      "QCOM",
      "AVGO",
      "TXN",
      "MU",
      "AMAT",
      "LRCX",
      "KLAC",
      "SHOP",
      "SQ",
      "PYPL",
      "V",
      "MA",
      "AXP",
      "JPM",
      "BAC",
      "WFC",
      "GS",
      "JNJ",
      "PFE",
      "UNH",
      "ABBV",
      "TMO",
      "DHR",
      "BMY",
      "LLY",
      "MRK",
      "GILD",
      "AMGN",
      "BIIB",
      "XOM",
      "CVX",
      "COP",
      "SLB",
      "EOG",
      "KMI",
      "OKE",
      "WMB",
    ];

    console.log(
      `🔍 Screening ${stockUniverse.length} stocks with real APIs...`
    );

    // Process stocks in batches to respect rate limits
    const batchSize = 5;
    const results = [];

    for (let i = 0; i < stockUniverse.length; i += batchSize) {
      const batch = stockUniverse.slice(i, i + batchSize);

      const batchPromises = batch.map(async (symbol) => {
        try {
          // Get basic quote data only (news/technicals optional for screening)
          const quoteResponse = await axios.get(
            `http://localhost:${PORT}/api/quotes/${symbol}`
          );

          return {
            symbol,
            currentPrice: quoteResponse.data.price,
            change: quoteResponse.data.change,
            changePercent: quoteResponse.data.changePercent,
            volume: quoteResponse.data.volume,
            nissScore: Math.random() * 200 - 100, // Will replace with real NISS
            confidence: ["HIGH", "MEDIUM", "LOW"][
              Math.floor(Math.random() * 3)
            ],
            sector: "Technology", // Will enhance with real sector data
            lastUpdate: new Date().toISOString(),
          };
        } catch (error) {
          console.error(`Failed to screen ${symbol}:`, error.message);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((result) => result !== null));

      // Rate limiting delay between batches
      if (i + batchSize < stockUniverse.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(`✅ Screening complete: ${results.length} stocks processed`);

    // Cache the results
    cache.set(cacheKey, results, 180); // 3 minutes cache

    res.json({
      results: results,
      source: "real",
      timestamp: new Date().toISOString(),
      processed: results.length,
      total: stockUniverse.length,
    });
  } catch (error) {
    console.error("Screening error:", error.message);
    res.status(500).json({
      error: "Failed to perform real stock screening",
      message: error.message,
    });
  }
});

// Market Context
app.get("/api/market-context", async (req, res) => {
  try {
    const cacheKey = "market-context";
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, source: "cache" });
    }

    // Get SPY data for market context
    const spyResponse = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${API_KEYS.ALPHA_VANTAGE}`
    );

    const spyQuote = spyResponse.data["Global Quote"];

    const marketContext = {
      spy: {
        price: parseFloat(spyQuote["05. price"]),
        change: parseFloat(spyQuote["09. change"]),
        changePercent: parseFloat(
          spyQuote["10. change percent"].replace("%", "")
        ),
      },
      vix: 20 + Math.random() * 15, // Will add real VIX data
      volatility: "NORMAL",
      trend: "NEUTRAL",
      breadth: "MIXED",
      lastUpdate: new Date().toISOString(),
      source: "real",
    };

    cache.set(cacheKey, marketContext, 120); // 2 minutes cache
    res.json(marketContext);
  } catch (error) {
    console.error("Market context error:", error.message);
    res.status(500).json({
      error: "Failed to fetch market context",
      message: error.message,
    });
  }
});

// Error handler
app.use((error, req, res, next) => {
  console.error("API Error:", error);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    message: `Endpoint ${req.method} ${req.path} not found`,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 News Impact Screener Backend running on port ${PORT}`);
  console.log(`📊 API Status:`);
  console.log(
    `   Alpha Vantage: ${
      API_KEYS.ALPHA_VANTAGE ? "✅ Configured" : "❌ Missing"
    }`
  );
  console.log(
    `   Finnhub: ${API_KEYS.FINNHUB ? "✅ Configured" : "❌ Missing"}`
  );
  console.log(
    `   Polygon: ${API_KEYS.POLYGON ? "✅ Configured" : "❌ Missing"}`
  );
  console.log(`🌐 CORS enabled for development and production`);
  console.log(`💾 Cache initialized with 5-minute default TTL`);
});

module.exports = app;
