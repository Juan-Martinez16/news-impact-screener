// src/engine/NISSCalculationEngine.js
// NISS Calculation Engine - Single Source of Truth
// Implements Enhanced Trading Cheat Sheet 6-Component Framework

import _ from "lodash";

class NISSCalculationEngine {
  constructor() {
    this.version = "3.0.0";
    this.frameworkType = "Enhanced Institutional";

    // Component weights (exactly matching Enhanced Trading Cheat Sheet)
    this.componentWeights = {
      priceAction: 0.2, // 20% - Volatility-adjusted price movement
      newsImpact: 0.25, // 25% - Sentiment with source credibility
      technicalMomentum: 0.2, // 20% - RSI, MACD, Bollinger Bands, ADX
      optionsFlow: 0.15, // 15% - Put/Call ratios, unusual activity
      relativeStrength: 0.1, // 10% - Sector & market outperformance
      volumeAnalysis: 0.1, // 10% - Volume surge confirmation
    };

    // Market regime adjustment ranges
    this.regimeAdjustment = {
      min: -20,
      max: 20,
    };

    // Source credibility multipliers
    this.sourceCredibility = {
      Reuters: 1.2,
      Bloomberg: 1.2,
      "Wall Street Journal": 1.15,
      "Financial Times": 1.15,
      WSJ: 1.15,
      CNBC: 1.0,
      MarketWatch: 1.0,
      "Yahoo Finance": 0.85,
      "Seeking Alpha": 0.8,
      "The Motley Fool": 0.75,
      default: 0.7,
    };

    console.log(`🚀 NISSCalculationEngine v${this.version} initialized`);
    console.log("📊 Framework: Enhanced Institutional 6-Component System");
  }

  // ============================================
  // MAIN NISS CALCULATION METHOD
  // ============================================

  calculateNISS(
    stock,
    newsData = [],
    technicalData = {},
    optionsData = {},
    marketContext = {}
  ) {
    try {
      const startTime = performance.now();

      // Validate input data
      if (!stock || !stock.symbol) {
        throw new Error("Invalid stock data provided");
      }

      // Calculate all 6 components
      const components = {
        priceAction: this.calculatePriceActionScore(stock),
        newsImpact: this.calculateNewsImpactScore(newsData, stock.symbol),
        technicalMomentum: this.calculateTechnicalMomentum(
          technicalData,
          stock
        ),
        optionsFlow: this.calculateOptionsFlow(optionsData),
        relativeStrength: this.calculateRelativeStrength(stock, marketContext),
        volumeAnalysis: this.calculateVolumeAnalysis(stock),
      };

      // Apply component weights
      const weightedScore =
        components.priceAction * this.componentWeights.priceAction +
        components.newsImpact * this.componentWeights.newsImpact +
        components.technicalMomentum * this.componentWeights.technicalMomentum +
        components.optionsFlow * this.componentWeights.optionsFlow +
        components.relativeStrength * this.componentWeights.relativeStrength +
        components.volumeAnalysis * this.componentWeights.volumeAnalysis;

      // Apply market regime adjustment
      const regimeAdjustment = this.calculateMarketRegimeAdjustment(
        marketContext,
        components
      );

      // Final score calculation
      const rawScore = weightedScore + regimeAdjustment;
      const finalScore = Math.max(-100, Math.min(100, rawScore));

      // Calculate confidence level
      const confidence = this.calculateConfidence(components, regimeAdjustment);

      // Calculate processing time
      const processingTime = performance.now() - startTime;

      // Return complete NISS result
      return {
        score: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
        components: components,
        confidence: confidence,
        regimeAdjustment: regimeAdjustment,
        metadata: {
          version: this.version,
          processingTime: Math.round(processingTime * 100) / 100,
          timestamp: new Date().toISOString(),
          symbol: stock.symbol,
          componentWeights: this.componentWeights,
        },
      };
    } catch (error) {
      console.error(`❌ NISS calculation error for ${stock.symbol}:`, error);
      return {
        score: 0,
        components: {},
        confidence: "ERROR",
        error: error.message,
        metadata: {
          version: this.version,
          timestamp: new Date().toISOString(),
          symbol: stock.symbol,
        },
      };
    }
  }

  // ============================================
  // COMPONENT 1: PRICE ACTION SCORE (0-100)
  // ============================================

  calculatePriceActionScore(stock) {
    try {
      const {
        price,
        sma20,
        sma50,
        sma200,
        high52Week,
        low52Week,
        changePercent = 0,
      } = stock;

      if (!price || price <= 0) return 50; // Neutral if no price data

      let score = 50; // Base score

      // SMA Alignment Analysis (40% weight)
      if (sma20 && sma50 && sma200) {
        if (price > sma20 && price > sma50 && price > sma200) {
          score += 20; // All SMAs aligned bullishly
        } else if (price > sma20 && price > sma50) {
          score += 10; // Short and medium term bullish
        } else if (price > sma20) {
          score += 5; // Only short term bullish
        } else if (price < sma200) {
          score -= 15; // Below long-term trend
        }
      }

      // 52-Week Position Analysis (30% weight)
      if (high52Week && low52Week && high52Week > low52Week) {
        const yearRange = high52Week - low52Week;
        const yearPosition = (price - low52Week) / yearRange;

        if (yearPosition > 0.9) {
          score += 15; // Near 52-week highs
        } else if (yearPosition > 0.75) {
          score += 10; // Upper quartile
        } else if (yearPosition < 0.1) {
          score -= 15; // Near 52-week lows
        } else if (yearPosition < 0.25) {
          score -= 5; // Lower quartile
        } else {
          score += (yearPosition - 0.5) * 10; // Linear interpolation
        }
      }

      // Volatility-Adjusted Movement (30% weight)
      const normalizedMove = Math.min(Math.abs(changePercent) / 5, 1) * 15;
      if (changePercent > 0) {
        score += normalizedMove; // Positive movement adds to score
      } else {
        score -= normalizedMove; // Negative movement subtracts
      }

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error("Price Action Score calculation error:", error);
      return 50; // Neutral score on error
    }
  }

  // ============================================
  // COMPONENT 2: NEWS IMPACT SCORE (0-100)
  // ============================================

  calculateNewsImpactScore(newsData, symbol) {
    try {
      if (!Array.isArray(newsData) || newsData.length === 0) {
        return 50; // Neutral score if no news
      }

      let totalScore = 0;
      let weightedTotal = 0;

      // Process each news item
      newsData.forEach((news) => {
        // Calculate base relevance score
        const relevanceScore = this.calculateRelevanceScore(
          news.headline || news.title,
          symbol
        );

        // Get source credibility multiplier
        const credibilityMultiplier = this.getSourceCredibilityMultiplier(
          news.source
        );

        // Calculate sentiment impact
        const sentimentImpact = (news.sentiment || 0) * 25; // -25 to +25 range

        // Time decay factor (newer news has more impact)
        const timeDecay = this.calculateTimeDecay(
          news.datetime || news.publishedAt
        );

        // Calculate weighted news score
        const newsScore =
          (relevanceScore + sentimentImpact) *
          credibilityMultiplier *
          timeDecay;

        totalScore += newsScore;
        weightedTotal += credibilityMultiplier * timeDecay;
      });

      // Calculate final news impact score
      const finalScore = weightedTotal > 0 ? totalScore / weightedTotal : 50;

      return Math.max(0, Math.min(100, finalScore));
    } catch (error) {
      console.error("News Impact Score calculation error:", error);
      return 50;
    }
  }

  // ============================================
  // COMPONENT 3: TECHNICAL MOMENTUM SCORE (0-100)
  // ============================================

  calculateTechnicalMomentum(technicalData, stock) {
    try {
      const {
        rsi = 50,
        macd = 0,
        macdSignal = 0,
        adx = 25,
        bollinger = {},
        price = stock.price,
      } = technicalData;

      let score = 50; // Base score

      // RSI Momentum Analysis (30% weight)
      if (rsi >= 30 && rsi <= 70) {
        score += 15; // Healthy RSI range
      } else if (rsi > 70) {
        score += 5; // Overbought but still momentum
      } else if (rsi < 30) {
        score -= 10; // Oversold condition
      }

      // MACD Momentum Analysis (30% weight)
      if (macd > macdSignal) {
        const macdStrength = Math.min(
          (macd - macdSignal) / Math.abs(macdSignal || 1),
          1
        );
        score += 15 * macdStrength; // Bullish MACD
      } else {
        const macdWeakness = Math.min(
          (macdSignal - macd) / Math.abs(macdSignal || 1),
          1
        );
        score -= 15 * macdWeakness; // Bearish MACD
      }

      // Trend Strength Analysis (25% weight)
      if (adx > 25) {
        score += 12.5; // Strong trend present
      } else if (adx < 15) {
        score -= 5; // Weak trend or ranging
      }

      // Bollinger Band Position (15% weight)
      if (bollinger.upper && bollinger.lower && price) {
        const bandRange = bollinger.upper - bollinger.lower;
        if (bandRange > 0) {
          const bandPosition = (price - bollinger.lower) / bandRange;
          score += (bandPosition - 0.5) * 15; // Position relative to bands
        }
      }

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error("Technical Momentum calculation error:", error);
      return 50;
    }
  }

  // ============================================
  // COMPONENT 4: OPTIONS FLOW SCORE (0-100)
  // ============================================

  calculateOptionsFlow(optionsData) {
    try {
      if (!optionsData || Object.keys(optionsData).length === 0) {
        return 50; // Neutral if no options data
      }

      const {
        putCallRatio = 1,
        callVolume = 0,
        putVolume = 0,
        callOI = 0,
        putOI = 0,
        unusualActivity = false,
      } = optionsData;

      let score = 50; // Base score

      // Put/Call Ratio Analysis (40% weight)
      if (putCallRatio < 0.7) {
        score += 20; // Very bullish options flow
      } else if (putCallRatio < 1.0) {
        score += 10; // Moderately bullish
      } else if (putCallRatio > 1.3) {
        score -= 20; // Very bearish options flow
      } else if (putCallRatio > 1.0) {
        score -= 10; // Moderately bearish
      }

      // Volume Activity Analysis (35% weight)
      if (callVolume > 0 && putVolume > 0) {
        const volumeRatio = callVolume / putVolume;
        if (volumeRatio > 3) {
          score += 17.5; // Strong call volume bias
        } else if (volumeRatio > 1.5) {
          score += 8.75; // Moderate call bias
        } else if (volumeRatio < 0.33) {
          score -= 17.5; // Strong put volume bias
        } else if (volumeRatio < 0.67) {
          score -= 8.75; // Moderate put bias
        }
      }

      // Open Interest Analysis (25% weight)
      if (callOI > 0 && putOI > 0) {
        const oiRatio = callOI / putOI;
        if (oiRatio > 1.5) {
          score += 12.5; // Call interest bias
        } else if (oiRatio < 0.67) {
          score -= 12.5; // Put interest bias
        }
      }

      // Unusual Activity Bonus
      if (unusualActivity) {
        score += 5; // Bonus for unusual options activity
      }

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error("Options Flow calculation error:", error);
      return 50;
    }
  }

  // ============================================
  // COMPONENT 5: RELATIVE STRENGTH SCORE (0-100)
  // ============================================

  calculateRelativeStrength(stock, marketContext) {
    try {
      const { changePercent = 0, sector } = stock;
      const {
        spyChange = 0,
        sectorPerformance = {},
        marketTrend = "NEUTRAL",
      } = marketContext;

      let score = 50; // Base score

      // Sector Outperformance Analysis (60% weight)
      const sectorChange = sectorPerformance[sector]?.changePercent || 0;
      const sectorOutperformance = changePercent - sectorChange;

      if (sectorOutperformance > 3) {
        score += 30; // Strong sector outperformance
      } else if (sectorOutperformance > 1) {
        score += 15; // Moderate outperformance
      } else if (sectorOutperformance > 0) {
        score += 5; // Slight outperformance
      } else if (sectorOutperformance < -3) {
        score -= 30; // Significantly underperforming sector
      } else if (sectorOutperformance < -1) {
        score -= 15; // Moderately underperforming
      } else {
        score -= 5; // Slightly underperforming
      }

      // Market Alignment Analysis (40% weight)
      const marketAlignment = changePercent - spyChange;

      if (marketAlignment > 2) {
        score += 20; // Strongly beating market
      } else if (marketAlignment > 0) {
        score += 10; // Outperforming market
      } else if (marketAlignment < -2) {
        score -= 20; // Significantly lagging market
      } else {
        score -= 10; // Underperforming market
      }

      // Market Trend Adjustment
      if (marketTrend === "BULLISH" && changePercent > 0) {
        score += 5; // Bonus for aligning with bull market
      } else if (marketTrend === "BEARISH" && changePercent < 0) {
        score += 5; // Bonus for aligning with bear market
      }

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error("Relative Strength calculation error:", error);
      return 50;
    }
  }

  // ============================================
  // COMPONENT 6: VOLUME ANALYSIS SCORE (0-100)
  // ============================================

  calculateVolumeAnalysis(stock) {
    try {
      const {
        volume = 0,
        avgVolume = 0,
        changePercent = 0,
        marketCap = 0,
      } = stock;

      if (!volume || !avgVolume || avgVolume === 0) {
        return 50; // Neutral if no volume data
      }

      let score = 50; // Base score
      const volumeRatio = volume / avgVolume;

      // Volume Surge Analysis (70% weight)
      if (volumeRatio > 5) {
        score += 35; // Exceptional volume
      } else if (volumeRatio > 3) {
        score += 25; // Very high volume
      } else if (volumeRatio > 2) {
        score += 15; // High volume
      } else if (volumeRatio > 1.5) {
        score += 10; // Above average volume
      } else if (volumeRatio < 0.5) {
        score -= 20; // Very low volume
      } else if (volumeRatio < 0.8) {
        score -= 10; // Below average volume
      }

      // Direction Confirmation Analysis (30% weight)
      if (volumeRatio > 1.5) {
        if (changePercent > 0) {
          score += 15; // High volume + positive price = very bullish
        } else if (changePercent < 0) {
          score -= 15; // High volume + negative price = very bearish
        }
      }

      // Market Cap Adjustment (larger stocks need higher volume ratios)
      if (marketCap > 50000000000) {
        // $50B+ market cap
        if (volumeRatio > 1 && volumeRatio < 1.5) {
          score -= 5; // Penalize low volume for large caps
        }
      }

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error("Volume Analysis calculation error:", error);
      return 50;
    }
  }

  // ============================================
  // MARKET REGIME ADJUSTMENT (-20 to +20)
  // ============================================

  calculateMarketRegimeAdjustment(marketContext, components) {
    try {
      const {
        volatility = "NORMAL",
        trend = "NEUTRAL",
        breadth = "MIXED",
        vixLevel = 20,
      } = marketContext;

      let adjustment = 0;

      // Volatility Regime Adjustment
      if (volatility === "HIGH" && vixLevel > 30) {
        adjustment -= 10; // High volatility reduces confidence
      } else if (volatility === "LOW" && vixLevel < 15) {
        adjustment += 5; // Low volatility increases confidence
      }

      // Market Trend Adjustment
      if (trend === "BULLISH") {
        if (components.priceAction > 60 && components.relativeStrength > 60) {
          adjustment += 10; // Strong alignment with bull market
        } else {
          adjustment += 5; // Moderate bull market benefit
        }
      } else if (trend === "BEARISH") {
        if (components.priceAction < 40 && components.relativeStrength < 40) {
          adjustment -= 10; // Strong alignment with bear market (for shorts)
        } else {
          adjustment -= 5; // Bear market penalty for longs
        }
      }

      // Market Breadth Adjustment
      if (breadth === "ADVANCING") {
        adjustment += 3; // Broad market participation
      } else if (breadth === "DECLINING") {
        adjustment -= 3; // Narrow market participation
      }

      return Math.max(-20, Math.min(20, adjustment));
    } catch (error) {
      console.error("Market Regime Adjustment calculation error:", error);
      return 0;
    }
  }

  // ============================================
  // CONFIDENCE CALCULATION
  // ============================================

  calculateConfidence(components, regimeAdjustment) {
    try {
      // Count components with strong signals (>70 or <30)
      const strongComponents = Object.values(components).filter(
        (score) => score > 70 || score < 30
      ).length;

      // Calculate component alignment (all pointing same direction)
      const bullishComponents = Object.values(components).filter(
        (score) => score > 60
      ).length;
      const bearishComponents = Object.values(components).filter(
        (score) => score < 40
      ).length;
      const neutralComponents = 6 - bullishComponents - bearishComponents;

      // Calculate confidence based on alignment and strength
      let confidence = "LOW";

      if (
        strongComponents >= 4 &&
        (bullishComponents >= 5 || bearishComponents >= 5)
      ) {
        confidence = "HIGH"; // Strong alignment + strong signals
      } else if (
        strongComponents >= 3 &&
        (bullishComponents >= 4 || bearishComponents >= 4)
      ) {
        confidence = "MEDIUM"; // Good alignment + decent signals
      } else if (strongComponents >= 2 && neutralComponents <= 2) {
        confidence = "MEDIUM"; // Some strong signals + low neutral
      }

      // Regime adjustment impact on confidence
      if (Math.abs(regimeAdjustment) > 15) {
        confidence = confidence === "HIGH" ? "MEDIUM" : "LOW"; // Strong regime impacts reduce confidence
      }

      return confidence;
    } catch (error) {
      console.error("Confidence calculation error:", error);
      return "LOW";
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  calculateRelevanceScore(headline, symbol) {
    if (!headline || !symbol) return 50;

    const text = headline.toLowerCase();
    const symbolLower = symbol.toLowerCase();

    let score = 40; // Base score

    // Direct symbol mention (highest priority)
    if (text.includes(symbolLower)) score += 30;

    // High-impact keywords
    const highImpactKeywords = [
      "earnings",
      "revenue",
      "profit",
      "loss",
      "merger",
      "acquisition",
      "fda",
      "approval",
      "recall",
      "lawsuit",
      "bankruptcy",
      "dividend",
    ];
    highImpactKeywords.forEach((keyword) => {
      if (text.includes(keyword)) score += 12;
    });

    // Medium-impact keywords
    const mediumImpactKeywords = [
      "upgrade",
      "downgrade",
      "target",
      "partnership",
      "deal",
      "ceo",
      "guidance",
      "forecast",
      "outlook",
      "expansion",
      "growth",
    ];
    mediumImpactKeywords.forEach((keyword) => {
      if (text.includes(keyword)) score += 7;
    });

    return Math.min(100, Math.max(0, score));
  }

  getSourceCredibilityMultiplier(source) {
    if (!source) return this.sourceCredibility.default;

    const sourceKey = Object.keys(this.sourceCredibility).find((key) =>
      source.toLowerCase().includes(key.toLowerCase())
    );

    return this.sourceCredibility[sourceKey] || this.sourceCredibility.default;
  }

  calculateTimeDecay(datetime) {
    if (!datetime) return 0.5; // Default decay for unknown time

    const now = Date.now();
    const newsTime = new Date(datetime).getTime();
    const ageHours = (now - newsTime) / (1000 * 60 * 60);

    // News becomes less relevant over time
    if (ageHours < 1) return 1.0; // Fresh news
    if (ageHours < 6) return 0.9; // Recent news
    if (ageHours < 24) return 0.7; // Today's news
    if (ageHours < 72) return 0.5; // 3-day old news
    return 0.3; // Older news
  }

  // ============================================
  // TRADE SETUP GENERATION
  // ============================================

  generateTradeSetup(stock, nissResult) {
    const { score, confidence } = nissResult;
    const { price, symbol } = stock;

    let action = "HOLD";
    let entryPrice = price;
    let stopLoss = null;
    let targets = [];
    let riskReward = 1;

    // Determine action based on score and confidence
    if (score > 75 && confidence === "HIGH") {
      action = "STRONG BUY";
      stopLoss = price * 0.95; // 5% stop loss
      targets = [
        { level: 1, price: price * 1.04, probability: 0.8 },
        { level: 2, price: price * 1.08, probability: 0.6 },
        { level: 3, price: price * 1.12, probability: 0.4 },
      ];
      riskReward = 2.4;
    } else if (score > 60 && confidence !== "LOW") {
      action = "BUY";
      stopLoss = price * 0.96; // 4% stop loss
      targets = [
        { level: 1, price: price * 1.03, probability: 0.7 },
        { level: 2, price: price * 1.06, probability: 0.5 },
        { level: 3, price: price * 1.09, probability: 0.3 },
      ];
      riskReward = 2.25;
    } else if (score < -75 && confidence === "HIGH") {
      action = "STRONG SELL";
      stopLoss = price * 1.05; // 5% stop loss for shorts
      targets = [
        { level: 1, price: price * 0.96, probability: 0.8 },
        { level: 2, price: price * 0.92, probability: 0.6 },
        { level: 3, price: price * 0.88, probability: 0.4 },
      ];
      riskReward = 2.4;
    } else if (score < -60 && confidence !== "LOW") {
      action = "SELL";
      stopLoss = price * 1.04; // 4% stop loss for shorts
      targets = [
        { level: 1, price: price * 0.97, probability: 0.7 },
        { level: 2, price: price * 0.94, probability: 0.5 },
        { level: 3, price: price * 0.91, probability: 0.3 },
      ];
      riskReward = 2.25;
    }

    return {
      action,
      entryPrice: parseFloat(entryPrice.toFixed(2)),
      stopLoss: stopLoss ? parseFloat(stopLoss.toFixed(2)) : null,
      targets: targets.map((t) => ({
        ...t,
        price: parseFloat(t.price.toFixed(2)),
      })),
      riskReward,
      confidence,
      reasoning: this.generateReasoning(nissResult, action),
    };
  }

  generateReasoning(nissResult, action) {
    const { components, score } = nissResult;
    const strongComponents = [];

    Object.entries(components).forEach(([name, value]) => {
      if (value > 70) strongComponents.push(`Strong ${name}`);
      else if (value < 30) strongComponents.push(`Weak ${name}`);
    });

    const componentList =
      strongComponents.length > 0
        ? strongComponents.join(", ")
        : "Mixed signals";

    return `${action} signal based on: ${componentList} (NISS: ${score.toFixed(
      1
    )})`;
  }
}

// Export singleton instance
const nissCalculationEngine = new NISSCalculationEngine();
export default nissCalculationEngine;

// Named exports for specific functions
export { NISSCalculationEngine };
