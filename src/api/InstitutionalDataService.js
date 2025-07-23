// api/InstitutionalDataService.js
// Enhanced Institutional-Grade News Impact Trading System
// Add this import at the top, after any existing imports
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
  async getQuote(symbol) {
    const cacheKey = `quote_${symbol}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // Try backend first if available
      if (this.backendHealth) {
        try {
          const data = await makeBackendApiCall(
            API_CONFIG.backend.endpoints.quote(symbol)
          );

          if (data && data.success) {
            const quote = {
              symbol: symbol,
              price: data.data.price,
              changePercent: data.data.changePercent,
              volume: data.data.volume || 0,
              high: data.data.high,
              low: data.data.low,
              open: data.data.open,
              previousClose: data.data.previousClose,
              timestamp: new Date(),
              avgVolume: data.data.avgVolume,
              high52Week: data.data.high52Week,
              low52Week: data.data.low52Week,
            };

            this.setCache(cacheKey, quote);
            return quote;
          }
        } catch (error) {
          console.warn(
            "Backend quote failed, backend required for API access:",
            error
          );
          this.backendHealth = false;
        }
      }

      // NOTE: No direct API fallback since we don't have API keys in frontend
      // All API calls must go through backend for security
      console.warn("Backend required for quote data - no direct API access");
      return null;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  // Detect specific market-moving catalysts
  detectCatalysts(text) {
    const catalystPatterns = {
      earnings: /earnings|revenue|eps|guidance|forecast|quarterly results/i,
      fda: /fda|approval|clinical trial|phase|drug|biotech catalyst/i,
      merger: /merger|acquisition|acquire|takeover|buyout|deal/i,
      analyst:
        /upgrade|downgrade|price target|rating|analyst|initiates coverage/i,
      insider: /insider|ceo|cfo|executive|board|management change/i,
      regulatory: /sec|investigation|probe|fine|penalty|compliance/i,
      product: /launch|release|announce|unveil|introduce|new product/i,
      macro: /fed|inflation|gdp|unemployment|economic|interest rate/i,
    };

    const detected = [];
    for (const [type, pattern] of Object.entries(catalystPatterns)) {
      if (pattern.test(text)) {
        detected.push(type);
      }
    }

    return detected;
  }

  // Calculate institutional-grade NISS score
  async calculateEnhancedNISS(stockData) {
    const { symbol, quote, news, technicals, options } = stockData;

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
    // Apply regime adjustment and normalize to -100 to +100
    // ENHANCED: Better handling of directional signals
    let finalScore = (baseScore - 50) * 2 + regimeAdjustment;

    // Apply strong directional bias for clear buy/sell signals
    const priceChange = quote.changePercent || 0;
    if (Math.abs(priceChange) > 3) {
      // Strong price moves get amplified
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

    // Price change impact (adjusted for volatility)
    const changePercent = quote.changePercent || 0;
    const volatility = technicals?.atr
      ? (technicals.atr / quote.price) * 100
      : 2; // Default 2% if no ATR
    const normalizedChange = changePercent / volatility;

    score += normalizedChange * 10; // Volatility-adjusted change

    // Price vs moving averages
    if (technicals?.sma20 && quote.price > technicals.sma20) score += 10;
    if (technicals?.sma50 && quote.price > technicals.sma50) score += 10;
    if (technicals?.sma200 && quote.price > technicals.sma200) score += 15;

    // Support/Resistance levels
    const yearRange = quote.high52Week - quote.low52Week;
    const pricePosition = (quote.price - quote.low52Week) / yearRange;

    if (pricePosition > 0.9) score += 15; // Near 52w high
    else if (pricePosition > 0.7) score += 10;
    else if (pricePosition < 0.1) score -= 15; // Near 52w low
    else if (pricePosition < 0.3) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  // Calculate news impact with decay and credibility
  async calculateNewsImpactScore(news, quote) {
    if (!news || news.length === 0) return 50;

    let totalImpact = 0;
    let totalWeight = 0;

    for (const article of news) {
      // Time decay factor (exponential decay over 48 hours)
      const hoursAgo =
        (Date.now() - article.datetime * 1000) / (1000 * 60 * 60);
      const timeDecay = Math.exp(-hoursAgo / 24); // Half-life of 24 hours

      // Analyze sentiment with advanced NLP
      const sentiment =
        article.sentiment ||
        (await this.analyzeSentiment(
          article.summary || article.headline,
          article.headline,
          article.source
        ));

      // Calculate weighted impact
      const impact =
        (typeof sentiment === "object" ? sentiment.score : sentiment) *
        timeDecay;
      totalImpact += impact;
      totalWeight += timeDecay;
    }

    // Normalize to 0-100 scale
    const avgImpact = totalWeight > 0 ? totalImpact / totalWeight : 0;
    return Math.max(0, Math.min(100, 50 + avgImpact * 25));
  }

  // Technical momentum calculation
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
    if (technicals.macd && technicals.macdSignal) {
      if (technicals.macd > technicals.macdSignal) score += 15;
      else score -= 15;
    }

    // Bollinger Bands
    if (technicals.bbUpper && technicals.bbLower && technicals.price) {
      const bbPosition =
        (technicals.price - technicals.bbLower) /
        (technicals.bbUpper - technicals.bbLower);
      if (bbPosition > 0.8) score -= 10; // Near upper band
      else if (bbPosition < 0.2) score += 10; // Near lower band
    }

    // ADX for trend strength
    if (technicals.adx) {
      if (technicals.adx > 25) score += 10; // Strong trend
      else if (technicals.adx < 15) score -= 5; // Weak trend
    }

    return Math.max(0, Math.min(100, score));
  }

  // Options flow analysis
  calculateOptionsScore(options) {
    if (!options) return 50;

    let score = 50;

    // Put/Call ratio analysis
    const pcRatio = options.putVolume / (options.callVolume || 1);
    if (pcRatio < 0.7) score += 20; // Bullish
    else if (pcRatio > 1.3) score -= 20; // Bearish

    // Unusual options activity
    const avgOptionsVolume = (options.putVolume + options.callVolume) / 2;
    const normalVolume = options.avgOptionsVolume || avgOptionsVolume;
    const volumeRatio = avgOptionsVolume / (normalVolume || 1);

    if (volumeRatio > 3) score += 15; // Very unusual
    else if (volumeRatio > 2) score += 10; // Unusual

    // Open interest changes
    if (options.callOI && options.putOI) {
      if (options.callOI > options.putOI * 1.5) score += 10;
      else if (options.putOI > options.callOI * 1.5) score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  // Relative strength vs sector and market
  async calculateRelativeStrength(symbol, quote) {
    if (!quote) return 50;

    // Get sector performance
    const sector = this.getSectorForSymbol(symbol);
    const sectorPerf = await this.getSectorPerformance(sector);
    const marketPerf = await this.getMarketPerformance();

    let score = 50;

    // Outperformance vs sector
    const sectorAlpha = quote.changePercent - sectorPerf;
    score += sectorAlpha * 5;

    // Outperformance vs market
    const marketAlpha = quote.changePercent - marketPerf;
    score += marketAlpha * 3;

    // Trend alignment
    if (quote.changePercent > 0 && sectorPerf > 0 && marketPerf > 0) {
      score += 10; // All aligned bullish
    } else if (quote.changePercent < 0 && sectorPerf < 0 && marketPerf < 0) {
      score -= 10; // All aligned bearish
    }

    return Math.max(0, Math.min(100, score));
  }

  // Volume analysis
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

  // Dynamic weight adjustment based on market conditions
  getDynamicWeights() {
    const regime = this.marketRegime;

    // Base weights
    let weights = {
      price: 0.2,
      news: 0.25,
      momentum: 0.2,
      options: 0.15,
      relative: 0.1,
      volume: 0.1,
    };

    // Adjust for market conditions
    if (regime.volatility === "high") {
      weights.news = 0.3;
      weights.options = 0.2;
      weights.momentum = 0.15;
    } else if (regime.volatility === "low") {
      weights.momentum = 0.25;
      weights.relative = 0.15;
    }

    if (regime.trend === "bullish") {
      weights.relative = 0.15;
      weights.momentum = 0.25;
    } else if (regime.trend === "bearish") {
      weights.options = 0.2;
      weights.volume = 0.15;
    }

    return weights;
  }

  // Market regime adjustment
  getMarketRegimeAdjustment() {
    const regime = this.marketRegime;
    let adjustment = 0;

    // Volatility adjustment
    if (regime.volatility === "high") adjustment -= 10;
    else if (regime.volatility === "low") adjustment += 5;

    // Trend adjustment
    if (regime.trend === "bullish") adjustment += 10;
    else if (regime.trend === "bearish") adjustment -= 10;

    // Breadth adjustment
    if (regime.breadth === "advancing") adjustment += 5;
    else if (regime.breadth === "declining") adjustment -= 5;

    return adjustment;
  }

  // Calculate overall confidence level
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

    // Options activity
    if (factors.optionsActivity > 80) confidence += 0.1;
    else if (factors.optionsActivity < 20) confidence -= 0.1;

    // Technical alignment
    if (factors.technicalAlignment > 70) confidence += 0.1;
    else if (factors.technicalAlignment < 30) confidence -= 0.1;

    // Normalize to 0-1
    confidence = Math.max(0, Math.min(1, confidence));

    // Convert to category
    if (confidence >= 0.7) return "HIGH";
    else if (confidence >= 0.5) return "MEDIUM";
    else return "LOW";
  }

  // Entry and exit calculation
  calculateTradeSetup(stockData, nissData) {
    const { quote, technicals } = stockData;
    const { score, confidence } = nissData;

    // Determine position direction
    const direction = score > 0 ? "LONG" : score < 0 ? "SHORT" : "NEUTRAL";

    if (direction === "NEUTRAL" || Math.abs(score) < 50) {
      return { action: "HOLD", reason: "Insufficient signal strength" };
    }

    // Calculate ATR-based stops and targets
    const atr = technicals?.atr || quote.price * 0.02; // Default 2% if no ATR

    // Entry logic
    let entry = quote.price;
    if (
      direction === "LONG" &&
      technicals?.sma20 &&
      quote.price > technicals.sma20
    ) {
      entry = Math.max(quote.price, technicals.sma20 * 1.005); // Enter above SMA20
    } else if (
      direction === "SHORT" &&
      technicals?.sma20 &&
      quote.price < technicals.sma20
    ) {
      entry = Math.min(quote.price, technicals.sma20 * 0.995); // Enter below SMA20
    }

    // Stop loss calculation (risk management)
    const riskMultiplier =
      confidence === "HIGH" ? 1.5 : confidence === "MEDIUM" ? 2 : 2.5;
    const stopLoss =
      direction === "LONG"
        ? entry - atr * riskMultiplier
        : entry + atr * riskMultiplier;

    // Target calculation (R:R based on confidence)
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

    // Position sizing based on Kelly Criterion
    const winRate =
      confidence === "HIGH" ? 0.65 : confidence === "MEDIUM" ? 0.55 : 0.5;
    const avgWin = rewardMultiplier;
    const avgLoss = riskMultiplier;
    const kellyPercent = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
    const positionSize = Math.max(0, Math.min(0.025, kellyPercent * 0.25)); // Conservative Kelly, max 2.5%

    return {
      action: direction,
      entry: entry,
      stopLoss: stopLoss,
      targets: targets,
      riskReward: rewardMultiplier / riskMultiplier,
      positionSize: positionSize,
      confidence: confidence,
      reasoning: this.generateTradeReasoning(stockData, nissData),
    };
  }

  // Generate detailed trade reasoning
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

    // Relative strength
    if (components.relative > 70) {
      reasons.push("Outperforming sector and market");
    } else if (components.relative < 30) {
      reasons.push("Underperforming relative to peers");
    }

    return reasons.join(". ");
  }

  // Detect market regime
  async updateMarketRegime() {
    try {
      // Get VIX for volatility regime
      const vix = await this.getVIX();
      if (vix < 15) this.marketRegime.volatility = "low";
      else if (vix > 25) this.marketRegime.volatility = "high";
      else this.marketRegime.volatility = "normal";

      // Get SPY for trend
      const spy = await this.getQuote("SPY");
      if (spy) {
        const spyChange = spy.changePercent;
        if (spyChange > 0.5) this.marketRegime.trend = "bullish";
        else if (spyChange < -0.5) this.marketRegime.trend = "bearish";
        else this.marketRegime.trend = "neutral";
      }

      // Get market breadth
      const breadth = await this.getMarketBreadth();
      if (breadth.advanceDecline > 1.5) this.marketRegime.breadth = "advancing";
      else if (breadth.advanceDecline < 0.67)
        this.marketRegime.breadth = "declining";
      else this.marketRegime.breadth = "mixed";
    } catch (error) {
      console.error("Error updating market regime:", error);
    }
  }

  // Full market screening
  async screenAllStocks(filters = {}) {
    const results = [];
    const allSymbols = Object.values(this.screeningUniverse).flat();

    // Process in batches to avoid rate limits
    const batchSize = 10;
    const maxBatches = 20; // Limit to 200 stocks for performance

    for (
      let i = 0;
      i < Math.min(allSymbols.length, batchSize * maxBatches);
      i += batchSize
    ) {
      const batch = allSymbols.slice(i, i + batchSize);
      const promises = batch.map((symbol) => this.analyzeStock(symbol));

      try {
        const batchResults = await Promise.all(promises);
        results.push(...batchResults.filter((r) => r !== null));
      } catch (error) {
        console.error("Batch processing error:", error);
      }

      // Rate limit delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Apply filters and sort by opportunity score
    return results
      .filter((stock) => this.applyScreeningFilters(stock, filters))
      .sort((a, b) => Math.abs(b.nissScore) - Math.abs(a.nissScore))
      .slice(0, 50); // Top 50 opportunities
  }

  // Analyze individual stock
  async analyzeStock(symbol) {
    try {
      const [quote, news, technicals, options] = await Promise.all([
        this.getQuote(symbol),
        this.getNews(symbol),
        this.getTechnicals(symbol),
        this.getOptionsData(symbol),
      ]);

      if (!quote || quote.price === 0) return null;

      const stockData = { symbol, quote, news, technicals, options };
      const nissData = await this.calculateEnhancedNISS(stockData);
      const tradeSetup = this.calculateTradeSetup(stockData, nissData);

      return {
        symbol,
        ...stockData,
        nissScore: nissData.score,
        nissData: nissData,
        tradeSetup: tradeSetup,
        sector: this.getSectorForSymbol(symbol),
        marketCap: await this.getMarketCap(symbol),
        company: this.getCompanyName(symbol),
      };
    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error);
      return null;
    }
  }

  // Apply screening filters
  applyScreeningFilters(stock, filters) {
    // FIXED: Handle both positive and negative NISS scores for buy/sell opportunities
    const nissScore = stock.nissScore;
    const threshold = filters.minScore || 50;

    // Include stocks with:
    // 1. Positive NISS scores above threshold (BUY opportunities)
    // 2. Negative NISS scores below -threshold (SELL opportunities)
    const meetsThreshold = nissScore >= threshold || nissScore <= -threshold;

    if (!meetsThreshold) return false;

    // Confidence filter
    if (filters.minConfidence) {
      if (
        filters.minConfidence === "HIGH" &&
        stock.nissData.confidence !== "HIGH"
      )
        return false;
      if (
        filters.minConfidence === "MEDIUM" &&
        stock.nissData.confidence === "LOW"
      )
        return false;
    }

    // Market cap filter
    if (filters.marketCap && filters.marketCap !== "all") {
      const mcap = stock.marketCap;
      if (filters.marketCap === "mega" && mcap < 200e9) return false;
      if (filters.marketCap === "large" && (mcap < 10e9 || mcap > 200e9))
        return false;
      if (filters.marketCap === "mid" && (mcap < 2e9 || mcap > 10e9))
        return false;
      if (filters.marketCap === "small" && mcap > 2e9) return false;
    }

    // Sector filter
    if (
      filters.sector &&
      filters.sector !== "all" &&
      stock.sector !== filters.sector
    )
      return false;

    // Volume filter
    if (filters.minVolume && stock.quote.volume < filters.minVolume)
      return false;

    // Price filter
    if (filters.minPrice && stock.quote.price < filters.minPrice) return false;
    if (filters.maxPrice && stock.quote.price > filters.maxPrice) return false;

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
    // This would ideally come from an API
    const names = {
      // Tech giants
      AAPL: "Apple Inc.",
      MSFT: "Microsoft Corporation",
      GOOGL: "Alphabet Inc.",
      AMZN: "Amazon.com Inc.",
      META: "Meta Platforms Inc.",
      NVDA: "NVIDIA Corporation",
      TSLA: "Tesla Inc.",

      // Growth tech
      PLTR: "Palantir Technologies",
      SNOW: "Snowflake Inc.",
      DDOG: "Datadog Inc.",
      NET: "Cloudflare Inc.",
      CRWD: "CrowdStrike Holdings",

      // Biotech
      MRNA: "Moderna Inc.",
      BNTX: "BioNTech SE",
      VKTX: "Viking Therapeutics",

      // Add more as needed...
    };

    return names[symbol] || symbol;
  }

  // API calls with error handling and caching
  async getQuote(symbol) {
    const cacheKey = `quote_${symbol}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.finnhubKey}`
      );
      const data = await response.json();

      if (data && data.c) {
        const quote = {
          symbol: symbol,
          price: data.c,
          changePercent: ((data.c - data.pc) / data.pc) * 100,
          volume: data.v || 0,
          high: data.h,
          low: data.l,
          open: data.o,
          previousClose: data.pc,
          timestamp: new Date(),
          // Additional data would come from other endpoints
          avgVolume: data.v, // This would need historical data
          high52Week: data.h * 1.2, // Placeholder
          low52Week: data.l * 0.8, // Placeholder
        };

        this.setCache(cacheKey, quote);
        return quote;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  // Enhanced news fetching with backend integration (no direct API key usage)
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
          console.warn(
            "Backend news failed, backend required for API access:",
            error
          );
          this.backendHealth = false;
        }
      }

      // NOTE: No direct API fallback since we don't have API keys in frontend
      // All API calls must go through backend for security
      console.warn("Backend required for news data - no direct API access");
      return [];
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error);
      return [];
    }
  }

  // Replace the existing getTechnicals method with this:
  async getTechnicals(symbol) {
    const cacheKey = `technicals_${symbol}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const data = await makeBackendApiCall(
        API_CONFIG.backend.endpoints.technicals(symbol)
      );

      if (data && data.success) {
        this.setCache(cacheKey, data.data);
        return data.data;
      }

      // Fallback to simplified technicals if backend doesn't have them yet
      const quote = await this.getQuote(symbol);
      if (!quote) return {};

      const fallbackTechnicals = {
        sma20: quote.price * 0.98,
        sma50: quote.price * 0.96,
        sma200: quote.price * 0.94,
        rsi: 50 + quote.changePercent * 3,
        macd: quote.changePercent > 0 ? 0.5 : -0.5,
        macdSignal: 0,
        bbUpper: quote.high,
        bbLower: quote.low,
        price: quote.price,
        adx: Math.abs(quote.changePercent) * 10,
        atr: quote.high - quote.low || quote.price * 0.02,
      };

      this.setCache(cacheKey, fallbackTechnicals);
      return fallbackTechnicals;
    } catch (error) {
      console.error(`Error fetching technicals for ${symbol}:`, error);
      return {};
    }
  }

  // Replace the existing getOptionsData method with this:
  async getOptionsData(symbol) {
    const cacheKey = `options_${symbol}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const data = await makeBackendApiCall(
        API_CONFIG.backend.endpoints.options(symbol)
      );

      if (data && data.success) {
        this.setCache(cacheKey, data.data);
        return data.data;
      }

      // Fallback to mock data if backend doesn't have options data yet
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
      // Return fallback mock data
      const random = Math.random();
      return {
        putVolume: Math.floor(random * 10000),
        callVolume: Math.floor(random * 15000),
        putOI: Math.floor(random * 50000),
        callOI: Math.floor(random * 60000),
        avgOptionsVolume: 10000,
        unusualActivity: random > 0.7,
      };
    }
  }

  async getMarketCap(symbol) {
    // This would come from fundamental data API
    const mockCaps = {
      AAPL: 3e12,
      MSFT: 2.8e12,
      GOOGL: 1.7e12,
      NVDA: 1.1e12,
      META: 900e9,
      TSLA: 800e9,
      AMZN: 1.5e12,
      "BRK.B": 750e9,
      JPM: 450e9,
      PLTR: 40e9,
      SNOW: 60e9,
      DDOG: 35e9,
      NET: 25e9,
      CRWD: 50e9,
      VKTX: 3e9,
      MRNA: 50e9,
      BNTX: 20e9,
      AMD: 230e9,
    };

    // Default market caps by sector
    const sectorDefaults = {
      megaCap: 500e9,
      growthTech: 30e9,
      semiconductor: 50e9,
      biotech: 10e9,
      pharma: 100e9,
      banks: 200e9,
      fintech: 20e9,
      retail: 80e9,
      energy: 150e9,
      industrial: 100e9,
      ev: 30e9,
    };

    return (
      mockCaps[symbol] ||
      sectorDefaults[this.getSectorForSymbol(symbol)] ||
      10e9
    );
  }

  async getVIX() {
    try {
      const quote = await this.getQuote("VIX");
      return quote?.price || 20;
    } catch (error) {
      return 20; // Default normal volatility
    }
  }

  async getMarketBreadth() {
    // This would come from market breadth data provider
    return {
      advanceDecline: 1.2 + (Math.random() - 0.5) * 0.8,
      newHighsLows: 1.1 + (Math.random() - 0.5) * 0.6,
    };
  }

  async getSectorPerformance(sector) {
    // This would fetch sector ETF performance
    const sectorETFs = {
      tech: "XLK",
      growthTech: "XLK",
      semiconductor: "SOXX",
      biotech: "XBI",
      pharma: "XPH",
      banks: "XLF",
      fintech: "FINX",
      financials: "XLF",
      energy: "XLE",
      materials: "XLB",
      industrial: "XLI",
      industrials: "XLI",
      consumer: "XLY",
      retail: "XRT",
      reits: "XLRE",
      ev: "DRIV",
      cleanEnergy: "ICLN",
    };

    const etf = sectorETFs[sector] || "SPY";
    const quote = await this.getQuote(etf);
    return quote?.changePercent || 0;
  }

  async getMarketPerformance() {
    try {
      const spy = await this.getQuote("SPY");
      return spy?.changePercent || 0;
    } catch (error) {
      return 0;
    }
  }

  // Legacy method for backward compatibility
  async getStockData(symbol) {
    return this.analyzeStock(symbol);
  }

  // Legacy method for calculating basic NISS
  calculateNISS(quote, news) {
    if (!quote) return 0;

    // FIXED: Preserve direction for proper sell signals
    const priceChange = quote.changePercent || 0; // ✅ RIGHT - preserves +/- direction
    const newsCount = news.length;
    const recentNews = news.filter(
      (n) => Date.now() - n.datetime * 1000 < 86400000
    ).length;
    const avgSentiment =
      news.length > 0
        ? news.reduce((sum, article) => sum + (article.sentiment || 0), 0) /
          news.length
        : 0;

    // Enhanced NISS calculation that can go negative for sell signals
    const priceScore = priceChange * 10; // Now preserves negative values
    const newsScore = newsCount * 5;
    const recencyScore = recentNews * 10;
    const sentimentScore = avgSentiment * 50; // Can be negative too

    // Final score can now be negative for sell opportunities
    let finalScore = priceScore + newsScore + recencyScore + sentimentScore;

    // Apply directional bias for stronger signals
    if (priceChange < -2 && avgSentiment < -0.3) {
      // Strong negative bias for sell signals
      finalScore = finalScore - Math.abs(finalScore * 0.5);
    } else if (priceChange > 2 && avgSentiment > 0.3) {
      // Strong positive bias for buy signals
      finalScore = finalScore + Math.abs(finalScore * 0.2);
    }

    return Math.round(finalScore);
  }
  // Add this method at the end of your InstitutionalDataService class:
  async checkBackendHealth() {
    try {
      const response = await fetch(`${API_CONFIG.backend.baseUrl}/health`, {
        method: "GET",
        timeout: 5000, // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.error("Backend health check failed:", error);
      return false;
    }
  }
  // ADD these methods to src/api/InstitutionalDataService.js
  // Place them at the end of the class, before the export statement

  // Advanced sentiment analysis using multiple techniques
  async analyzeSentiment(text, headline = "", source = "") {
    if (!text) return 0;

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
      "soar",
      "surge",
      "rally",
      "breakout",
      "bullish",
      "optimistic",
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
      "plunge",
      "tumble",
      "bearish",
      "pessimistic",
      "warning",
    ];

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;

    words.forEach((word) => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });

    // Source credibility weight
    const sourceWeight = this.getSourceCredibilityWeight(source);

    // Headline gets extra weight
    const headlineWords = headline.toLowerCase().split(/\s+/);
    let headlineScore = 0;
    headlineWords.forEach((word) => {
      if (positiveWords.includes(word)) headlineScore += 1;
      if (negativeWords.includes(word)) headlineScore -= 1;
    });

    // Combined score with weights
    const finalScore = (score + headlineScore * 1.5) * sourceWeight;

    // Normalize to -1 to 1 range
    return Math.max(
      -1,
      Math.min(1, finalScore / Math.max(words.length / 5, 1))
    );
  }

  // Get source credibility weight
  getSourceCredibilityWeight(source) {
    const credibilityMap = {
      Reuters: 1.2,
      Bloomberg: 1.2,
      "Wall Street Journal": 1.1,
      "Financial Times": 1.1,
      CNBC: 1.0,
      MarketWatch: 0.9,
      "Yahoo Finance": 0.8,
      "Seeking Alpha": 0.7,
      "The Motley Fool": 0.6,
    };
    return credibilityMap[source] || 0.8; // Default weight
  }

  // Test backend connection
  async testBackendConnection() {
    try {
      const url = `${API_CONFIG.backend.baseUrl}/health`;
      const response = await fetch(url, {
        method: "GET",
        timeout: 5000,
      });

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

  // Enhanced batch processing with better error handling
  async getMultipleStockDataEnhanced(symbols, batchSize = 10) {
    const results = [];

    // Test backend first
    const backendWorking = await this.testBackendConnection();

    if (backendWorking) {
      try {
        // Try backend batch endpoint
        const data = await makeBackendApiCall("/api/batch/stocks", {
          method: "POST",
          body: JSON.stringify({ symbols }),
        });

        if (data && data.success) {
          return data.stocks;
        }
      } catch (error) {
        console.warn("Backend batch failed, using individual requests:", error);
      }
    }

    // Fallback to individual requests
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map((symbol) => this.analyzeStock(symbol));

      try {
        const batchResults = await Promise.allSettled(promises);

        batchResults.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value) {
            results.push(result.value);
          } else {
            console.warn(
              `❌ Failed to analyze ${batch[index]}:`,
              result.reason
            );
          }
        });

        // Rate limiting delay
        if (i + batchSize < symbols.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`❌ Batch error starting at index ${i}:`, error);
      }
    }

    return results;
  }
}

export default new InstitutionalDataService();
