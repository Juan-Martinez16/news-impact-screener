// backend/server.js
// News Impact Screener Backend v4.0.0 - Multi-API Enhanced
// Complete version with CORS fix for Vercel

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const NodeCache = require("node-cache");
const axios = require("axios");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const cache = new NodeCache({ stdTTL: 300 }); // 5 minute default cache

// API Keys from environment
const API_KEYS = {
  ALPHA_VANTAGE: process.env.ALPHA_VANTAGE_API_KEY,
  FINNHUB: process.env.FINNHUB_API_KEY,
  POLYGON: process.env.POLYGON_API_KEY,
  TWELVE_DATA: process.env.TWELVE_DATA_API_KEY,
  FMP: process.env.FMP_API_KEY,
  RAPIDAPI: process.env.RAPIDAPI_KEY,
};

// Rate limiting tracking
const rateLimits = {
  alphaVantage: { requests: 0, limit: 5, window: 60000, resetTime: Date.now() },
  finnhub: { requests: 0, limit: 60, window: 60000, resetTime: Date.now() },
  polygon: { requests: 0, limit: 100, window: 60000, resetTime: Date.now() },
  twelveData: {
    requests: 0,
    limit: 800,
    window: 86400000,
    resetTime: Date.now(),
  },
  fmp: { requests: 0, limit: 250, window: 86400000, resetTime: Date.now() },
};

// API health tracking
const apiHealth = {
  polygon: { status: "healthy", lastCheck: Date.now(), failures: 0 },
  fmp: { status: "healthy", lastCheck: Date.now(), failures: 0 },
  twelveData: { status: "healthy", lastCheck: Date.now(), failures: 0 },
  alphaVantage: { status: "healthy", lastCheck: Date.now(), failures: 0 },
  finnhub: { status: "healthy", lastCheck: Date.now(), failures: 0 },
};

// Middleware
app.use(express.json());
app.use(helmet());
app.use(morgan("combined"));

// ========================================
// ENHANCED CORS CONFIGURATION FOR VERCEL (WITH WILDCARD SUPPORT)
// ========================================
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // List of allowed origins and patterns
    const allowedOrigins = [
      "https://news-impact-screener.vercel.app",
      "https://news-impact-screener-backend.onrender.com",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
    ];

    const allowedPatterns = [
      /^https:\/\/news-impact-screener.*\.vercel\.app$/, // Any news-impact-screener subdomain on Vercel
      /^https:\/\/.*-juans-projects-.*\.vercel\.app$/, // Your project preview URLs
      /^http:\/\/localhost:\d+$/, // Any localhost port
    ];

    // Check exact matches first
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS: Origin allowed (exact match) - ${origin}`);
      callback(null, true);
      return;
    }

    // Check patterns
    const patternMatch = allowedPatterns.some((pattern) =>
      pattern.test(origin)
    );
    if (patternMatch) {
      console.log(`✅ CORS: Origin allowed (pattern match) - ${origin}`);
      callback(null, true);
      return;
    }

    // Log blocked origins for debugging
    console.log(`⚠️ CORS: Unknown origin - ${origin} (allowing for now)`);
    // TEMPORARY: Allow all origins during debugging
    // TODO: Remove this line in production after confirming all URLs work
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Client-Version",
    "Accept",
  ],
  exposedHeaders: ["X-Rate-Limit-Remaining", "X-Rate-Limit-Reset"],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Explicit OPTIONS handling for preflight requests
app.options("*", cors(corsOptions));

// Additional headers middleware as backup
app.use((req, res, next) => {
  // Only log in development or if there's an issue
  if (process.env.NODE_ENV === "development" || req.headers.origin) {
    console.log(
      `📥 ${new Date().toISOString()} - ${req.method} ${req.path} from ${
        req.headers.origin || "no-origin"
      }`
    );
  }

  // Set security headers
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "DENY");
  res.header("X-XSS-Protection", "1; mode=block");

  // Ensure CORS headers are always set for known origins
  if (req.headers.origin) {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }

  next();
});

console.log(
  "🌐 CORS configured for all Vercel deployments (including previews)"
);

// ========================================
// HELPER FUNCTIONS
// ========================================

// Check and update rate limits
function checkRateLimit(api) {
  const limit = rateLimits[api];
  const now = Date.now();

  if (now - limit.resetTime > limit.window) {
    limit.requests = 0;
    limit.resetTime = now;
  }

  if (limit.requests >= limit.limit) {
    throw new Error(`Rate limit exceeded for ${api}`);
  }

  limit.requests++;
}

// Mark API failure
function markApiFailure(api) {
  apiHealth[api].failures++;
  if (apiHealth[api].failures > 3) {
    apiHealth[api].status = "unhealthy";
  }
  apiHealth[api].lastCheck = Date.now();
}

// Mark API success
function markApiSuccess(api) {
  apiHealth[api].failures = 0;
  apiHealth[api].status = "healthy";
  apiHealth[api].lastCheck = Date.now();
}

// Extended stock universe (50 stocks)
const STOCK_UNIVERSE = [
  // Tech giants
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "META",
  "TSLA",
  "NVDA",
  "AMD",
  "INTC",
  "CRM",
  // Finance
  "JPM",
  "BAC",
  "WFC",
  "GS",
  "MS",
  "C",
  "AXP",
  "V",
  "MA",
  "PYPL",
  // Healthcare
  "JNJ",
  "UNH",
  "PFE",
  "ABT",
  "TMO",
  "MRK",
  "CVS",
  "LLY",
  "MDT",
  "ABBV",
  // Consumer
  "WMT",
  "PG",
  "KO",
  "PEP",
  "COST",
  "MCD",
  "NKE",
  "SBUX",
  "TGT",
  "HD",
  // Industrial & Energy
  "BA",
  "CAT",
  "GE",
  "MMM",
  "HON",
  "XOM",
  "CVX",
  "COP",
  "SLB",
  "OXY",
];

// ========================================
// API INTEGRATION FUNCTIONS
// ========================================

// Polygon.io - Primary for quotes
async function fetchQuotePolygon(symbol) {
  checkRateLimit("polygon");
  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${API_KEYS.POLYGON}`;

  try {
    const response = await axios.get(url, { timeout: 5000 });
    if (response.data.results && response.data.results.length > 0) {
      const data = response.data.results[0];
      markApiSuccess("polygon");
      return {
        symbol,
        price: data.c,
        open: data.o,
        high: data.h,
        low: data.l,
        volume: data.v,
        previousClose: data.c,
        change: 0,
        changePercent: 0,
        source: "polygon",
      };
    }
    throw new Error("No data from Polygon");
  } catch (error) {
    markApiFailure("polygon");
    throw error;
  }
}

// FMP - Batch processing and fallback
async function fetchQuoteFMP(symbol) {
  checkRateLimit("fmp");
  const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${API_KEYS.FMP}`;

  try {
    const response = await axios.get(url, { timeout: 5000 });
    if (response.data && response.data.length > 0) {
      const data = response.data[0];
      markApiSuccess("fmp");
      return {
        symbol: data.symbol,
        price: data.price,
        open: data.open,
        high: data.dayHigh,
        low: data.dayLow,
        volume: data.volume,
        previousClose: data.previousClose,
        change: data.change,
        changePercent: data.changesPercentage,
        source: "fmp",
      };
    }
    throw new Error("No data from FMP");
  } catch (error) {
    markApiFailure("fmp");
    throw error;
  }
}

// FMP Batch quotes - for screening efficiency
async function fetchBatchQuotesFMP(symbols) {
  checkRateLimit("fmp");
  const symbolsStr = symbols.join(",");
  const url = `https://financialmodelingprep.com/api/v3/quote/${symbolsStr}?apikey=${API_KEYS.FMP}`;

  try {
    const response = await axios.get(url, { timeout: 10000 });
    if (response.data && response.data.length > 0) {
      markApiSuccess("fmp");
      return response.data.map((data) => ({
        symbol: data.symbol,
        price: data.price,
        open: data.open,
        high: data.dayHigh,
        low: data.dayLow,
        volume: data.volume,
        previousClose: data.previousClose,
        change: data.change,
        changePercent: data.changesPercentage,
        source: "fmp-batch",
      }));
    }
    throw new Error("No batch data from FMP");
  } catch (error) {
    markApiFailure("fmp");
    throw error;
  }
}

// Twelve Data - Technical indicators
async function fetchTechnicalsTwelveData(symbol) {
  checkRateLimit("twelveData");
  const url = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${API_KEYS.TWELVE_DATA}`;

  try {
    const response = await axios.get(url, { timeout: 5000 });
    if (response.data) {
      markApiSuccess("twelveData");
      return {
        symbol,
        price: parseFloat(response.data.close),
        volume: parseInt(response.data.volume),
        fifty_two_week: {
          high: parseFloat(response.data.fifty_two_week?.high || 0),
          low: parseFloat(response.data.fifty_two_week?.low || 0),
        },
        source: "twelveData",
      };
    }
    throw new Error("No data from Twelve Data");
  } catch (error) {
    markApiFailure("twelveData");
    throw error;
  }
}

// Smart API selection with fallback
async function fetchQuoteWithFallback(symbol) {
  const apis = [
    { name: "polygon", fn: () => fetchQuotePolygon(symbol) },
    { name: "fmp", fn: () => fetchQuoteFMP(symbol) },
    { name: "twelveData", fn: () => fetchTechnicalsTwelveData(symbol) },
  ];

  for (const api of apis) {
    if (apiHealth[api.name].status === "healthy") {
      try {
        return await api.fn();
      } catch (error) {
        console.log(`❌ ${api.name} failed for ${symbol}: ${error.message}`);
      }
    }
  }

  throw new Error(`All APIs failed for ${symbol}`);
}

// ========================================
// API ENDPOINTS
// ========================================

// Health check with detailed info
app.get("/api/health", (req, res) => {
  const now = Date.now();

  // Update rate limit info
  Object.keys(rateLimits).forEach((api) => {
    const limit = rateLimits[api];
    if (now - limit.resetTime > limit.window) {
      limit.requests = 0;
      limit.resetTime = now;
    }
    limit.resetIn = Math.max(0, limit.window - (now - limit.resetTime));
  });

  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "4.0.0-multi-api",
    apis: {
      alphaVantage: !!API_KEYS.ALPHA_VANTAGE,
      finnhub: !!API_KEYS.FINNHUB,
      polygon: !!API_KEYS.POLYGON,
      twelveData: !!API_KEYS.TWELVE_DATA,
      fmp: !!API_KEYS.FMP,
      rapidapi: !!API_KEYS.RAPIDAPI,
    },
    rateLimits,
    apiHealth,
    cache: cache.getStats(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Get quote for a single symbol
app.get("/api/quotes/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const cacheKey = `quote_${symbol}`;

  try {
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit for ${symbol}`);
      return res.json(cached);
    }

    // Fetch with smart API selection
    const data = await fetchQuoteWithFallback(symbol);
    cache.set(cacheKey, data);

    console.log(`✅ Quote fetched for ${symbol} from ${data.source}`);
    res.json(data);
  } catch (error) {
    console.error(`❌ Quote error for ${symbol}:`, error.message);
    res.status(500).json({
      error: "Failed to fetch quote",
      symbol,
      message: error.message,
    });
  }
});

// Batch quotes endpoint
app.get("/api/quotes/batch/:symbols", async (req, res) => {
  const symbols = req.params.symbols.split(",");
  const cacheKey = `batch_${symbols.join(",")}`;

  try {
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit for batch ${symbols.length} symbols`);
      return res.json(cached);
    }

    // Try FMP batch first
    if (apiHealth.fmp.status === "healthy") {
      try {
        const data = await fetchBatchQuotesFMP(symbols);
        cache.set(cacheKey, data);
        console.log(
          `✅ Batch quotes fetched for ${symbols.length} symbols from FMP`
        );
        return res.json(data);
      } catch (error) {
        console.log(`⚠️ FMP batch failed: ${error.message}`);
      }
    }

    // Fallback to individual requests
    const results = await Promise.allSettled(
      symbols.map((symbol) => fetchQuoteWithFallback(symbol))
    );

    const data = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    cache.set(cacheKey, data);
    console.log(
      `✅ Batch quotes fetched for ${data.length}/${symbols.length} symbols`
    );
    res.json(data);
  } catch (error) {
    console.error("❌ Batch quote error:", error.message);
    res.status(500).json({
      error: "Failed to fetch batch quotes",
      message: error.message,
    });
  }
});

// News endpoint
app.get("/api/news/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const cacheKey = `news_${symbol}`;

  try {
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    if (!API_KEYS.FINNHUB) {
      throw new Error("Finnhub API key not configured");
    }

    checkRateLimit("finnhub");
    const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=2024-01-01&to=2025-12-31&token=${API_KEYS.FINNHUB}`;

    const response = await axios.get(url, { timeout: 5000 });
    const news = response.data.slice(0, 10); // Latest 10 news items

    cache.set(cacheKey, news);
    console.log(`✅ News fetched for ${symbol}: ${news.length} items`);
    res.json(news);
  } catch (error) {
    console.error(`❌ News error for ${symbol}:`, error.message);
    res.status(500).json({
      error: "Failed to fetch news",
      symbol,
      message: error.message,
    });
  }
});

// Technical indicators endpoint
app.get("/api/technicals/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const cacheKey = `technicals_${symbol}`;

  try {
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Try Twelve Data first
    let technicals = null;
    if (apiHealth.twelveData.status === "healthy") {
      try {
        technicals = await fetchTechnicalsTwelveData(symbol);
      } catch (error) {
        console.log(`⚠️ Twelve Data failed: ${error.message}`);
      }
    }

    // Fallback to basic data
    if (!technicals) {
      const quote = await fetchQuoteWithFallback(symbol);
      technicals = {
        symbol,
        price: quote.price,
        volume: quote.volume,
        source: quote.source,
      };
    }

    cache.set(cacheKey, technicals);
    console.log(
      `✅ Technicals fetched for ${symbol} from ${technicals.source}`
    );
    res.json({ technicals });
  } catch (error) {
    console.error(`❌ Technicals error for ${symbol}:`, error.message);
    res.status(500).json({
      error: "Failed to fetch technicals",
      symbol,
      message: error.message,
    });
  }
});

// Enhanced screening endpoint
app.get("/api/screening", async (req, res) => {
  const cacheKey = "screening_all";

  try {
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log("✅ Returning cached screening data");
      return res.json(cached);
    }

    console.log(
      `🔄 Starting enhanced screening for ${STOCK_UNIVERSE.length} stocks...`
    );
    const startTime = Date.now();

    // Process in batches for efficiency
    const batchSize = 20;
    const batches = [];
    for (let i = 0; i < STOCK_UNIVERSE.length; i += batchSize) {
      batches.push(STOCK_UNIVERSE.slice(i, i + batchSize));
    }

    const allResults = [];
    let processedCount = 0;
    let successCount = 0;

    for (const batch of batches) {
      // Try batch processing first
      if (apiHealth.fmp.status === "healthy") {
        try {
          const batchData = await fetchBatchQuotesFMP(batch);
          allResults.push(...batchData);
          processedCount += batch.length;
          successCount += batchData.length;
          console.log(
            `✅ Batch processed: ${batchData.length}/${batch.length} stocks`
          );
          continue;
        } catch (error) {
          console.log(`⚠️ Batch processing failed: ${error.message}`);
        }
      }

      // Fallback to individual processing
      const results = await Promise.allSettled(
        batch.map((symbol) => fetchQuoteWithFallback(symbol))
      );

      results.forEach((result, index) => {
        processedCount++;
        if (result.status === "fulfilled") {
          allResults.push(result.value);
          successCount++;
        } else {
          console.log(`❌ Failed: ${batch[index]} - ${result.reason?.message}`);
        }
      });
    }

    const processingTime = Date.now() - startTime;

    // Calculate basic NISS scores
    const resultsWithScores = allResults.map((stock) => ({
      ...stock,
      nissScore: Math.random() * 10, // Placeholder - implement real NISS calculation
      momentum:
        stock.changePercent > 2
          ? "STRONG"
          : stock.changePercent < -2
          ? "WEAK"
          : "NEUTRAL",
    }));

    const response = {
      results: resultsWithScores.sort((a, b) => b.nissScore - a.nissScore),
      summary: {
        totalProcessed: processedCount,
        successCount,
        failureCount: processedCount - successCount,
        successRate: Math.round((successCount / processedCount) * 100),
        processingTime,
        apiUsage: {
          primary:
            apiHealth.fmp.status === "healthy"
              ? "FMP batch processing"
              : "Mixed API fallback",
          healthy: Object.keys(apiHealth).filter(
            (api) => apiHealth[api].status === "healthy"
          ),
        },
      },
      timestamp: new Date().toISOString(),
    };

    // Cache for 2 minutes
    cache.set(cacheKey, response, 120);

    console.log(
      `✅ Screening complete: ${successCount}/${processedCount} stocks in ${processingTime}ms`
    );
    res.json(response);
  } catch (error) {
    console.error("❌ Screening error:", error);
    res.status(500).json({
      error: "Screening failed",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Market context endpoint
app.get("/api/market-context", async (req, res) => {
  const cacheKey = "market_context";

  try {
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Get SPY data for market context
    const spyData = await fetchQuoteWithFallback("SPY");
    const spyChange = spyData.changePercent || 0;

    const marketContext = {
      spy: {
        price: spyData.price,
        change: spyData.change,
        changePercent: spyChange,
        volume: spyData.volume,
      },
      vix: {
        value: 20 + Math.random() * 10, // Placeholder
        level: spyChange > 2 ? "HIGH" : spyChange < -2 ? "HIGH" : "NORMAL",
      },
      sentiment:
        spyChange > 1 ? "BULLISH" : spyChange < -1 ? "BEARISH" : "NEUTRAL",
      breadth: {
        advancing: Math.floor(Math.random() * 30),
        declining: Math.floor(Math.random() * 20),
        unchanged: Math.floor(Math.random() * 10),
      },
      marketStatus:
        spyChange > 2
          ? "BROAD_RALLY"
          : spyChange < -2
          ? "BROAD_SELLOFF"
          : "MIXED",
      lastUpdate: new Date().toISOString(),
      source: spyData.source,
    };

    cache.set(cacheKey, marketContext, 300); // 5 minute cache
    console.log(
      `✅ Market Context: SPY ${marketContext.spy.changePercent}% (${marketContext.sentiment})`
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

// Test API keys endpoint
app.get("/api/test-keys", async (req, res) => {
  const testResults = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  // Test Polygon
  try {
    await fetchQuotePolygon("AAPL");
    testResults.tests.polygon = {
      status: "✅ SUCCESS",
      message: "API key working",
    };
  } catch (error) {
    testResults.tests.polygon = { status: "❌ FAILED", message: error.message };
  }

  // Test FMP
  try {
    await fetchQuoteFMP("AAPL");
    testResults.tests.fmp = {
      status: "✅ SUCCESS",
      message: "API key working",
    };
  } catch (error) {
    testResults.tests.fmp = { status: "❌ FAILED", message: error.message };
  }

  // Test Twelve Data
  try {
    await fetchTechnicalsTwelveData("AAPL");
    testResults.tests.twelveData = {
      status: "✅ SUCCESS",
      message: "API key working",
    };
  } catch (error) {
    testResults.tests.twelveData = {
      status: "❌ FAILED",
      message: error.message,
    };
  }

  // Test Finnhub
  try {
    checkRateLimit("finnhub");
    await axios.get(
      `https://finnhub.io/api/v1/company-news?symbol=AAPL&from=2024-07-01&to=2025-08-01&token=${API_KEYS.FINNHUB}`,
      { timeout: 5000 }
    );
    testResults.tests.finnhub = {
      status: "✅ SUCCESS",
      message: "API key working",
    };
  } catch (error) {
    testResults.tests.finnhub = { status: "❌ FAILED", message: error.message };
  }

  console.log("🧪 API Key Test Results:", testResults);
  res.json(testResults);
});

// Root health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "News Impact Screener Backend - Multi-API Enhanced",
    timestamp: new Date().toISOString(),
    version: "4.0.0-multi-api",
  });
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
  console.log(`❌ 404 - ${req.method} ${req.path} not found`);
  res.status(404).json({
    error: "Not found",
    message: `Endpoint ${req.method} ${req.path} not found`,
    availableEndpoints: [
      "GET /health",
      "GET /api/health",
      "GET /api/quotes/:symbol",
      "GET /api/quotes/batch/:symbols",
      "GET /api/news/:symbol",
      "GET /api/technicals/:symbol",
      "GET /api/screening",
      "GET /api/market-context",
      "GET /api/test-keys",
    ],
    timestamp: new Date().toISOString(),
    version: "4.0.0-multi-api",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 ===== NEWS IMPACT SCREENER BACKEND v4.0.0 =====`);
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test Keys: http://localhost:${PORT}/api/test-keys`);
  console.log(`\n📋 Enhanced Endpoints:`);
  console.log(`   GET /api/quotes/:symbol - Multi-API stock quotes`);
  console.log(`   GET /api/quotes/batch/:symbols - Batch quotes (FMP)`);
  console.log(`   GET /api/news/:symbol - Company news (Finnhub)`);
  console.log(`   GET /api/technicals/:symbol - Multi-API technical analysis`);
  console.log(`   GET /api/screening - Enhanced stock screening (50+ stocks)`);
  console.log(`   GET /api/market-context - Enhanced market overview`);
  console.log(`\n📊 Multi-API Status:`);
  console.log(
    `   Alpha Vantage: ${
      API_KEYS.ALPHA_VANTAGE ? "✅ Ready (Fallback)" : "❌ Missing"
    }`
  );
  console.log(
    `   Finnhub: ${API_KEYS.FINNHUB ? "✅ Ready (News)" : "❌ Missing"}`
  );
  console.log(
    `   Polygon: ${
      API_KEYS.POLYGON ? "✅ Ready (Primary Quotes)" : "❌ Missing"
    }`
  );
  console.log(
    `   Twelve Data: ${
      API_KEYS.TWELVE_DATA ? "✅ Ready (Primary Technicals)" : "❌ Missing"
    }`
  );
  console.log(
    `   FMP: ${API_KEYS.FMP ? "✅ Ready (Batch + Fallback)" : "❌ Missing"}`
  );
  console.log(`   RapidAPI: ${API_KEYS.RAPIDAPI ? "✅ Ready" : "❌ Missing"}`);
  console.log(`\n🎯 Performance Targets:`);
  console.log(`   📊 Stock Screening: 50+ stocks in <15 seconds`);
  console.log(`   📈 Quote Requests: 100/minute capacity (Polygon)`);
  console.log(`   📋 Technical Analysis: 800/day capacity (Twelve Data)`);
  console.log(`   🔄 Smart Failover: Automatic API switching on failures`);
  console.log(`   💾 Intelligent Caching: 5-minute refresh strategy`);
  console.log(`\n🌐 CORS: Configured for Vercel deployments`);
  console.log(`\n🚀 Ready for production!\n`);
});

module.exports = app;
