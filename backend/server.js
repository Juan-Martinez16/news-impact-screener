// backend/server.js - FIXED VERSION
// News Impact Screener Backend API Service
// Updated with your exact configuration and API keys

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

// FIXED CORS Configuration - Using your exact URLs
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [
            "https://news-impact-screener.vercel.app",
            "https://news-impact-screener-backend.onrender.com",
          ]
        : [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
          ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Handle preflight requests explicitly
app.options("*", cors());

app.use(morgan("combined"));
app.use(express.json());

// API Configuration - Using your exact API keys
const API_KEYS = {
  ALPHA_VANTAGE: process.env.ALPHA_VANTAGE_API_KEY,
  FINNHUB: process.env.FINNHUB_API_KEY,
  POLYGON: process.env.POLYGON_API_KEY,
  RAPIDAPI: process.env.RAPIDAPI_API_KEY,
};

// Log API key status on startup
console.log("\n📋 API Key Configuration Status:");
console.log(
  `   Alpha Vantage: ${API_KEYS.ALPHA_VANTAGE ? "✅ Configured" : "❌ Missing"}`
);
console.log(`   Finnhub: ${API_KEYS.FINNHUB ? "✅ Configured" : "❌ Missing"}`);
console.log(`   Polygon: ${API_KEYS.POLYGON ? "✅ Configured" : "❌ Missing"}`);
console.log(
  `   RapidAPI: ${API_KEYS.RAPIDAPI ? "✅ Configured" : "❌ Missing"}\n`
);

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

// Root Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "News Impact Screener Backend",
    timestamp: new Date().toISOString(),
    version: "3.2.0",
  });
});

// Detailed Health Check - FIXED
app.get("/api/health", (req, res) => {
  console.log(
    "🏥 Health check requested from:",
    req.headers.origin || "direct"
  );

  const health = {
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "3.2.0",
    apis: {
      alphaVantage: !!API_KEYS.ALPHA_VANTAGE,
      finnhub: !!API_KEYS.FINNHUB,
      polygon: !!API_KEYS.POLYGON, // FIXED: was !API_KEYS.POLYGON
      rapidapi: !!API_KEYS.RAPIDAPI,
    },
    rateLimits: Object.fromEntries(
      Object.entries(rateLimits).map(([api, data]) => [
        api,
        { used: data.requests, limit: data.limit },
      ])
    ),
    cache: {
      keys: cache.keys().length,
      stats: cache.getStats(),
    },
    environment: process.env.NODE_ENV,
  };

  res.json(health);
});

// Stock Quote Endpoint - Enhanced with your APIs
app.get("/api/quotes/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = getCacheKey("quote", { symbol });

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, source: "cache" });
    }

    checkRateLimit("alphaVantage");

    // Using your Alpha Vantage API key
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEYS.ALPHA_VANTAGE}`,
      { timeout: 10000 }
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
      price: parseFloat(quote["05. price"]),
      change: parseFloat(quote["09. change"]),
      changePercent: parseFloat(quote["10. change percent"].replace("%", "")),
      high: parseFloat(quote["03. high"]),
      low: parseFloat(quote["04. low"]),
      volume: parseInt(quote["06. volume"]),
      lastUpdate: quote["07. latest trading day"],
      source: "alphaVantage",
      timestamp: new Date().toISOString(),
    };

    cache.set(cacheKey, normalizedQuote, 60); // 1 minute cache
    console.log(`✅ Quote fetched for ${symbol}: $${normalizedQuote.price}`);

    res.json(normalizedQuote);
  } catch (error) {
    console.error(`❌ Quote error for ${req.params.symbol}:`, error.message);
    res.status(500).json({
      error: "Failed to fetch quote",
      message: error.message,
      symbol: req.params.symbol,
      timestamp: new Date().toISOString(),
    });
  }
});

// Stock News Endpoint - Using your Finnhub API
app.get("/api/news/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = getCacheKey("news", { symbol });

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, source: "cache" });
    }

    checkRateLimit("finnhub");

    // Using your Finnhub API key
    const response = await axios.get(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=2024-07-01&to=2025-08-01&token=${API_KEYS.FINNHUB}`,
      { timeout: 10000 }
    );

    const newsData = response.data.slice(0, 10).map((article) => ({
      id: article.id || Math.random().toString(36),
      headline: article.headline,
      summary: article.summary,
      url: article.url,
      source: article.source,
      datetime: new Date(article.datetime * 1000).toISOString(),
      image: article.image,
      category: article.category,
      sentiment: {
        score: Math.random() * 2 - 1, // Will enhance with real sentiment
        magnitude: Math.random(),
      },
      relevanceScore: Math.random() * 10, // Will enhance with NISS calculation
    }));

    const result = {
      symbol,
      news: newsData,
      count: newsData.length,
      lastUpdate: new Date().toISOString(),
      source: "finnhub",
    };

    cache.set(cacheKey, result, 300); // 5 minute cache
    console.log(`✅ News fetched for ${symbol}: ${newsData.length} articles`);

    res.json(result);
  } catch (error) {
    console.error(`❌ News error for ${req.params.symbol}:`, error.message);
    res.status(500).json({
      error: "Failed to fetch news",
      message: error.message,
      symbol: req.params.symbol,
      timestamp: new Date().toISOString(),
    });
  }
});

// Technical Analysis Endpoint - Enhanced
app.get("/api/technicals/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = getCacheKey("technicals", { symbol });

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, source: "cache" });
    }

    checkRateLimit("alphaVantage");

    // Get RSI data using your Alpha Vantage key
    const rsiResponse = await axios.get(
      `https://www.alphavantage.co/query?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${API_KEYS.ALPHA_VANTAGE}`,
      { timeout: 15000 }
    );

    const rsiData = rsiResponse.data["Technical Analysis: RSI"];
    if (!rsiData) {
      throw new Error("Technical data not available");
    }

    const latestRsiDate = Object.keys(rsiData)[0];
    const rsi = parseFloat(rsiData[latestRsiDate]["RSI"]);

    // Generate comprehensive technical signals
    const signals = {
      rsi: {
        value: rsi,
        signal: rsi > 70 ? "OVERBOUGHT" : rsi < 30 ? "OVERSOLD" : "NEUTRAL",
        strength: Math.abs(rsi - 50) / 50,
      },
      trend: rsi > 50 ? "BULLISH" : "BEARISH",
      momentum: rsi > 60 ? "STRONG" : rsi < 40 ? "WEAK" : "MODERATE",
      tradingSignal: {
        action: rsi > 70 ? "SELL" : rsi < 30 ? "BUY" : "HOLD",
        confidence: Math.abs(rsi - 50) / 50,
        timeframe: "1-3 days",
      },
    };

    const result = {
      symbol,
      technicals: signals,
      lastUpdate: new Date().toISOString(),
      source: "alphaVantage",
    };

    cache.set(cacheKey, result, 600); // 10 minute cache
    console.log(`✅ Technicals fetched for ${symbol}: RSI ${rsi.toFixed(2)}`);

    res.json(result);
  } catch (error) {
    console.error(
      `❌ Technicals error for ${req.params.symbol}:`,
      error.message
    );
    res.status(500).json({
      error: "Failed to fetch technical data",
      message: error.message,
      symbol: req.params.symbol,
      timestamp: new Date().toISOString(),
    });
  }
});

// Stock Screening Endpoint - Enhanced
app.get("/api/screening", async (req, res) => {
  try {
    const cacheKey = "screening-results";

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, source: "cache" });
    }

    console.log("🔍 Running real stock screening...");

    // Enhanced stock universe
    const stockUniverse = [
      "AAPL",
      "MSFT",
      "GOOGL",
      "AMZN",
      "TSLA",
      "NVDA",
      "META",
      "NFLX",
      "AMD",
      "CRM",
    ];
    const results = [];

    for (const symbol of stockUniverse.slice(0, 6)) {
      // Process 6 stocks
      try {
        checkRateLimit("alphaVantage");

        const response = await axios.get(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEYS.ALPHA_VANTAGE}`,
          { timeout: 8000 }
        );

        const quote = response.data["Global Quote"];
        if (quote) {
          const changePercent = parseFloat(
            quote["10. change percent"].replace("%", "")
          );
          const volume = parseInt(quote["06. volume"]);
          const price = parseFloat(quote["05. price"]);

          // Enhanced impact scoring
          const volatility = Math.abs(changePercent);
          const volumeScore = volume > 10000000 ? 1.5 : 1.0;
          const priceScore = price > 100 ? 1.2 : 1.0;
          const impactScore = volatility * volumeScore * priceScore;

          results.push({
            symbol: quote["01. symbol"],
            price: price,
            change: parseFloat(quote["09. change"]),
            changePercent,
            volume: volume,
            high: parseFloat(quote["03. high"]),
            low: parseFloat(quote["04. low"]),
            impactScore: parseFloat(impactScore.toFixed(2)),
            signal:
              changePercent > 3
                ? "STRONG_BUY"
                : changePercent > 1
                ? "BUY"
                : changePercent < -3
                ? "STRONG_SELL"
                : changePercent < -1
                ? "SELL"
                : "HOLD",
            confidence: Math.min(volatility / 5, 1), // 0-1 scale
            lastUpdate: quote["07. latest trading day"],
          });
        }

        // Respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 1200));
      } catch (error) {
        console.error(`❌ Error screening ${symbol}:`, error.message);
      }
    }

    const screeningResult = {
      results: results.sort((a, b) => b.impactScore - a.impactScore),
      summary: {
        totalProcessed: results.length,
        highImpact: results.filter((r) => r.impactScore > 2).length,
        strongSignals: results.filter((r) => r.signal.includes("STRONG"))
          .length,
        avgImpactScore:
          results.length > 0
            ? (
                results.reduce((sum, r) => sum + r.impactScore, 0) /
                results.length
              ).toFixed(2)
            : 0,
      },
      timestamp: new Date().toISOString(),
      processed: results.length,
      total: stockUniverse.length,
      source: "alphaVantage",
    };

    cache.set(cacheKey, screeningResult, 180); // 3 minute cache
    console.log(`✅ Screening complete: ${results.length} stocks processed`);

    res.json(screeningResult);
  } catch (error) {
    console.error("❌ Screening error:", error.message);
    res.status(500).json({
      error: "Failed to perform stock screening",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Market Context Endpoint - Enhanced
app.get("/api/market-context", async (req, res) => {
  try {
    const cacheKey = "market-context";
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, source: "cache" });
    }

    checkRateLimit("alphaVantage");

    // Get SPY data for market context using your API key
    const spyResponse = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${API_KEYS.ALPHA_VANTAGE}`,
      { timeout: 10000 }
    );

    const spyQuote = spyResponse.data["Global Quote"];
    if (!spyQuote) {
      throw new Error("Market data not available");
    }

    const spyChange = parseFloat(
      spyQuote["10. change percent"].replace("%", "")
    );

    const marketContext = {
      spy: {
        price: parseFloat(spyQuote["05. price"]),
        change: parseFloat(spyQuote["09. change"]),
        changePercent: spyChange,
        volume: parseInt(spyQuote["06. volume"]),
      },
      sentiment:
        spyChange > 1 ? "BULLISH" : spyChange < -1 ? "BEARISH" : "NEUTRAL",
      volatility:
        Math.abs(spyChange) > 2
          ? "HIGH"
          : Math.abs(spyChange) > 1
          ? "MODERATE"
          : "LOW",
      trend:
        spyChange > 0.5
          ? "UPTREND"
          : spyChange < -0.5
          ? "DOWNTREND"
          : "SIDEWAYS",
      breadth: "MIXED", // Will enhance with advance/decline data
      lastUpdate: new Date().toISOString(),
      source: "alphaVantage",
    };

    cache.set(cacheKey, marketContext, 120); // 2 minutes cache
    console.log(
      `✅ Market context: SPY ${marketContext.spy.changePercent}% (${marketContext.sentiment})`
    );

    res.json(marketContext);
  } catch (error) {
    console.error("❌ Market context error:", error.message);
    res.status(500).json({
      error: "Failed to fetch market context",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handler
app.use((error, req, res, next) => {
  console.error("🚨 API Error:", error);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    message: `Endpoint ${req.method} ${req.path} not found`,
    availableEndpoints: [
      "GET /health",
      "GET /api/health",
      "GET /api/quotes/:symbol",
      "GET /api/news/:symbol",
      "GET /api/technicals/:symbol",
      "GET /api/screening",
      "GET /api/market-context",
    ],
    timestamp: new Date().toISOString(),
  });
});

// Enhanced startup logging
app.listen(PORT, () => {
  console.log(`\n🚀 ===== NEWS IMPACT SCREENER BACKEND =====`);
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
  console.log(`\n📋 Configured APIs:`);
  console.log(
    `   Alpha Vantage: ${API_KEYS.ALPHA_VANTAGE ? "✅ Ready" : "❌ Missing"}`
  );
  console.log(`   Finnhub: ${API_KEYS.FINNHUB ? "✅ Ready" : "❌ Missing"}`);
  console.log(`   Polygon: ${API_KEYS.POLYGON ? "✅ Ready" : "❌ Missing"}`);
  console.log(`   RapidAPI: ${API_KEYS.RAPIDAPI ? "✅ Ready" : "❌ Missing"}`);
  console.log(`\n🌐 CORS: localhost:3000 & Vercel deployment`);
  console.log(`💾 Cache: 5min TTL with auto-cleanup`);
  console.log(`⚡ Rate Limits: AV(5/min), Finnhub(60/min), Polygon(100/min)`);
  console.log(`\n🎯 Backend ready for real market data!\n`);
});

module.exports = app;
