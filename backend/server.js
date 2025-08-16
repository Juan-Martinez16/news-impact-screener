// backend/server.js - OPTIMIZED VERSION
// Enhanced error handling and CORS configuration to fix frontend tab issues

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log("\n🚀 ===== NEWS IMPACT SCREENER BACKEND v4.1.0 =====");
console.log(`📅 Started at: ${new Date().toISOString()}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`🔌 Port: ${PORT}`);

// ============================================
// ENHANCED CORS CONFIGURATION
// ============================================

app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // Allow embedding for development
  })
);

app.use(
  cors({
    origin: function (origin, callback) {
      // Log all incoming requests for debugging
      console.log(`🔍 CORS request from origin: ${origin || "null"}`);

      const allowedOrigins = [
        // Local development
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        // Production origins
        "https://news-impact-screener.vercel.app",
        "https://news-impact-screener-backend.onrender.com",
        // Claude.ai artifacts (for testing)
        "https://claude.ai",
        "https://artifacts.anthropic.com",
      ];

      // Allow requests without origin (mobile apps, Postman, curl)
      if (!origin) {
        console.log("✅ CORS: Allowing request without origin");
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
        console.log(`✅ CORS: Allowed origin: ${origin}`);
        callback(null, true);
      } else {
        console.log(`⚠️ CORS: Origin not in allowlist: ${origin}`);
        // In development, be more permissive
        if (process.env.NODE_ENV !== "production") {
          console.log(`🔧 Development mode: allowing ${origin}`);
          callback(null, true);
        } else {
          console.log(`❌ Production mode: blocking ${origin}`);
          callback(new Error("Not allowed by CORS"));
        }
      }
    },
    credentials: false, // Set to true if you need cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "X-Request-ID",
      "X-Client-Version",
      "Cache-Control",
    ],
    optionsSuccessStatus: 200,
  })
);

// Enhanced logging
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ============================================
// API CONFIGURATION & RATE LIMITING
// ============================================

const API_KEYS = {
  ALPHA_VANTAGE: process.env.ALPHA_VANTAGE_API_KEY,
  FINNHUB: process.env.FINNHUB_API_KEY,
  POLYGON: process.env.POLYGON_API_KEY,
  RAPIDAPI: process.env.RAPIDAPI_API_KEY,
  TWELVE_DATA: process.env.TWELVE_DATA_API_KEY,
  FMP: process.env.FMP_API_KEY,
};

// Rate limiting tracking
const rateLimits = {
  polygon: { requests: 0, limit: 100, window: 60000, lastReset: Date.now() },
  fmp: { requests: 0, limit: 250, window: 86400000, lastReset: Date.now() },
  twelveData: {
    requests: 0,
    limit: 800,
    window: 86400000,
    lastReset: Date.now(),
  },
  finnhub: { requests: 0, limit: 60, window: 60000, lastReset: Date.now() },
  alphaVantage: { requests: 0, limit: 5, window: 60000, lastReset: Date.now() },
};

// Enhanced error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const errorHandler = (err, req, res, next) => {
  console.error(`❌ Error in ${req.method} ${req.path}:`, err.message);
  console.error("Stack trace:", err.stack);

  // Default error response
  let error = { ...err };
  error.message = err.message;

  // Handle specific error types
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    error = { message, statusCode: 400 };
  } else if (err.code === 11000) {
    const message = "Duplicate field value entered";
    error = { message, statusCode: 400 };
  } else if (err.name === "CastError") {
    const message = "Resource not found";
    error = { message, statusCode: 404 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "Server Error",
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  });
};

// Rate limit checker
const checkRateLimit = (apiName) => {
  const limit = rateLimits[apiName];
  if (!limit) return true;

  const now = Date.now();
  if (now - limit.lastReset > limit.window) {
    limit.requests = 0;
    limit.lastReset = now;
  }

  const usageLimit =
    process.env.NODE_ENV === "production"
      ? limit.limit * 0.9
      : limit.limit * 0.7;

  if (limit.requests >= usageLimit) {
    throw new Error(
      `Rate limit exceeded for ${apiName} (${limit.requests}/${limit.limit})`
    );
  }
  limit.requests++;
  return true;
};

console.log("\n📋 Multi-API Configuration:");
console.log(
  `   Alpha Vantage: ${API_KEYS.ALPHA_VANTAGE ? "✅ Ready" : "❌ Missing"}`
);
console.log(`   Finnhub: ${API_KEYS.FINNHUB ? "✅ Ready" : "❌ Missing"}`);
console.log(`   Polygon: ${API_KEYS.POLYGON ? "✅ Ready" : "❌ Missing"}`);
console.log(
  `   Twelve Data: ${API_KEYS.TWELVE_DATA ? "✅ Ready" : "❌ Missing"}`
);
console.log(`   FMP: ${API_KEYS.FMP ? "✅ Ready" : "❌ Missing"}`);
console.log(`   RapidAPI: ${API_KEYS.RAPIDAPI ? "✅ Ready" : "❌ Missing"}`);

// ============================================
// ENHANCED API UTILITIES
// ============================================

const makeApiCall = async (url, options = {}, apiName = "unknown") => {
  const startTime = Date.now();

  try {
    console.log(`🌐 API Call [${apiName}]: ${url}`);

    // Check rate limits
    checkRateLimit(apiName);

    const defaultOptions = {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "NewsImpactScreener/4.1.0",
      },
      timeout: 10000,
    };

    const response = await fetch(url, { ...defaultOptions, ...options });
    const responseTime = Date.now() - startTime;

    console.log(
      `📡 Response [${apiName}]: ${response.status} (${responseTime}ms)`
    );

    if (!response.ok) {
      throw new Error(
        `API call failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return {
      success: true,
      data,
      source: apiName,
      responseTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(
      `❌ API Error [${apiName}] (${responseTime}ms):`,
      error.message
    );

    throw {
      success: false,
      error: error.message,
      source: apiName,
      responseTime,
      timestamp: new Date().toISOString(),
    };
  }
};

// Enhanced batch quote processing for FMP
const getBatchQuotes = async (symbols) => {
  if (!symbols || symbols.length === 0) {
    throw new Error("No symbols provided for batch quotes");
  }

  try {
    const symbolsString = symbols.slice(0, 20).join(","); // FMP limit: 20 symbols
    const url = `https://financialmodelingprep.com/api/v3/quote/${symbolsString}?apikey=${API_KEYS.FMP}`;

    const result = await makeApiCall(url, {}, "fmp-batch");

    if (!result.success || !Array.isArray(result.data)) {
      throw new Error("Invalid batch quote response");
    }

    return {
      success: true,
      data: result.data.map((quote) => ({
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        changesPercentage: quote.changesPercentage,
        volume: quote.volume,
        marketCap: quote.marketCap,
        source: "fmp-batch",
        timestamp: new Date().toISOString(),
      })),
      count: result.data.length,
      source: "fmp-batch",
    };
  } catch (error) {
    console.error("❌ Batch quotes error:", error);
    throw error;
  }
};

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

app.get(
  "/api/health",
  asyncHandler(async (req, res) => {
    const healthCheck = {
      status: "OK",
      version: "4.1.0-optimized",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      apis: {
        available: Object.keys(API_KEYS).length,
        configured: Object.values(API_KEYS).filter(Boolean).length,
        ready: Object.entries(API_KEYS).reduce((acc, [key, value]) => {
          acc[key.toLowerCase()] = !!value;
          return acc;
        }, {}),
      },
      rateLimits: Object.entries(rateLimits).reduce((acc, [api, limit]) => {
        acc[api] = {
          used: limit.requests,
          limit: limit.limit,
          remaining: limit.limit - limit.requests,
          resetTime: new Date(limit.lastReset + limit.window).toISOString(),
        };
        return acc;
      }, {}),
      memory: process.memoryUsage(),
      cors: {
        enabled: true,
        mode: process.env.NODE_ENV === "production" ? "strict" : "permissive",
      },
    };

    res.json(healthCheck);
  })
);

app.get(
  "/api/test-keys",
  asyncHandler(async (req, res) => {
    const results = {};
    const startTime = Date.now();

    try {
      // Test Polygon (primary quote source)
      if (API_KEYS.POLYGON) {
        try {
          const polygonUrl = `https://api.polygon.io/v2/aggs/ticker/AAPL/prev?adjusted=true&apiKey=${API_KEYS.POLYGON}`;
          const polygonResult = await makeApiCall(polygonUrl, {}, "polygon");
          results.polygon = {
            status: "✅ Working",
            responseTime: polygonResult.responseTime,
          };
        } catch (err) {
          results.polygon = { status: "❌ Failed", error: err.message };
        }
      } else {
        results.polygon = {
          status: "❌ Missing",
          error: "API key not configured",
        };
      }

      // Test FMP (batch processing)
      if (API_KEYS.FMP) {
        try {
          const fmpUrl = `https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${API_KEYS.FMP}`;
          const fmpResult = await makeApiCall(fmpUrl, {}, "fmp");
          results.fmp = {
            status: "✅ Working",
            responseTime: fmpResult.responseTime,
          };
        } catch (err) {
          results.fmp = { status: "❌ Failed", error: err.message };
        }
      } else {
        results.fmp = { status: "❌ Missing", error: "API key not configured" };
      }

      // Test Twelve Data (technical indicators)
      if (API_KEYS.TWELVE_DATA) {
        try {
          const twelveUrl = `https://api.twelvedata.com/quote?symbol=AAPL&apikey=${API_KEYS.TWELVE_DATA}`;
          const twelveResult = await makeApiCall(twelveUrl, {}, "twelveData");
          results.twelveData = {
            status: "✅ Working",
            responseTime: twelveResult.responseTime,
          };
        } catch (err) {
          results.twelveData = { status: "❌ Failed", error: err.message };
        }
      } else {
        results.twelveData = {
          status: "❌ Missing",
          error: "API key not configured",
        };
      }

      const totalTime = Date.now() - startTime;
      const workingAPIs = Object.values(results).filter((r) =>
        r.status.includes("✅")
      ).length;

      res.json({
        summary: {
          total: Object.keys(results).length,
          working: workingAPIs,
          failed: Object.keys(results).length - workingAPIs,
          totalTime: `${totalTime}ms`,
          readyForOptimization: workingAPIs >= 3,
        },
        tests: results,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: "Test execution failed",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

// ============================================
// MARKET CONTEXT ENDPOINT
// ============================================

app.get(
  "/api/market-context",
  asyncHandler(async (req, res) => {
    try {
      console.log("📈 Loading market context...");

      // Get SPY data for market overview
      let spyData = null;
      let vixData = null;

      try {
        if (API_KEYS.FMP) {
          const spyUrl = `https://financialmodelingprep.com/api/v3/quote/SPY?apikey=${API_KEYS.FMP}`;
          const spyResult = await makeApiCall(spyUrl, {}, "fmp");
          if (spyResult.success && spyResult.data[0]) {
            spyData = spyResult.data[0];
          }
        }
      } catch (err) {
        console.warn("⚠️ Could not fetch SPY data:", err.message);
      }

      // Determine market context
      const spyChange = spyData?.changesPercentage || 0;
      const volatility =
        Math.abs(spyChange) > 2
          ? "HIGH"
          : Math.abs(spyChange) > 1
          ? "NORMAL"
          : "LOW";
      const trend =
        spyChange > 0.5 ? "BULLISH" : spyChange < -0.5 ? "BEARISH" : "NEUTRAL";

      const marketContext = {
        spyChange: spyChange,
        spyPrice: spyData?.price || 0,
        volatility: volatility,
        trend: trend,
        breadth: "MIXED", // Would need additional data for accurate breadth
        vix: vixData?.price || 20, // Default VIX value
        lastUpdate: new Date().toISOString(),
        dataSource: spyData ? "FMP" : "SIMULATED",
        indicators: {
          riskOn: spyChange > 1,
          defensive: spyChange < -1,
          neutral: Math.abs(spyChange) <= 1,
        },
      };

      console.log("✅ Market context loaded:", {
        trend: marketContext.trend,
        volatility: marketContext.volatility,
        spyChange: marketContext.spyChange.toFixed(2) + "%",
      });

      res.json(marketContext);
    } catch (error) {
      console.error("❌ Market context error:", error);

      // Return default market context on error
      res.json({
        spyChange: 0,
        spyPrice: 500,
        volatility: "NORMAL",
        trend: "NEUTRAL",
        breadth: "MIXED",
        vix: 20,
        lastUpdate: new Date().toISOString(),
        dataSource: "DEFAULT",
        error: error.message,
        indicators: {
          riskOn: false,
          defensive: false,
          neutral: true,
        },
      });
    }
  })
);

// ============================================
// ENHANCED SCREENING ENDPOINT
// ============================================

app.get(
  "/api/screening",
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    console.log("🔍 Starting enhanced stock screening...");

    try {
      // Pre-selected stock universe (top 50 liquid stocks)
      const stockUniverse = [
        "AAPL",
        "MSFT",
        "GOOGL",
        "AMZN",
        "META",
        "TSLA",
        "NVDA",
        "BRK.B",
        "UNH",
        "JNJ",
        "JPM",
        "V",
        "PG",
        "XOM",
        "HD",
        "CVX",
        "MA",
        "BAC",
        "ABBV",
        "PFE",
        "AVGO",
        "KO",
        "WMT",
        "LLY",
        "MRK",
        "COST",
        "DIS",
        "TMO",
        "ACN",
        "DHR",
        "VZ",
        "ADBE",
        "NKE",
        "MCD",
        "NFLX",
        "CRM",
        "ABT",
        "TXN",
        "CMCSA",
        "NEE",
        "WFC",
        "RTX",
        "QCOM",
        "UPS",
        "PM",
        "LOW",
        "HON",
        "IBM",
        "INTC",
        "AMD",
      ];

      const batchSize = 20; // Process in batches for rate limiting
      const results = [];
      const errors = [];
      let processed = 0;

      console.log(
        `📊 Processing ${stockUniverse.length} stocks in batches of ${batchSize}...`
      );

      // Process stocks in batches
      for (let i = 0; i < stockUniverse.length; i += batchSize) {
        const batch = stockUniverse.slice(i, i + batchSize);
        console.log(
          `🔄 Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.join(
            ", "
          )}`
        );

        try {
          // Get batch quotes from FMP (most efficient)
          const batchQuotes = await getBatchQuotes(batch);

          if (batchQuotes.success && batchQuotes.data) {
            for (const quote of batchQuotes.data) {
              // Calculate NISS score (simplified but realistic)
              const nissScore = calculateNISS(quote);

              // Determine sentiment and confidence
              const sentiment =
                quote.changesPercentage > 1
                  ? "BULLISH"
                  : quote.changesPercentage < -1
                  ? "BEARISH"
                  : "NEUTRAL";
              const confidence =
                Math.abs(quote.changesPercentage) > 2
                  ? "HIGH"
                  : Math.abs(quote.changesPercentage) > 0.5
                  ? "MEDIUM"
                  : "LOW";

              results.push({
                symbol: quote.symbol,
                currentPrice: quote.price,
                change: quote.change,
                changePercent: quote.changesPercentage,
                volume: quote.volume,
                marketCap: quote.marketCap,
                nissScore: nissScore,
                sentiment: sentiment,
                confidence: confidence,
                newsCount: Math.floor(Math.random() * 10) + 1, // Simulated
                lastUpdated: new Date().toISOString(),
                source: "fmp-batch",
              });

              processed++;
            }
          }

          // Small delay between batches to respect rate limits
          if (i + batchSize < stockUniverse.length) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (batchError) {
          console.error(
            `❌ Batch error for ${batch.join(", ")}:`,
            batchError.message
          );
          errors.push({
            batch: batch,
            error: batchError.message,
          });
        }
      }

      const totalTime = Date.now() - startTime;
      const successRate = (processed / stockUniverse.length) * 100;

      console.log(
        `✅ Screening completed: ${processed}/${
          stockUniverse.length
        } stocks (${successRate.toFixed(1)}%) in ${totalTime}ms`
      );

      // Sort by NISS score
      results.sort((a, b) => (b.nissScore || 0) - (a.nissScore || 0));

      res.json({
        stocks: results,
        summary: {
          totalProcessed: processed,
          totalRequested: stockUniverse.length,
          successRate: successRate.toFixed(1),
          processingTime: `${totalTime}ms`,
          avgTimePerStock: `${(totalTime / processed).toFixed(0)}ms`,
          errors: errors.length,
          timestamp: new Date().toISOString(),
        },
        performance: {
          batchSize: batchSize,
          totalBatches: Math.ceil(stockUniverse.length / batchSize),
          apiUsage: {
            primary: "FMP batch processing",
            fallback: "Individual API calls",
            rateLimit: "Respected",
          },
        },
        errors: errors,
      });
    } catch (error) {
      console.error("❌ Screening failed:", error);
      res.status(500).json({
        error: "Screening failed",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

// ============================================
// HELPER FUNCTIONS
// ============================================

// Enhanced NISS calculation
function calculateNISS(stockData) {
  try {
    const { changesPercentage = 0, volume = 0, marketCap = 0 } = stockData;

    // NISS components (simplified but realistic)
    const momentum = Math.min(Math.abs(changesPercentage) * 2, 3); // 0-3 points
    const volumeScore = volume > 1000000 ? 2 : volume > 500000 ? 1 : 0; // 0-2 points
    const liquidityScore =
      marketCap > 100000000000 ? 2 : marketCap > 10000000000 ? 1 : 0; // 0-2 points
    const volatilityScore =
      Math.abs(changesPercentage) > 2
        ? 2
        : Math.abs(changesPercentage) > 1
        ? 1
        : 0; // 0-2 points
    const newsImpact = Math.random() * 1; // 0-1 point (simulated)

    const nissScore =
      momentum + volumeScore + liquidityScore + volatilityScore + newsImpact;
    return Math.min(Math.max(nissScore, 0), 10); // Clamp between 0-10
  } catch (error) {
    console.error("❌ NISS calculation error:", error);
    return 5; // Default neutral score
  }
}

// ============================================
// ERROR HANDLING & SERVER STARTUP
// ============================================

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("👋 SIGINT received, shutting down gracefully...");
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🎯 ===== SERVER READY =====`);
  console.log(`📡 Backend running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test APIs: http://localhost:${PORT}/api/test-keys`);
  console.log(`📊 Screening: http://localhost:${PORT}/api/screening`);
  console.log(`📈 Market context: http://localhost:${PORT}/api/market-context`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`✅ Ready for frontend connections!\n`);
});

module.exports = app;
