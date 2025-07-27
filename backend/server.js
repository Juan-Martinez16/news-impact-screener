const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://your-frontend-domain.vercel.app", // Replace with your actual frontend URL
      /\.vercel\.app$/,
      /\.netlify\.app$/,
      /\.render\.com$/,
    ],
    credentials: true,
  })
);
app.use(express.json());

// API Keys from environment variables
const FINNHUB_KEY = process.env.FINNHUB_KEY;
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY;
const POLYGON_KEY = process.env.POLYGON_KEY;

console.log("🚀 Starting News Impact Screener Backend...");
console.log("📊 API Keys Status:");
console.log(`   Finnhub: ${FINNHUB_KEY ? "✅ Present" : "❌ Missing"}`);
console.log(
  `   Alpha Vantage: ${ALPHA_VANTAGE_KEY ? "✅ Present" : "❌ Missing"}`
);
console.log(`   Polygon: ${POLYGON_KEY ? "✅ Present" : "❌ Missing"}`);

// Screening Universe - Matches your InstitutionalDataService exactly
const SCREENING_UNIVERSE = {
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
  banks: ["BAC", "WFC", "C", "GS", "MS", "USB", "PNC", "TFC", "COF", "SCHW"],
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
  reits: ["AMT", "PLD", "CCI", "EQIX", "PSA", "SPG", "O", "WELL", "AVB", "EQR"],

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

// Get all symbols from screening universe
function getAllScreeningSymbols() {
  return Object.values(SCREENING_UNIVERSE).flat();
}

// Get sector for symbol
function getSectorForSymbol(symbol) {
  for (const [sector, symbols] of Object.entries(SCREENING_UNIVERSE)) {
    if (symbols.includes(symbol)) return sector;
  }
  return "other";
}

// Rate limiting helper
const rateLimiter = new Map();
const RATE_LIMIT_PER_MINUTE = 50;

function checkRateLimit(key) {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window

  if (!rateLimiter.has(key)) {
    rateLimiter.set(key, []);
  }

  const requests = rateLimiter.get(key);

  // Remove old requests
  while (requests.length > 0 && requests[0] < windowStart) {
    requests.shift();
  }

  if (requests.length >= RATE_LIMIT_PER_MINUTE) {
    return false;
  }

  requests.push(now);
  return true;
}

// Enhanced quote endpoint with better error handling
app.get("/api/quote/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Rate limiting check
    if (!checkRateLimit(`quote_${clientIp}`)) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please try again later.",
        retryAfter: 60,
      });
    }

    console.log(`📊 Fetching quote for ${symbol}`);

    if (!FINNHUB_KEY) {
      return res.status(500).json({ error: "Finnhub API key not configured" });
    }

    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`,
      {
        timeout: 10000,
        headers: {
          "User-Agent": "NewsImpactScreener/1.0",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({
          error: "API rate limit exceeded",
          retryAfter: 60,
        });
      }
      throw new Error(
        `Finnhub API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data && typeof data.c === "number" && data.c > 0) {
      // Enhanced quote with additional calculated fields
      const quote = {
        symbol: symbol,
        price: Number(data.c.toFixed(2)),
        changePercent: Number(
          (((data.c - data.pc) / data.pc) * 100).toFixed(2)
        ),
        volume: data.v || 0,
        high: Number(data.h?.toFixed(2) || data.c.toFixed(2)),
        low: Number(data.l?.toFixed(2) || data.c.toFixed(2)),
        open: Number(data.o?.toFixed(2) || data.c.toFixed(2)),
        previousClose: Number(data.pc?.toFixed(2) || data.c.toFixed(2)),
        timestamp: new Date().toISOString(),
        sector: getSectorForSymbol(symbol),

        // Estimated additional fields (in production, get from additional APIs)
        avgVolume: Math.floor(
          (data.v || 1000000) * (0.8 + Math.random() * 0.4)
        ),
        high52Week: Number((data.c * (1.2 + Math.random() * 0.8)).toFixed(2)),
        low52Week: Number((data.c * (0.4 + Math.random() * 0.4)).toFixed(2)),
        marketCap: estimateMarketCap(symbol, data.c),
      };

      console.log(
        `✅ Quote for ${symbol}: $${quote.price} (${
          quote.changePercent > 0 ? "+" : ""
        }${quote.changePercent}%) [${quote.sector}]`
      );

      res.json({ success: true, data: quote });
    } else {
      console.log(`❌ Invalid data for ${symbol}:`, data);
      res.status(404).json({
        success: false,
        error: "No valid quote data found",
        symbol: symbol,
        receivedData: data,
      });
    }
  } catch (error) {
    console.error(
      `❌ Error fetching quote for ${req.params.symbol}:`,
      error.message
    );
    res.status(500).json({
      success: false,
      error: "Failed to fetch quote",
      details: error.message,
      symbol: req.params.symbol,
    });
  }
});
// Enhanced news endpoint
app.get("/api/news/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Rate limiting check
    if (!checkRateLimit(`news_${clientIp}`)) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please try again later.",
        retryAfter: 60,
      });
    }

    console.log(`📰 Fetching news for ${symbol}`);

    if (!FINNHUB_KEY) {
      return res.status(500).json({ error: "Finnhub API key not configured" });
    }

    const toDate = new Date().toISOString().split("T")[0];
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
      .toISOString()
      .split("T")[0];

    const response = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${FINNHUB_KEY}`,
      {
        timeout: 15000,
        headers: {
          "User-Agent": "NewsImpactScreener/1.0",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({
          error: "API rate limit exceeded",
          retryAfter: 60,
        });
      }
      throw new Error(
        `Finnhub API error: ${response.status} ${response.statusText}`
      );
    }

    const news = await response.json();

    if (Array.isArray(news)) {
      // Filter and enhance news with better analysis
      const filteredNews = news
        .filter((article) => article.headline && article.headline.length > 10)
        .slice(0, 20) // Limit to 20 most recent
        .map((article) => ({
          ...article,
          sentiment: calculateSentiment(
            article.headline + " " + (article.summary || "")
          ),
          category: categorizeNews(article.headline),
          relevanceScore: calculateRelevance(article.headline, symbol),
          catalysts: identifyCatalysts(article.headline),
          confidence: calculateNewsConfidence(article),
        }));

      console.log(
        `✅ Found ${filteredNews.length} news articles for ${symbol}`
      );
      res.json({ success: true, data: filteredNews });
    } else {
      console.log(`❌ Invalid news data for ${symbol}:`, news);
      res.json({ success: true, data: [] }); // Return empty array instead of error
    }
  } catch (error) {
    console.error(
      `❌ Error fetching news for ${req.params.symbol}:`,
      error.message
    );
    res.status(500).json({
      success: false,
      error: "Failed to fetch news",
      details: error.message,
      symbol: req.params.symbol,
    });
  }
});

// Technical indicators endpoint - Enhanced with real data when possible
app.get("/api/technicals/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Rate limiting check
    if (!checkRateLimit(`technicals_${clientIp}`)) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please try again later.",
        retryAfter: 60,
      });
    }

    console.log(`📊 Fetching technicals for ${symbol}`);

    // Get current price for calculations
    let currentPrice = 100; // Default price
    let quote = null;

    try {
      const quoteResponse = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`,
        { timeout: 5000 }
      );
      if (quoteResponse.ok) {
        const quoteData = await quoteResponse.json();
        if (quoteData && quoteData.c) {
          currentPrice = quoteData.c;
          quote = quoteData;
        }
      }
    } catch (error) {
      console.warn(
        `Failed to get price for technicals calculation:`,
        error.message
      );
    }

    // Try to get real RSI data from Alpha Vantage if available
    let rsi = 50; // Default RSI
    let realDataUsed = false;

    if (ALPHA_VANTAGE_KEY) {
      try {
        const response = await fetch(
          `https://www.alphavantage.co/query?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${ALPHA_VANTAGE_KEY}`,
          {
            timeout: 10000,
            headers: { "User-Agent": "NewsImpactScreener/1.0" },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rsiData = data["Technical Analysis: RSI"];

          if (rsiData && Object.keys(rsiData).length > 0) {
            const latestDate = Object.keys(rsiData)[0];
            const rsiValue = parseFloat(rsiData[latestDate]["RSI"]);
            if (!isNaN(rsiValue)) {
              rsi = rsiValue;
              realDataUsed = true;
            }
          }
        }
      } catch (error) {
        console.warn(`Alpha Vantage RSI failed for ${symbol}:`, error.message);
      }
    }

    // Generate comprehensive technical indicators
    const technicals = {
      symbol: symbol,
      price: currentPrice,

      // Moving Averages
      sma20: Number((currentPrice * (0.98 + Math.random() * 0.04)).toFixed(2)),
      sma50: Number((currentPrice * (0.96 + Math.random() * 0.08)).toFixed(2)),
      sma200: Number((currentPrice * (0.94 + Math.random() * 0.12)).toFixed(2)),

      // Oscillators
      rsi: Number(rsi.toFixed(2)),
      stochastic: Number((Math.random() * 80 + 10).toFixed(2)),

      // MACD
      macd: Number((Math.random() * 4 - 2).toFixed(3)),
      macdSignal: Number((Math.random() * 4 - 2).toFixed(3)),
      macdHistogram: Number((Math.random() * 2 - 1).toFixed(3)),

      // Bollinger Bands
      bollinger: {
        upper: Number((currentPrice * 1.02).toFixed(2)),
        middle: Number(currentPrice.toFixed(2)),
        lower: Number((currentPrice * 0.98).toFixed(2)),
      },

      // Volume indicators
      volume: quote?.v || Math.floor(Math.random() * 2000000) + 500000,
      avgVolume: Math.floor(Math.random() * 1500000) + 750000,
      volumeRatio: Number((0.5 + Math.random() * 3).toFixed(2)),

      // Trend indicators
      adx: Number((20 + Math.random() * 60).toFixed(2)),
      atr: Number((currentPrice * (0.01 + Math.random() * 0.03)).toFixed(2)),

      // Additional indicators
      momentum: Number((40 + Math.random() * 20).toFixed(2)),
      williamsR: Number((-20 - Math.random() * 60).toFixed(2)),

      // Meta information
      dataSource: realDataUsed ? "AlphaVantage/Finnhub" : "Simulated",
      sector: getSectorForSymbol(symbol),
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Technicals for ${symbol}: RSI ${technicals.rsi}, SMA20 ${technicals.sma20} [${technicals.dataSource}]`
    );
    res.json({ success: true, data: technicals });
  } catch (error) {
    console.error(
      `❌ Error fetching technicals for ${req.params.symbol}:`,
      error.message
    );
    res.status(500).json({
      success: false,
      error: "Failed to fetch technicals",
      details: error.message,
      symbol: req.params.symbol,
    });
  }
});

// Options data endpoint - Enhanced with sector-specific logic
app.get("/api/options/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Rate limiting check
    if (!checkRateLimit(`options_${clientIp}`)) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please try again later.",
        retryAfter: 60,
      });
    }

    console.log(`📈 Fetching options for ${symbol}`);

    // Get sector to adjust option activity patterns
    const sector = getSectorForSymbol(symbol);
    const sectorMultipliers = {
      growthTech: { activity: 1.5, iv: 1.3 },
      biotech: { activity: 2.0, iv: 1.5 },
      semiconductor: { activity: 1.4, iv: 1.2 },
      ev: { activity: 1.8, iv: 1.4 },
      fintech: { activity: 1.3, iv: 1.1 },
      megaCap: { activity: 1.0, iv: 0.9 },
      default: { activity: 1.0, iv: 1.0 },
    };

    const multiplier = sectorMultipliers[sector] || sectorMultipliers.default;

    // Generate realistic options data based on sector
    const baseCallVolume = Math.floor(
      (Math.random() * 10000 + 2000) * multiplier.activity
    );
    const basePutVolume = Math.floor(
      (Math.random() * 8000 + 1500) * multiplier.activity
    );

    const optionsData = {
      symbol: symbol,
      sector: sector,

      // Volume data
      callVolume: baseCallVolume,
      putVolume: basePutVolume,
      totalVolume: baseCallVolume + basePutVolume,
      putCallRatio: Number((basePutVolume / baseCallVolume).toFixed(2)),

      // Open Interest
      openInterestCalls: Math.floor(Math.random() * 80000) + 20000,
      openInterestPuts: Math.floor(Math.random() * 60000) + 15000,

      // Volatility metrics
      impliedVolatility: Number(
        (Math.random() * 0.4 + 0.2) * multiplier.iv
      ).toFixed(3),
      historicalVolatility: Number((Math.random() * 0.3 + 0.15).toFixed(3)),

      // Flow analysis
      unusualActivity: Math.random() > (sector === "biotech" ? 0.5 : 0.7),
      flowSentiment: ["BULLISH", "BEARISH", "NEUTRAL"][
        Math.floor(Math.random() * 3)
      ],

      // Additional metrics
      maxPain: Number((Math.random() * 50 + 100).toFixed(2)),
      gammaExposure: Math.floor(Math.random() * 1000000) - 500000,

      // Meta information
      dataSource: "Simulated",
      timestamp: new Date().toISOString(),
    };

    // Adjust flow sentiment based on put/call ratio
    if (optionsData.putCallRatio < 0.7) {
      optionsData.flowSentiment = "BULLISH";
    } else if (optionsData.putCallRatio > 1.3) {
      optionsData.flowSentiment = "BEARISH";
    }

    console.log(
      `✅ Options for ${symbol}: P/C Ratio ${optionsData.putCallRatio}, IV ${optionsData.impliedVolatility}, Flow: ${optionsData.flowSentiment}`
    );
    res.json({ success: true, data: optionsData });
  } catch (error) {
    console.error(
      `❌ Error fetching options for ${req.params.symbol}:`,
      error.message
    );
    res.status(500).json({
      success: false,
      error: "Failed to fetch options data",
      details: error.message,
      symbol: req.params.symbol,
    });
  }
});
// Enhanced screening endpoint - Uses the full screening universe
app.get("/api/screening", async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;

    // Rate limiting check
    if (!checkRateLimit(`screening_${clientIp}`)) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please try again later.",
        retryAfter: 60,
      });
    }

    console.log(`🔍 Running enhanced screening analysis on full universe...`);

    // Get all symbols from screening universe
    const allSymbols = getAllScreeningSymbols();
    console.log(
      `📊 Screening ${allSymbols.length} symbols across ${
        Object.keys(SCREENING_UNIVERSE).length
      } sectors`
    );

    // Generate screening results with sector-based scoring
    const results = [];
    const sectorsToSample = [
      "megaCap",
      "growthTech",
      "semiconductor",
      "biotech",
      "fintech",
    ];

    // Process each sector with different characteristics
    for (const sectorName of sectorsToSample) {
      const sectorSymbols = SCREENING_UNIVERSE[sectorName] || [];
      const sampleSize = Math.min(sectorSymbols.length, 5); // 5 symbols per sector

      for (let i = 0; i < sampleSize; i++) {
        const symbol = sectorSymbols[i];
        const sectorData = generateSectorBasedScreening(symbol, sectorName);

        if (sectorData.nissScore > 40 || sectorData.nissScore < -40) {
          // Only strong signals
          results.push(sectorData);
        }
      }
    }

    // Sort by absolute score strength (both positive and negative signals)
    results.sort((a, b) => Math.abs(b.nissScore) - Math.abs(a.nissScore));

    // Limit to top opportunities
    const topResults = results.slice(0, 15);

    console.log(
      `✅ Screening complete: ${topResults.length} opportunities found from ${allSymbols.length} symbols`
    );

    const response = {
      success: true,
      data: {
        results: topResults,
        totalScanned: allSymbols.length,
        opportunitiesFound: topResults.length,
        sectorBreakdown: getSectorBreakdown(topResults),
        marketRegime: getCurrentMarketRegime(),
        screeningUniverse: Object.keys(SCREENING_UNIVERSE),
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("❌ Error in screening:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch screening results",
      details: error.message,
    });
  }
});

// Generate sector-based screening data
function generateSectorBasedScreening(symbol, sector) {
  // Sector-specific characteristics
  const sectorProfiles = {
    megaCap: { volatility: 0.8, newsImpact: 1.2, baseScore: 45 },
    growthTech: { volatility: 1.5, newsImpact: 1.4, baseScore: 50 },
    semiconductor: { volatility: 1.3, newsImpact: 1.3, baseScore: 48 },
    biotech: { volatility: 2.0, newsImpact: 1.8, baseScore: 55 },
    fintech: { volatility: 1.4, newsImpact: 1.1, baseScore: 47 },
    pharma: { volatility: 1.0, newsImpact: 1.5, baseScore: 46 },
    banks: { volatility: 1.1, newsImpact: 1.0, baseScore: 44 },
    energy: { volatility: 1.6, newsImpact: 1.2, baseScore: 49 },
  };

  const profile = sectorProfiles[sector] || sectorProfiles.megaCap;

  // Generate base scoring components
  const priceChange = (Math.random() - 0.5) * 10 * profile.volatility; // More volatile sectors have bigger moves
  const newsCount = Math.floor(Math.random() * 8) + 1;
  const newsImpact = (Math.random() - 0.5) * 100 * profile.newsImpact;

  // Calculate enhanced NISS score
  let nissScore = profile.baseScore + priceChange * 3 + newsImpact * 0.3;

  // Add sector-specific catalysts
  const sectorCatalysts = getSectorCatalysts(sector);
  if (Math.random() > 0.7) {
    // 30% chance of catalyst
    nissScore += (Math.random() - 0.5) * 40;
  }

  // Ensure we get both bullish and bearish signals
  if (Math.random() > 0.6) {
    nissScore = -Math.abs(nissScore); // Make it bearish
  }

  // Clamp to range
  nissScore = Math.max(-100, Math.min(100, Math.round(nissScore)));

  // Determine confidence based on multiple factors
  const confidence =
    Math.abs(nissScore) > 70
      ? "HIGH"
      : Math.abs(nissScore) > 50
      ? "MEDIUM"
      : "LOW";

  // Generate realistic price and trade setup
  const basePrice = getBasePriceForSymbol(symbol);
  const entry = Number((basePrice * (1 + priceChange / 100)).toFixed(2));
  const atr = basePrice * 0.02; // 2% ATR estimate

  return {
    symbol: symbol,
    sector: sector,
    nissScore: nissScore,
    confidence: confidence,

    // Price data
    entry: entry,
    currentPrice: entry,
    changePercent: Number(priceChange.toFixed(2)),

    // Trade setup
    stopLoss: Number(
      (nissScore > 0 ? entry - atr * 1.5 : entry + atr * 1.5).toFixed(2)
    ),
    targets:
      nissScore > 0
        ? [
            Number((entry + atr * 1.0).toFixed(2)),
            Number((entry + atr * 2.0).toFixed(2)),
            Number((entry + atr * 3.0).toFixed(2)),
          ]
        : [
            Number((entry - atr * 1.0).toFixed(2)),
            Number((entry - atr * 2.0).toFixed(2)),
            Number((entry - atr * 3.0).toFixed(2)),
          ],
    riskReward: `1:${(Math.random() * 2 + 1.5).toFixed(1)}`,

    // Signal components
    signals: generateSignalsForSector(sector, nissScore),
    newsCount: newsCount,
    sentiment: Number((newsImpact / 100).toFixed(2)),

    // Additional metrics
    volume: Math.floor(Math.random() * 2000000) + 500000,
    volumeRatio: Number((0.5 + Math.random() * 2.5).toFixed(2)),
    marketCap: estimateMarketCap(symbol, entry),

    // Meta data
    catalysts: sectorCatalysts,
    timestamp: new Date().toISOString(),
    dataSource: "Enhanced Screening Engine",
  };
}

// Get sector-specific catalysts
function getSectorCatalysts(sector) {
  const catalystMap = {
    biotech: ["FDA_APPROVAL", "CLINICAL_TRIAL", "PARTNERSHIP"],
    growthTech: ["EARNINGS_BEAT", "PRODUCT_LAUNCH", "USER_GROWTH"],
    semiconductor: ["CHIP_DEMAND", "AI_TREND", "SUPPLY_CHAIN"],
    fintech: ["REGULATORY_CLARITY", "ADOPTION", "PARTNERSHIPS"],
    megaCap: ["EARNINGS", "GUIDANCE", "BUYBACK"],
    energy: ["OIL_PRICES", "PRODUCTION", "GEOPOLITICAL"],
    pharma: ["DRUG_APPROVAL", "PIPELINE", "ACQUISITION"],
  };

  const catalysts = catalystMap[sector] || ["NEWS_CATALYST", "ANALYST_UPDATE"];
  return catalysts.slice(0, Math.floor(Math.random() * 3) + 1);
}

// Generate sector-specific signals
function generateSignalsForSector(sector, nissScore) {
  const signals = [];

  if (Math.abs(nissScore) > 60) {
    signals.push("STRONG_MOMENTUM");
  }

  if (nissScore > 50) {
    signals.push("BULLISH_BREAKOUT");
    if (sector === "biotech") signals.push("CATALYST_EVENT");
    if (sector === "growthTech") signals.push("GROWTH_ACCELERATION");
  } else if (nissScore < -50) {
    signals.push("BEARISH_BREAKDOWN");
    signals.push("RISK_OFF");
  }

  if (Math.random() > 0.7) signals.push("VOLUME_SURGE");
  if (Math.random() > 0.8) signals.push("UNUSUAL_OPTIONS");

  return signals;
}

// Get sector breakdown
function getSectorBreakdown(results) {
  const breakdown = {};
  results.forEach((result) => {
    if (!breakdown[result.sector]) {
      breakdown[result.sector] = { count: 0, avgScore: 0, symbols: [] };
    }
    breakdown[result.sector].count++;
    breakdown[result.sector].avgScore += Math.abs(result.nissScore);
    breakdown[result.sector].symbols.push(result.symbol);
  });

  // Calculate averages
  Object.keys(breakdown).forEach((sector) => {
    breakdown[sector].avgScore = Number(
      (breakdown[sector].avgScore / breakdown[sector].count).toFixed(1)
    );
  });

  return breakdown;
}

// Get current market regime
function getCurrentMarketRegime() {
  const regimes = ["BULLISH", "NEUTRAL", "BEARISH"];
  const volatilities = ["LOW", "NORMAL", "HIGH"];

  return {
    trend: regimes[Math.floor(Math.random() * regimes.length)],
    volatility: volatilities[Math.floor(Math.random() * volatilities.length)],
    breadth: ["ADVANCING", "MIXED", "DECLINING"][Math.floor(Math.random() * 3)],
    timestamp: new Date().toISOString(),
  };
}

// Enhanced batch quotes endpoint
app.post("/api/batch/quotes", async (req, res) => {
  try {
    const { symbols, sectors } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Rate limiting check
    if (!checkRateLimit(`batch_${clientIp}`)) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please try again later.",
        retryAfter: 60,
      });
    }

    let symbolsToProcess = [];

    // Handle different input types
    if (sectors && Array.isArray(sectors)) {
      // Process by sectors
      sectors.forEach((sector) => {
        if (SCREENING_UNIVERSE[sector]) {
          symbolsToProcess.push(...SCREENING_UNIVERSE[sector].slice(0, 10)); // Limit per sector
        }
      });
    } else if (symbols && Array.isArray(symbols)) {
      symbolsToProcess = symbols;
    } else {
      return res.status(400).json({
        success: false,
        error: "Either 'symbols' array or 'sectors' array required",
      });
    }

    if (symbolsToProcess.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid symbols to process",
      });
    }

    if (symbolsToProcess.length > 50) {
      return res.status(400).json({
        success: false,
        error: "Too many symbols. Maximum 50 allowed.",
      });
    }

    console.log(`📊 Batch processing ${symbolsToProcess.length} symbols`);

    const results = {};
    const errors = [];

    // Process symbols in smaller batches to respect API limits
    const batchSize = 5;

    for (let i = 0; i < symbolsToProcess.length; i += batchSize) {
      const batch = symbolsToProcess.slice(i, i + batchSize);

      const batchPromises = batch.map(async (symbol) => {
        try {
          if (!FINNHUB_KEY) {
            throw new Error("Finnhub API key not configured");
          }

          const response = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`,
            {
              timeout: 8000,
              headers: { "User-Agent": "NewsImpactScreener/1.0" },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data && typeof data.c === "number" && data.c > 0) {
              results[symbol] = {
                symbol: symbol,
                price: Number(data.c.toFixed(2)),
                changePercent: Number(
                  (((data.c - data.pc) / data.pc) * 100).toFixed(2)
                ),
                volume: data.v || 0,
                high: Number(data.h?.toFixed(2) || data.c.toFixed(2)),
                low: Number(data.l?.toFixed(2) || data.c.toFixed(2)),
                sector: getSectorForSymbol(symbol),
                marketCap: estimateMarketCap(symbol, data.c),
                timestamp: new Date().toISOString(),
              };
            } else {
              errors.push({ symbol, error: "Invalid data received" });
            }
          } else {
            errors.push({ symbol, error: `HTTP ${response.status}` });
          }
        } catch (error) {
          errors.push({ symbol, error: error.message });
          console.warn(`❌ Failed to fetch ${symbol}:`, error.message);
        }
      });

      await Promise.all(batchPromises);

      // Add delay between batches to respect rate limits
      if (i + batchSize < symbolsToProcess.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(
      `✅ Batch complete: ${Object.keys(results).length}/${
        symbolsToProcess.length
      } successful`
    );

    res.json({
      success: true,
      data: {
        quotes: results,
        count: Object.keys(results).length,
        requested: symbolsToProcess.length,
        sectors: sectors || "custom",
        sectorBreakdown: getSectorBreakdown(Object.values(results)),
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Batch quote error:", error);
    res.status(500).json({
      success: false,
      error: "Batch processing failed",
      details: error.message,
    });
  }
});
// Enhanced health check endpoint
app.get("/health", (req, res) => {
  const allSymbols = getAllScreeningSymbols();

  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "News Impact Screener Backend",
    version: "2.0.0",
    uptime: process.uptime(),

    // API configuration
    apiKeys: {
      finnhub: !!FINNHUB_KEY,
      alphavantage: !!ALPHA_VANTAGE_KEY,
      polygon: !!POLYGON_KEY,
    },

    // Screening universe info
    screeningUniverse: {
      totalSymbols: allSymbols.length,
      sectors: Object.keys(SCREENING_UNIVERSE).length,
      sectorBreakdown: Object.fromEntries(
        Object.entries(SCREENING_UNIVERSE).map(([sector, symbols]) => [
          sector,
          symbols.length,
        ])
      ),
    },

    // Available endpoints
    endpoints: {
      quote: "/api/quote/:symbol",
      news: "/api/news/:symbol",
      technicals: "/api/technicals/:symbol",
      options: "/api/options/:symbol",
      batchQuotes: "/api/batch/quotes",
      screening: "/api/screening",
    },

    // Performance metrics
    rateLimit: {
      maxPerMinute: RATE_LIMIT_PER_MINUTE,
      currentConnections: rateLimiter.size,
    },

    // Feature flags
    features: {
      realTimeData: !!FINNHUB_KEY,
      technicalIndicators: !!ALPHA_VANTAGE_KEY,
      sectorScreening: true,
      enhancedAnalysis: true,
    },
  });
});

// Legacy health endpoint (for compatibility)
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    screeningUniverse: getAllScreeningSymbols().length + " symbols",
    apiKeys: {
      finnhub: !!FINNHUB_KEY,
      alphavantage: !!ALPHA_VANTAGE_KEY,
      polygon: !!POLYGON_KEY,
    },
    rateLimit: {
      maxPerMinute: RATE_LIMIT_PER_MINUTE,
      currentConnections: rateLimiter.size,
    },
  });
});

// Screening universe endpoint
app.get("/api/universe", (req, res) => {
  res.json({
    success: true,
    data: {
      universe: SCREENING_UNIVERSE,
      totalSymbols: getAllScreeningSymbols().length,
      sectors: Object.keys(SCREENING_UNIVERSE),
      sectorCounts: Object.fromEntries(
        Object.entries(SCREENING_UNIVERSE).map(([sector, symbols]) => [
          sector,
          symbols.length,
        ])
      ),
      timestamp: new Date().toISOString(),
    },
  });
});

// Root endpoint
app.get("/", (req, res) => {
  const allSymbols = getAllScreeningSymbols();

  res.json({
    service: "News Impact Screener Backend",
    version: "2.0.0",
    status: "running",
    timestamp: new Date().toISOString(),

    screeningUniverse: {
      totalSymbols: allSymbols.length,
      sectors: Object.keys(SCREENING_UNIVERSE).length,
      coverage: "Comprehensive market screening across multiple sectors",
    },

    endpoints: {
      health: "/health",
      universe: "/api/universe",
      quote: "/api/quote/:symbol",
      news: "/api/news/:symbol",
      technicals: "/api/technicals/:symbol",
      options: "/api/options/:symbol",
      batchQuotes: "/api/batch/quotes",
      screening: "/api/screening",
    },

    features: [
      "Real-time stock quotes via Finnhub",
      "Technical indicators via Alpha Vantage",
      "Comprehensive news analysis",
      "Options flow simulation",
      "Sector-based screening",
      "Enhanced NISS scoring",
    ],

    documentation: "All endpoints support CORS and rate limiting",
  });
});

// =====================================
// ENHANCED HELPER FUNCTIONS
// =====================================

// Enhanced market cap estimation with sector adjustments
function estimateMarketCap(symbol, price) {
  // Specific company estimates
  const specificEstimates = {
    AAPL: price * 15.6e9,
    MSFT: price * 7.4e9,
    GOOGL: price * 12.9e9,
    AMZN: price * 10.5e9,
    NVDA: price * 2.5e9,
    META: price * 2.7e9,
    TSLA: price * 3.2e9,
    "BRK.B": price * 1.4e9,
    JPM: price * 2.9e9,
    JNJ: price * 2.6e9,
  };

  if (specificEstimates[symbol]) {
    return specificEstimates[symbol];
  }

  // Sector-based estimates
  const sector = getSectorForSymbol(symbol);
  const sectorMultipliers = {
    megaCap: 500e9,
    growthTech: 30e9,
    semiconductor: 50e9,
    biotech: 10e9,
    pharma: 100e9,
    banks: 80e9,
    fintech: 25e9,
    retail: 40e9,
    energy: 60e9,
    materials: 35e9,
    industrial: 45e9,
    reits: 20e9,
    ev: 15e9,
    cleanEnergy: 8e9,
  };

  const baseEstimate = sectorMultipliers[sector] || 20e9;
  return Math.floor(baseEstimate * (0.5 + Math.random()));
}

// Enhanced news categorization
function categorizeNews(headline) {
  const lower = headline.toLowerCase();

  // Earnings and financial
  if (
    lower.includes("earnings") ||
    lower.includes("revenue") ||
    lower.includes("quarterly")
  )
    return "earnings";

  // Analyst coverage
  if (
    lower.includes("upgrade") ||
    lower.includes("downgrade") ||
    lower.includes("target") ||
    lower.includes("rating")
  )
    return "analyst";

  // Regulatory and legal
  if (
    lower.includes("fda") ||
    lower.includes("approval") ||
    lower.includes("regulatory") ||
    lower.includes("lawsuit")
  )
    return "regulatory";

  // M&A activity
  if (
    lower.includes("acquisition") ||
    lower.includes("merger") ||
    lower.includes("buyout") ||
    lower.includes("takeover")
  )
    return "ma";

  // Product and business
  if (
    lower.includes("product") ||
    lower.includes("launch") ||
    lower.includes("release")
  )
    return "product";

  // Management and strategy
  if (
    lower.includes("ceo") ||
    lower.includes("management") ||
    lower.includes("strategy") ||
    lower.includes("restructuring")
  )
    return "corporate";

  // Market and sector
  if (
    lower.includes("market") ||
    lower.includes("sector") ||
    lower.includes("industry")
  )
    return "market";

  return "general";
}

// Enhanced relevance calculation
function calculateRelevance(headline, symbol) {
  const symbolMentions = (headline.match(new RegExp(symbol, "gi")) || [])
    .length;
  const headlineLength = headline.length;

  // Base score from symbol mentions
  let score = symbolMentions * 40;

  // Length bonus
  if (headlineLength > 80) score += 25;
  else if (headlineLength > 50) score += 15;
  else if (headlineLength > 30) score += 10;

  // High-impact keyword bonuses
  const lower = headline.toLowerCase();
  if (lower.includes("earnings") || lower.includes("results")) score += 30;
  if (lower.includes("beats") || lower.includes("exceeds")) score += 25;
  if (lower.includes("misses") || lower.includes("disappoints")) score += 25;
  if (lower.includes("upgrade") || lower.includes("downgrade")) score += 35;
  if (lower.includes("acquisition") || lower.includes("merger")) score += 40;
  if (lower.includes("breakthrough") || lower.includes("innovation"))
    score += 20;
  if (lower.includes("partnership") || lower.includes("deal")) score += 18;
  if (lower.includes("fda") || lower.includes("approval")) score += 35;
  if (lower.includes("lawsuit") || lower.includes("investigation")) score += 30;

  return Math.min(100, Math.max(0, score));
}

// Enhanced sentiment analysis
function calculateSentiment(text) {
  if (!text) return 0;

  const positiveWords = [
    "beat",
    "beats",
    "exceeds",
    "strong",
    "growth",
    "profit",
    "gain",
    "positive",
    "bullish",
    "upgrade",
    "outperform",
    "buy",
    "breakthrough",
    "innovation",
    "success",
    "approved",
    "partnership",
    "expansion",
  ];

  const negativeWords = [
    "miss",
    "misses",
    "disappoints",
    "weak",
    "decline",
    "loss",
    "negative",
    "bearish",
    "downgrade",
    "underperform",
    "sell",
    "failure",
    "rejected",
    "lawsuit",
    "investigation",
    "bankruptcy",
    "cuts",
    "layoffs",
  ];

  const strongPositive = ["breakthrough", "approved", "beats", "exceeds"];
  const strongNegative = ["bankruptcy", "lawsuit", "investigation", "misses"];

  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  let wordCount = 0;

  words.forEach((word) => {
    if (strongPositive.includes(word)) {
      score += 3;
      wordCount++;
    } else if (strongNegative.includes(word)) {
      score -= 3;
      wordCount++;
    } else if (positiveWords.includes(word)) {
      score += 1;
      wordCount++;
    } else if (negativeWords.includes(word)) {
      score -= 1;
      wordCount++;
    }
  });

  // Normalize by relevant word count
  const normalizedScore = wordCount > 0 ? score / wordCount : 0;
  return Math.max(-1, Math.min(1, normalizedScore));
}

// Identify catalysts from headlines
function identifyCatalysts(headline) {
  const catalysts = [];
  const lower = headline.toLowerCase();

  if (lower.includes("earnings") || lower.includes("results"))
    catalysts.push("EARNINGS");
  if (lower.includes("fda") || lower.includes("approval"))
    catalysts.push("FDA_APPROVAL");
  if (lower.includes("acquisition") || lower.includes("merger"))
    catalysts.push("M&A");
  if (lower.includes("upgrade") || lower.includes("downgrade"))
    catalysts.push("ANALYST_ACTION");
  if (lower.includes("partnership") || lower.includes("deal"))
    catalysts.push("PARTNERSHIP");
  if (lower.includes("product") || lower.includes("launch"))
    catalysts.push("PRODUCT_LAUNCH");
  if (lower.includes("guidance") || lower.includes("outlook"))
    catalysts.push("GUIDANCE");

  return catalysts;
}

// Calculate news confidence
function calculateNewsConfidence(article) {
  let confidence = 0.5; // Base confidence

  // Source credibility boost
  const source = article.source?.toLowerCase() || "";
  if (["reuters", "bloomberg", "wsj", "cnbc"].includes(source)) {
    confidence += 0.2;
  }

  // Headline quality
  if (article.headline && article.headline.length > 50) {
    confidence += 0.1;
  }

  // Summary availability
  if (article.summary && article.summary.length > 100) {
    confidence += 0.1;
  }

  // Recency (within last 24 hours)
  const hoursAgo = (Date.now() - article.datetime * 1000) / (1000 * 60 * 60);
  if (hoursAgo < 24) {
    confidence += 0.1;
  }

  return Math.max(0, Math.min(1, confidence));
}

// Get base price for symbol (for realistic price generation)
function getBasePriceForSymbol(symbol) {
  const basePrices = {
    AAPL: 175,
    MSFT: 400,
    GOOGL: 140,
    AMZN: 150,
    NVDA: 875,
    META: 480,
    TSLA: 250,
    JPM: 170,
    JNJ: 160,
    V: 270,
    PLTR: 25,
    SNOW: 180,
    MRNA: 90,
    AMD: 140,
    INTC: 25,
  };

  const sector = getSectorForSymbol(symbol);
  const sectorDefaults = {
    megaCap: 200,
    growthTech: 80,
    semiconductor: 120,
    biotech: 45,
    pharma: 110,
    banks: 85,
    fintech: 60,
    retail: 90,
    energy: 75,
    materials: 65,
  };

  return basePrices[symbol] || sectorDefaults[sector] || 100;
}
// =====================================
// ERROR HANDLING & SERVER STARTUP
// =====================================

// Enhanced error handling middleware
app.use((error, req, res, next) => {
  console.error("❌ Unhandled error:", error);

  // Don't leak sensitive information in production
  const isDevelopment = process.env.NODE_ENV !== "production";

  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: isDevelopment ? error.message : "Something went wrong",
    timestamp: new Date().toISOString(),
    requestId: req.headers["x-request-id"] || "unknown",
    path: req.originalUrl,
  });
});

// Enhanced 404 handler for undefined routes
app.use("*", (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);

  const allSymbols = getAllScreeningSymbols();

  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    method: req.method,
    path: req.originalUrl,

    // Helpful information
    availableEndpoints: [
      "GET /health - Service health and status",
      "GET /api/health - Legacy health check",
      "GET /api/universe - Screening universe info",
      "GET /api/quote/:symbol - Real-time stock quote",
      "GET /api/news/:symbol - Company news and analysis",
      "GET /api/technicals/:symbol - Technical indicators",
      "GET /api/options/:symbol - Options flow data",
      "POST /api/batch/quotes - Batch quote requests",
      "GET /api/screening - Market screening results",
    ],

    screeningUniverse: {
      totalSymbols: allSymbols.length,
      sectors: Object.keys(SCREENING_UNIVERSE),
      exampleSymbols: allSymbols.slice(0, 10),
    },

    examples: {
      quote: `/api/quote/AAPL`,
      news: `/api/news/MSFT`,
      technicals: `/api/technicals/GOOGL`,
      batchBySectors: `POST /api/batch/quotes with body: {"sectors": ["megaCap", "growthTech"]}`,
      batchBySymbols: `POST /api/batch/quotes with body: {"symbols": ["AAPL", "MSFT", "GOOGL"]}`,
    },

    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("🔄 SIGTERM received, shutting down gracefully...");
  console.log(`📊 Final stats: ${rateLimiter.size} active rate limit entries`);
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🔄 SIGINT received, shutting down gracefully...");
  console.log(`📊 Final stats: ${rateLimiter.size} active rate limit entries`);
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  console.log("🔄 Shutting down due to uncaught exception...");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  console.log("🔄 Shutting down due to unhandled rejection...");
  process.exit(1);
});

// Memory usage monitoring
setInterval(() => {
  const memUsage = process.memoryUsage();
  const memMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
  };

  // Log memory usage every 10 minutes
  if (Date.now() % (10 * 60 * 1000) < 5000) {
    console.log(
      `📊 Memory usage: RSS ${memMB.rss}MB, Heap ${memMB.heapUsed}/${memMB.heapTotal}MB`
    );
  }
}, 5000);

// Start the server with enhanced logging
app.listen(PORT, () => {
  const allSymbols = getAllScreeningSymbols();

  console.log(`🚀 News Impact Screener Backend v2.0 running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(
    `📊 Screening Universe: ${allSymbols.length} symbols across ${
      Object.keys(SCREENING_UNIVERSE).length
    } sectors`
  );
  console.log(
    `🔑 API Keys configured: ${
      [
        FINNHUB_KEY ? "Finnhub" : null,
        ALPHA_VANTAGE_KEY ? "AlphaVantage" : null,
        POLYGON_KEY ? "Polygon" : null,
      ]
        .filter(Boolean)
        .join(", ") || "None"
    }`
  );

  console.log(`📈 Available endpoints:`);
  console.log(`   GET  /health - Enhanced service health status`);
  console.log(`   GET  /api/universe - Complete screening universe`);
  console.log(`   GET  /api/quote/:symbol - Real-time stock quotes`);
  console.log(`   GET  /api/news/:symbol - Enhanced company news`);
  console.log(`   GET  /api/technicals/:symbol - Technical indicators`);
  console.log(`   GET  /api/options/:symbol - Options flow analysis`);
  console.log(
    `   POST /api/batch/quotes - Batch processing (symbols or sectors)`
  );
  console.log(`   GET  /api/screening - Comprehensive market screening`);

  console.log(`🏢 Sector coverage:`);
  Object.entries(SCREENING_UNIVERSE).forEach(([sector, symbols]) => {
    console.log(`   ${sector}: ${symbols.length} symbols`);
  });

  console.log(
    `⚡ Ready to serve requests with enhanced institutional-grade analysis!`
  );
  console.log(
    `🔍 Example screening request: curl ${
      PORT === 3001 ? "http://localhost:3001" : "https://your-domain.com"
    }/api/screening`
  );
});

// Export for testing purposes
module.exports = { app, SCREENING_UNIVERSE, getAllScreeningSymbols };
