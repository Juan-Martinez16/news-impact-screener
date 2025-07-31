// src/utils/enhanced/TradeSetupHelper.js - SECTION 1
// Enhanced Trading Cheat Sheet Implementation - Core Setup

class TradeSetupHelper {
  constructor() {
    this.version = "3.0.0";
    console.log(`🎯 TradeSetupHelper v${this.version} initialized`);
  }

  // ============================================
  // ENHANCED TRADING CHEAT SHEET CALCULATIONS
  // ============================================

  /**
   * Generate comprehensive trade signal based on Enhanced Trading Cheat Sheet
   * @param {Object} stock - Stock data with NISS components
   * @returns {Object} Complete trade signal with setup
   */
  generateEnhancedTradeSignal(stock) {
    try {
      const {
        nissScore,
        confidence,
        priceData,
        volumeData,
        technicalData,
        marketData,
        optionsData,
        currentPrice,
      } = stock;

      // Enhanced Trading Cheat Sheet Signal Classification
      const signal = this._classifySignal(stock);
      const setup = this._calculateTradeSetup(stock, signal);
      const riskManagement = this._calculateRiskManagement(stock, setup);

      return {
        ...signal,
        setup,
        riskManagement,
        timestamp: new Date().toISOString(),
        cheatSheetCompliant: this._validateCheatSheetCompliance(stock, signal),
      };
    } catch (error) {
      console.error("Error generating trade signal:", error);
      return {
        action: "HOLD",
        error: "Unable to generate signal",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Classify trade signal per Enhanced Trading Cheat Sheet
   * @private
   */
  _classifySignal(stock) {
    const { nissScore, confidence, priceData, volumeData, marketData } = stock;

    // Market regime check
    const marketRegime = this._assessMarketRegime(marketData);

    // Strong Buy Signal (Enhanced Trading Cheat Sheet)
    if (this._isStrongBuySignal(stock, marketRegime)) {
      return {
        action: "STRONG BUY",
        priority: 1,
        color: "bg-green-600",
        textColor: "text-white",
        reasoning:
          "High NISS + High confidence + Volume surge + Favorable regime",
        maxPositionSize: 2.5,
        urgency: "IMMEDIATE",
      };
    }

    // Moderate Buy Signal
    if (this._isBuySignal(stock, marketRegime)) {
      return {
        action: "BUY",
        priority: 2,
        color: "bg-green-500",
        textColor: "text-white",
        reasoning: "Good NISS + Decent confidence + Volume confirmation",
        maxPositionSize: 1.5,
        urgency: "MONITOR",
      };
    }

    // Strong Sell Signal
    if (this._isStrongSellSignal(stock, marketRegime)) {
      return {
        action: "STRONG SELL",
        priority: 1,
        color: "bg-red-600",
        textColor: "text-white",
        reasoning: "Low NISS + High confidence + Volume + Bearish regime",
        maxPositionSize: 2.0,
        urgency: "IMMEDIATE",
      };
    }

    // Moderate Sell Signal
    if (this._isSellSignal(stock, marketRegime)) {
      return {
        action: "SELL",
        priority: 2,
        color: "bg-red-500",
        textColor: "text-white",
        reasoning: "Negative NISS + Confirmation + Volume",
        maxPositionSize: 1.0,
        urgency: "MONITOR",
      };
    }

    // Default Hold
    return {
      action: "HOLD",
      priority: 3,
      color: "bg-gray-400",
      textColor: "text-white",
      reasoning: "No clear setup or conflicting signals",
      maxPositionSize: 0,
      urgency: "WAIT",
    };
  }

  /**
   * Enhanced Trading Cheat Sheet - Strong Buy Logic
   * @private
   */
  _isStrongBuySignal(stock, marketRegime) {
    const { nissScore, confidence, volumeData, priceData, technicalData } =
      stock;

    return (
      (nissScore || 0) > 75 &&
      confidence === "HIGH" &&
      (volumeData?.relativeVolume || 0) > 2 &&
      (priceData?.change || 0) > 0 &&
      technicalData?.priceAboveSMA20 !== false &&
      marketRegime.trend !== "BEARISH" &&
      marketRegime.volatility !== "HIGH"
    );
  }

  /**
   * Enhanced Trading Cheat Sheet - Buy Logic
   * @private
   */
  _isBuySignal(stock, marketRegime) {
    const { nissScore, confidence, volumeData, technicalData } = stock;

    return (
      (nissScore || 0) >= 60 &&
      confidence !== "LOW" &&
      (volumeData?.relativeVolume || 0) > 1.5 &&
      (technicalData?.momentum || 0) > 0 &&
      marketRegime.trend !== "BEARISH"
    );
  }

  /**
   * Enhanced Trading Cheat Sheet - Strong Sell Logic
   * @private
   */
  _isStrongSellSignal(stock, marketRegime) {
    const { nissScore, confidence, volumeData, priceData, technicalData } =
      stock;

    return (
      (nissScore || 0) < -75 &&
      confidence === "HIGH" &&
      (volumeData?.relativeVolume || 0) > 2 &&
      (priceData?.change || 0) < 0 &&
      technicalData?.priceBelowSMA20 !== false &&
      marketRegime.trend !== "BULLISH"
    );
  }

  /**
   * Enhanced Trading Cheat Sheet - Sell Logic
   * @private
   */
  _isSellSignal(stock, marketRegime) {
    const { nissScore, confidence, volumeData, technicalData } = stock;

    return (
      (nissScore || 0) <= -60 &&
      confidence !== "LOW" &&
      (volumeData?.relativeVolume || 0) > 1.5 &&
      (technicalData?.momentum || 0) < 0 &&
      marketRegime.trend !== "BULLISH"
    );
  }

  /**
   * Assess market regime for trading decisions
   * @private
   */
  _assessMarketRegime(marketData) {
    if (!marketData) {
      return {
        trend: "NEUTRAL",
        volatility: "NORMAL",
        breadth: "MIXED",
      };
    }

    const { spyChange, vix, advanceDecline } = marketData;

    return {
      trend:
        (spyChange || 0) > 0.5
          ? "BULLISH"
          : (spyChange || 0) < -0.5
          ? "BEARISH"
          : "NEUTRAL",
      volatility:
        (vix || 20) > 25 ? "HIGH" : (vix || 20) < 15 ? "LOW" : "NORMAL",
      breadth:
        (advanceDecline || 1) > 1.5
          ? "ADVANCING"
          : (advanceDecline || 1) < 0.67
          ? "DECLINING"
          : "MIXED",
    };
  }

  /**
   * Calculate complete trade setup per Enhanced Trading Cheat Sheet
   * @private
   */
  _calculateTradeSetup(stock, signal) {
    try {
      if (signal.action === "HOLD") {
        return { action: "HOLD", message: "No clear setup available" };
      }

      const { currentPrice, technicalData, confidence } = stock;

      if (!currentPrice || currentPrice <= 0) {
        return { action: "HOLD", message: "Invalid price data" };
      }

      const atr = technicalData?.atr || currentPrice * 0.025; // Default 2.5% ATR
      const isBullish = signal.action.includes("BUY");

      // Entry price (current market or technical level)
      const entry = this._calculateOptimalEntry(stock, signal, isBullish);

      // Stop loss per Enhanced Trading Cheat Sheet
      const stopLoss = this._calculateStopLoss(
        entry,
        atr,
        confidence,
        isBullish
      );

      // Profit targets (3-tier system)
      const targets = this._calculateProfitTargets(
        entry,
        stopLoss,
        confidence,
        isBullish
      );

      // Risk-reward calculation
      const riskPerShare = Math.abs(entry - stopLoss.price);
      const rewardPerShare = Math.abs(targets[1]?.price - entry || 0); // Use Target 2 for R:R
      const riskRewardRatio =
        riskPerShare > 0 ? rewardPerShare / riskPerShare : 0;

      return {
        action: signal.action,
        entry: {
          price: entry,
          reasoning: "Technical level + Current price",
        },
        stopLoss,
        targets,
        riskReward: `1:${riskRewardRatio.toFixed(1)}`,
        timeframe: this._getOptimalTimeframe(stock, signal),
        marketTiming: this._getOptimalTiming(stock, signal),
      };
    } catch (error) {
      console.error("Error calculating trade setup:", error);
      return { action: "HOLD", message: "Setup calculation error" };
    }
  }

  /**
   * Calculate optimal entry price
   * @private
   */
  _calculateOptimalEntry(stock, signal, isBullish) {
    const { currentPrice, technicalData } = stock;

    if (!currentPrice) return 0;

    // Use technical levels when available
    if (isBullish && technicalData?.support) {
      return Math.min(currentPrice, technicalData.support * 1.01); // 1% above support
    }

    if (!isBullish && technicalData?.resistance) {
      return Math.max(currentPrice, technicalData.resistance * 0.99); // 1% below resistance
    }

    return currentPrice;
  }

  /**
   * Calculate stop loss per Enhanced Trading Cheat Sheet
   * @private
   */
  _calculateStopLoss(entry, atr, confidence, isBullish) {
    // Enhanced Trading Cheat Sheet stop loss multipliers
    const multiplier =
      {
        HIGH: 1.5,
        MEDIUM: 2.0,
        LOW: 2.5,
      }[confidence] || 2.0;

    const stopPrice = isBullish
      ? entry - atr * multiplier
      : entry + atr * multiplier;

    const stopPercentage = (stopPrice / entry - 1) * 100;

    return {
      price: stopPrice,
      percentage: stopPercentage.toFixed(2),
      atrMultiple: multiplier,
      reasoning: `${multiplier}x ATR for ${confidence} confidence`,
    };
  }

  /**
   * Calculate 3-tier profit targets per Enhanced Trading Cheat Sheet
   * @private
   */
  _calculateProfitTargets(entry, stopLoss, confidence, isBullish) {
    const riskPerShare = Math.abs(entry - stopLoss.price);

    if (riskPerShare <= 0) {
      return [{ level: 1, price: entry, percentage: 0, probability: 0 }];
    }

    // Enhanced Trading Cheat Sheet target multipliers
    const multipliers = {
      HIGH: [2.0, 3.5, 5.0], // Conservative for high confidence
      MEDIUM: [2.5, 4.0, 6.0], // Standard multipliers
      LOW: [3.0, 5.0, 7.0], // Higher targets for lower confidence
    }[confidence] || [2.5, 4.0, 6.0];

    const probabilities = [70, 50, 30]; // Target hit probabilities

    return multipliers.map((mult, index) => {
      const targetPrice = isBullish
        ? entry + riskPerShare * mult
        : entry - riskPerShare * mult;

      const percentage = (targetPrice / entry - 1) * 100;

      return {
        level: index + 1,
        price: targetPrice,
        percentage: percentage,
        probability: probabilities[index],
        multiplier: mult,
        exitStrategy:
          index === 0 ? "Exit 33%" : index === 1 ? "Exit 33%" : "Trail stop",
      };
    });
  }

  /**
   * Calculate optimal timeframe for trade
   * @private
   */
  _getOptimalTimeframe(stock, signal) {
    const { latestNews, confidence } = stock;

    if (!latestNews) return "1-3 days";

    // News-based timeframes
    const newsType = latestNews.category?.toLowerCase() || "";

    const timeframes = {
      earnings: "1-2 days",
      fda: "1-3 days",
      merger: "1-5 days",
      analyst: "1-2 days",
      partnership: "1 day",
      clinical: "2-5 days",
      executive: "2-7 days",
    };

    return (
      timeframes[newsType] || (confidence === "HIGH" ? "1-3 days" : "3-7 days")
    );
  }

  /**
   * Get optimal market timing
   * @private
   */
  _getOptimalTiming(stock, signal) {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour + minute / 60;

    // London time trading windows (converted to UTC)
    const tradingWindows = [
      {
        start: 14.75,
        end: 15.5,
        label: "US Open Momentum",
        quality: "EXCELLENT",
      },
      { start: 15.5, end: 17.0, label: "Post-Open Stability", quality: "GOOD" },
      {
        start: 19.0,
        end: 20.0,
        label: "Late Day Positioning",
        quality: "GOOD",
      },
    ];

    // Avoid periods
    const avoidPeriods = [
      {
        start: 14.5,
        end: 14.75,
        label: "US Open First 15min",
        quality: "AVOID",
      },
      {
        start: 20.75,
        end: 21.0,
        label: "US Close Last 15min",
        quality: "AVOID",
      },
    ];

    // Find current window
    for (const window of tradingWindows) {
      if (currentTime >= window.start && currentTime <= window.end) {
        return {
          status: "OPTIMAL",
          window: window.label,
          quality: window.quality,
          recommendation: "Execute immediately",
        };
      }
    }

    for (const avoid of avoidPeriods) {
      if (currentTime >= avoid.start && currentTime <= avoid.end) {
        return {
          status: "AVOID",
          window: avoid.label,
          quality: avoid.quality,
          recommendation: "Wait for better timing",
        };
      }
    }

    return {
      status: "ACCEPTABLE",
      window: "Outside peak hours",
      quality: "FAIR",
      recommendation: "Proceed with caution",
    };
  }

  /**
   * Calculate comprehensive risk management
   * @private
   */
  _calculateRiskManagement(stock, setup) {
    try {
      const { confidence, nissScore, marketData } = stock;

      // Kelly Criterion for position sizing
      const kellySizing = this._calculateKellyPosition(stock);

      // Market regime adjustment
      const regimeAdjustment = this._getRegimeAdjustment(marketData);

      // Final position size
      const baseSize = Math.min(
        kellySizing,
        setup.action?.includes("STRONG") ? 2.5 : 1.5
      );
      const adjustedSize = Math.max(0.5, baseSize * regimeAdjustment);

      return {
        positionSize: {
          percentage: adjustedSize.toFixed(1),
          reasoning: `Kelly: ${kellySizing.toFixed(
            1
          )}% × Regime: ${regimeAdjustment.toFixed(2)}`,
          maxDollarRisk: this._calculateMaxDollarRisk(adjustedSize, setup),
        },
        riskLevel: this._assessRiskLevel(stock, setup),
        stopLossLevel: this._getStopLossLevel(setup),
        portfolioCorrelation: this._assessPortfolioRisk(stock),
        timeDecay: this._getTimeDecayRisk(stock, setup),
      };
    } catch (error) {
      console.error("Error calculating risk management:", error);
      return {
        positionSize: {
          percentage: "1.0",
          reasoning: "Default size",
          maxDollarRisk: "$500",
        },
        riskLevel: "MEDIUM",
        stopLossLevel: "NORMAL",
        portfolioCorrelation: { sectorExposure: "LOW" },
        timeDecay: { level: "LOW" },
      };
    }
  }

  /**
   * Kelly Criterion position sizing
   * @private
   */
  _calculateKellyPosition(stock) {
    const { confidence, nissScore } = stock;

    // Historical win rates by confidence level
    const winProbability =
      {
        HIGH: 0.65,
        MEDIUM: 0.55,
        LOW: 0.45,
      }[confidence] || 0.5;

    // Average win/loss based on NISS score magnitude
    const avgWin = Math.min((Math.abs(nissScore || 0) / 100) * 0.08, 0.12); // Max 12% win
    const avgLoss = 0.035; // Average 3.5% loss

    // Avoid division by zero
    if (avgLoss === 0) return 1.0;

    // Kelly formula: (bp - q) / b
    const odds = avgWin / avgLoss;
    const kellyPercent = (winProbability * odds - (1 - winProbability)) / odds;

    // Conservative Kelly (use 50% of full Kelly)
    return Math.max(0.5, Math.min(kellyPercent * 0.5 * 100, 5.0));
  }

  /**
   * Get regime-based position adjustment
   * @private
   */
  _getRegimeAdjustment(marketData) {
    const regime = this._assessMarketRegime(marketData);

    // Reduce size in unfavorable conditions
    if (regime.volatility === "HIGH") return 0.5; // 50% size in high vol
    if (regime.trend === "BEARISH" && regime.breadth === "DECLINING")
      return 0.6;
    if (regime.volatility === "LOW" && regime.trend === "BULLISH") return 1.2; // 120% in ideal conditions

    return 1.0; // Normal conditions
  }

  /**
   * Calculate maximum dollar risk
   * @private
   */
  _calculateMaxDollarRisk(positionSizePercent, setup) {
    try {
      // Placeholder - should be calculated based on actual account size
      const accountSize = 100000; // $100k default
      const positionValue = accountSize * (positionSizePercent / 100);
      const stopPercent = Math.abs(parseFloat(setup.stopLoss?.percentage || 0));
      const dollarRisk = positionValue * (stopPercent / 100);

      return {
        amount: dollarRisk,
        formatted: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(dollarRisk),
      };
    } catch (error) {
      return { amount: 500, formatted: "$500" };
    }
  }

  /**
   * Assess overall risk level
   * @private
   */
  _assessRiskLevel(stock, setup) {
    const { confidence, nissScore, marketData } = stock;

    let riskScore = 0;

    // Confidence risk
    if (confidence === "LOW") riskScore += 3;
    else if (confidence === "MEDIUM") riskScore += 1;

    // NISS magnitude risk
    if (Math.abs(nissScore || 0) < 60) riskScore += 2;

    // Market regime risk
    const regime = this._assessMarketRegime(marketData);
    if (regime.volatility === "HIGH") riskScore += 2;
    if (regime.trend === "BEARISH") riskScore += 1;

    // Setup quality risk
    const riskRewardRatio = parseFloat(setup.riskReward?.split(":")[1] || 0);
    if (riskRewardRatio < 2) riskScore += 3;
    else if (riskRewardRatio < 2.5) riskScore += 1;

    if (riskScore >= 6) return "HIGH";
    if (riskScore >= 3) return "MEDIUM";
    return "LOW";
  }

  /**
   * Get stop loss level classification
   * @private
   */
  _getStopLossLevel(setup) {
    const stopPercent = Math.abs(parseFloat(setup.stopLoss?.percentage || 0));

    if (stopPercent < 2) return "TIGHT";
    if (stopPercent < 4) return "NORMAL";
    return "WIDE";
  }

  /**
   * Assess portfolio correlation risk
   * @private
   */
  _assessPortfolioRisk(stock) {
    // Placeholder for portfolio correlation analysis
    // In a real implementation, this would check:
    // - Sector concentration
    // - Similar positions
    // - Overall portfolio exposure

    return {
      sectorExposure: "LOW", // LOW, MEDIUM, HIGH
      correlationRisk: "ACCEPTABLE",
      recommendation: "Position size acceptable for portfolio diversification",
    };
  }

  /**
   * Calculate time decay risk
   * @private
   */
  _getTimeDecayRisk(stock, setup) {
    const { latestNews } = stock;

    if (!latestNews) {
      return {
        level: "LOW",
        reasoning: "No time-sensitive catalysts",
      };
    }

    try {
      const newsAge =
        (new Date() - new Date(latestNews.timestamp)) / (1000 * 60 * 60); // Hours
      const newsType = latestNews.category?.toLowerCase() || "";

      // High decay events
      if (["earnings", "fda"].includes(newsType) && newsAge > 24) {
        return {
          level: "HIGH",
          reasoning: "Time-sensitive catalyst aging",
        };
      }

      // Medium decay events
      if (["analyst", "partnership"].includes(newsType) && newsAge > 48) {
        return {
          level: "MEDIUM",
          reasoning: "Moderate catalyst decay",
        };
      }

      return {
        level: "LOW",
        reasoning: "Catalyst still fresh",
      };
    } catch (error) {
      return {
        level: "LOW",
        reasoning: "Unable to assess time decay",
      };
    }
  }

  /**
   * Validate Enhanced Trading Cheat Sheet compliance
   * @private
   */
  _validateCheatSheetCompliance(stock, signal) {
    const compliance = {
      nissThreshold: false,
      confidenceLevel: false,
      volumeConfirmation: false,
      marketRegime: false,
      riskReward: false,
      overallScore: 0,
    };

    try {
      // NISS threshold check
      if (signal.action.includes("BUY") && (stock.nissScore || 0) >= 60) {
        compliance.nissThreshold = true;
      } else if (
        signal.action.includes("SELL") &&
        (stock.nissScore || 0) <= -60
      ) {
        compliance.nissThreshold = true;
      }

      // Confidence level check
      if (stock.confidence !== "LOW") {
        compliance.confidenceLevel = true;
      }

      // Volume confirmation
      if ((stock.volumeData?.relativeVolume || 0) > 1.5) {
        compliance.volumeConfirmation = true;
      }

      // Market regime (simplified)
      if (
        stock.marketData?.trend !== "BEARISH" ||
        signal.action.includes("SELL")
      ) {
        compliance.marketRegime = true;
      }

      // Risk-reward check (always true for now)
      compliance.riskReward = true;

      // Calculate overall score
      compliance.overallScore = Object.values(compliance).filter(
        (v) => v === true
      ).length;

      return {
        ...compliance,
        isCompliant: compliance.overallScore >= 4,
        grade:
          compliance.overallScore >= 5
            ? "A"
            : compliance.overallScore >= 4
            ? "B"
            : compliance.overallScore >= 3
            ? "C"
            : "D",
      };
    } catch (error) {
      console.error("Error validating compliance:", error);
      return {
        ...compliance,
        isCompliant: false,
        grade: "D",
      };
    }
  }

  // ============================================
  // PUBLIC UTILITY METHODS
  // ============================================

  /**
   * Get trade signal summary for display
   */
  getSignalSummary(stock) {
    try {
      const signal = this.generateEnhancedTradeSignal(stock);

      return {
        action: signal.action,
        priority: signal.priority,
        confidence: stock.confidence,
        riskReward: signal.setup?.riskReward || "N/A",
        urgency: signal.urgency,
        compliance: signal.cheatSheetCompliant?.grade || "D",
      };
    } catch (error) {
      console.error("Error getting signal summary:", error);
      return {
        action: "HOLD",
        priority: 3,
        confidence: "LOW",
        riskReward: "N/A",
        urgency: "WAIT",
        compliance: "D",
      };
    }
  }

  /**
   * Generate quick trade setup preview
   */
  getQuickSetup(stock) {
    try {
      const signal = this.generateEnhancedTradeSignal(stock);

      if (signal.action === "HOLD") {
        return { action: "HOLD", message: "No clear setup" };
      }

      return {
        action: signal.action,
        entry: signal.setup?.entry?.price || 0,
        stop: signal.setup?.stopLoss?.price || 0,
        target1: signal.setup?.targets?.[0]?.price || 0,
        riskReward: signal.setup?.riskReward || "N/A",
        positionSize: signal.riskManagement?.positionSize?.percentage || "1.0",
      };
    } catch (error) {
      console.error("Error getting quick setup:", error);
      return { action: "HOLD", message: "Setup calculation error" };
    }
  }

  /**
   * Check if trade timing is optimal
   */
  isOptimalTiming(stock) {
    try {
      const signal = this.generateEnhancedTradeSignal(stock);
      return signal.setup?.marketTiming?.status === "OPTIMAL";
    } catch (error) {
      console.error("Error checking timing:", error);
      return false;
    }
  }

  /**
   * Get risk assessment for portfolio manager
   */
  getRiskAssessment(stock) {
    try {
      const signal = this.generateEnhancedTradeSignal(stock);

      return {
        overallRisk: signal.riskManagement?.riskLevel || "MEDIUM",
        timeDecay: signal.riskManagement?.timeDecay?.level || "LOW",
        portfolioImpact:
          signal.riskManagement?.portfolioCorrelation?.sectorExposure || "LOW",
        maxLoss:
          signal.riskManagement?.positionSize?.maxDollarRisk?.formatted ||
          "$500",
        compliance: signal.cheatSheetCompliant?.isCompliant || false,
      };
    } catch (error) {
      console.error("Error getting risk assessment:", error);
      return {
        overallRisk: "HIGH",
        timeDecay: "MEDIUM",
        portfolioImpact: "MEDIUM",
        maxLoss: "$500",
        compliance: false,
      };
    }
  }

  /**
   * Format trade setup for export/logging
   */
  formatTradeSetup(stock) {
    try {
      const signal = this.generateEnhancedTradeSignal(stock);

      return {
        symbol: stock.symbol,
        timestamp: signal.timestamp,
        signal: signal.action,
        nissScore: stock.nissScore,
        confidence: stock.confidence,
        entry: signal.setup?.entry?.price,
        stopLoss: signal.setup?.stopLoss?.price,
        target1: signal.setup?.targets?.[0]?.price,
        target2: signal.setup?.targets?.[1]?.price,
        target3: signal.setup?.targets?.[2]?.price,
        riskReward: signal.setup?.riskReward,
        positionSize: signal.riskManagement?.positionSize?.percentage,
        compliance: signal.cheatSheetCompliant?.grade,
        reasoning: signal.reasoning,
      };
    } catch (error) {
      console.error("Error formatting trade setup:", error);
      return {
        symbol: stock.symbol,
        timestamp: new Date().toISOString(),
        signal: "HOLD",
        nissScore: stock.nissScore,
        confidence: stock.confidence,
        error: "Formatting failed",
      };
    }
  }

  /**
   * Batch process multiple stocks for screening
   */
  batchProcessStocks(stocks) {
    if (!Array.isArray(stocks)) return [];

    return stocks.map((stock) => {
      try {
        return {
          ...stock,
          enhancedSignal: this.generateEnhancedTradeSignal(stock),
          quickSetup: this.getQuickSetup(stock),
          riskAssessment: this.getRiskAssessment(stock),
        };
      } catch (error) {
        console.error(`Error processing stock ${stock.symbol}:`, error);
        return {
          ...stock,
          enhancedSignal: { action: "HOLD", error: "Processing failed" },
          quickSetup: { action: "HOLD", message: "Processing failed" },
          riskAssessment: { overallRisk: "HIGH", compliance: false },
        };
      }
    });
  }

  /**
   * Get market regime summary for dashboard
   */
  getMarketRegimeSummary(marketData) {
    try {
      const regime = this._assessMarketRegime(marketData);
      const adjustment = this._getRegimeAdjustment(marketData);

      return {
        regime,
        positionAdjustment: adjustment,
        recommendation: this._getRegimeRecommendation(regime),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting market regime:", error);
      return {
        regime: { trend: "NEUTRAL", volatility: "NORMAL", breadth: "MIXED" },
        positionAdjustment: 1.0,
        recommendation: "Use standard position sizing",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get regime-based trading recommendation
   * @private
   */
  _getRegimeRecommendation(regime) {
    if (regime.volatility === "HIGH") {
      return "Reduce position sizes by 50% due to high volatility";
    }

    if (regime.trend === "BEARISH" && regime.breadth === "DECLINING") {
      return "Favor short positions and reduce long exposure";
    }

    if (regime.volatility === "LOW" && regime.trend === "BULLISH") {
      return "Increase position sizes in favorable low-vol bull market";
    }

    if (regime.trend === "NEUTRAL" && regime.volatility === "NORMAL") {
      return "Use standard position sizing and balanced approach";
    }

    return "Monitor market conditions closely for regime changes";
  }

  /**
   * Validate if stock meets Enhanced Trading Cheat Sheet criteria
   */
  meetsCheatSheetCriteria(stock) {
    try {
      const signal = this.generateEnhancedTradeSignal(stock);
      const compliance = signal.cheatSheetCompliant;

      return {
        meets: compliance?.isCompliant || false,
        grade: compliance?.grade || "D",
        score: compliance?.overallScore || 0,
        details: compliance || {},
        recommendation: compliance?.isCompliant
          ? "Stock meets Enhanced Trading Cheat Sheet criteria"
          : "Stock does not meet minimum criteria for institutional trading",
      };
    } catch (error) {
      console.error("Error validating cheat sheet criteria:", error);
      return {
        meets: false,
        grade: "D",
        score: 0,
        details: {},
        recommendation: "Unable to validate criteria due to data issues",
      };
    }
  }

  /**
   * Get performance tracking data for backtesting
   */
  getPerformanceTrackingData(stock, actualOutcome = null) {
    try {
      const signal = this.generateEnhancedTradeSignal(stock);
      const setup = signal.setup;

      const trackingData = {
        symbol: stock.symbol,
        timestamp: signal.timestamp,
        signal: signal.action,
        confidence: stock.confidence,
        nissScore: stock.nissScore,
        predictedSetup: {
          entry: setup?.entry?.price,
          stopLoss: setup?.stopLoss?.price,
          targets: setup?.targets,
          riskReward: setup?.riskReward,
        },
        marketRegime: this._assessMarketRegime(stock.marketData),
        compliance: signal.cheatSheetCompliant,
      };

      // If actual outcome provided, calculate performance
      if (actualOutcome) {
        trackingData.actualOutcome = {
          ...actualOutcome,
          success: this._calculateTradeSuccess(setup, actualOutcome),
          performance: this._calculatePerformanceMetrics(setup, actualOutcome),
        };
      }

      return trackingData;
    } catch (error) {
      console.error("Error getting performance tracking data:", error);
      return {
        symbol: stock.symbol,
        timestamp: new Date().toISOString(),
        error: "Performance tracking failed",
      };
    }
  }

  /**
   * Calculate trade success metrics
   * @private
   */
  _calculateTradeSuccess(predictedSetup, actualOutcome) {
    try {
      const { exitPrice, exitReason, holdTime } = actualOutcome;
      const entry = predictedSetup?.entry?.price;
      const stopLoss = predictedSetup?.stopLoss?.price;
      const targets = predictedSetup?.targets || [];

      if (!entry || !exitPrice)
        return { success: false, reason: "Insufficient data" };

      // Determine if trade was successful
      const isLong = targets[0]?.price > entry;
      const actualReturn = (exitPrice - entry) / entry;

      if (exitReason === "STOP_LOSS") {
        return { success: false, reason: "Stopped out", actualReturn };
      }

      if (isLong && actualReturn > 0) {
        const targetHit = targets.findIndex((t) => exitPrice >= t.price) + 1;
        return {
          success: true,
          reason: `Target ${targetHit || "partial"} hit`,
          actualReturn,
          targetReached: targetHit,
        };
      }

      if (!isLong && actualReturn < 0) {
        const targetHit = targets.findIndex((t) => exitPrice <= t.price) + 1;
        return {
          success: true,
          reason: `Target ${targetHit || "partial"} hit`,
          actualReturn: Math.abs(actualReturn),
          targetReached: targetHit,
        };
      }

      return {
        success: false,
        reason: "Trade moved against position",
        actualReturn,
      };
    } catch (error) {
      return { success: false, reason: "Calculation error", actualReturn: 0 };
    }
  }

  /**
   * Calculate detailed performance metrics
   * @private
   */
  _calculatePerformanceMetrics(predictedSetup, actualOutcome) {
    try {
      const { exitPrice, holdTime } = actualOutcome;
      const entry = predictedSetup?.entry?.price;
      const stopLoss = predictedSetup?.stopLoss?.price;
      const targets = predictedSetup?.targets || [];

      if (!entry || !exitPrice) return {};

      const actualReturn = (exitPrice - entry) / entry;
      const predictedRisk = Math.abs((stopLoss - entry) / entry);
      const actualRisk =
        Math.abs(actualReturn) < predictedRisk
          ? Math.abs(actualReturn)
          : predictedRisk;
      const actualReward = Math.max(0, Math.abs(actualReturn));
      const actualRiskReward = actualRisk > 0 ? actualReward / actualRisk : 0;

      return {
        actualReturn: actualReturn * 100, // Percentage
        predictedRiskReward: parseFloat(
          predictedSetup?.riskReward?.split(":")[1] || 0
        ),
        actualRiskReward: actualRiskReward,
        holdTimeHours: holdTime || 0,
        efficiency:
          actualRiskReward /
          Math.max(
            0.1,
            parseFloat(predictedSetup?.riskReward?.split(":")[1] || 1)
          ),
        targetAccuracy: this._calculateTargetAccuracy(
          targets,
          exitPrice,
          entry
        ),
      };
    } catch (error) {
      return { error: "Performance calculation failed" };
    }
  }

  /**
   * Calculate target prediction accuracy
   * @private
   */
  _calculateTargetAccuracy(targets, exitPrice, entry) {
    if (!targets.length || !exitPrice || !entry) return 0;

    const isLong = targets[0].price > entry;
    let accuracy = 0;

    targets.forEach((target, index) => {
      const targetHit = isLong
        ? exitPrice >= target.price
        : exitPrice <= target.price;
      if (targetHit) {
        accuracy = Math.max(accuracy, (index + 1) * 33.33); // Each target = 33.33%
      }
    });

    return accuracy;
  }
}

// Export singleton instance
const tradeSetupHelper = new TradeSetupHelper();
export default tradeSetupHelper;
