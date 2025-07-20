// src/utils/calculations.js - Clean version without duplicates

// ENHANCED: Better signal determination that handles negative NISS scores properly
export const determineSignal = (nissScore, changePercent) => {
  // Strong Buy Signals
  if (nissScore > 75 && changePercent > 2) 
    return { signal: 'STRONG BUY', confidence: 'HIGH' };
  if (nissScore > 75 && changePercent > 0) 
    return { signal: 'STRONG BUY', confidence: 'MEDIUM' };
  if (nissScore > 60 && changePercent > 1) 
    return { signal: 'BUY', confidence: 'HIGH' };
  if (nissScore > 50 && changePercent > 0) 
    return { signal: 'BUY', confidence: 'MEDIUM' };
  
  // Strong Sell Signals  
  if (nissScore < -75 && changePercent < -2) 
    return { signal: 'STRONG SELL', confidence: 'HIGH' };
  if (nissScore < -75 && changePercent < 0) 
    return { signal: 'STRONG SELL', confidence: 'MEDIUM' };
  if (nissScore < -60 && changePercent < -1) 
    return { signal: 'SELL', confidence: 'HIGH' };
  if (nissScore < -50 && changePercent < 0) 
    return { signal: 'SELL', confidence: 'MEDIUM' };
  
  // Edge cases - conflicting signals
  if (nissScore > 50 && changePercent < -2) 
    return { signal: 'HOLD - MIXED SIGNALS', confidence: 'LOW' };
  if (nissScore < -50 && changePercent > 2) 
    return { signal: 'HOLD - MIXED SIGNALS', confidence: 'LOW' };
  
  // Default hold
  return { signal: 'HOLD', confidence: 'LOW' };
};

// Enhanced signal scoring system
export const calculateSignalStrength = (nissScore, changePercent, volume, avgVolume) => {
  let strength = 0;
  
  // NISS contribution (50% weight)
  const nissWeight = Math.min(Math.abs(nissScore) / 100, 1) * 50;
  strength += nissWeight;
  
  // Price movement contribution (30% weight)  
  const priceWeight = Math.min(Math.abs(changePercent) / 10, 1) * 30;
  strength += priceWeight;
  
  // Volume contribution (20% weight)
  if (volume && avgVolume) {
    const volumeRatio = volume / avgVolume;
    const volumeWeight = Math.min(volumeRatio / 2, 1) * 20;
    strength += volumeWeight;
  }
  
  return Math.round(strength);
};

// Risk-adjusted position sizing
export const calculatePositionSize = (accountSize, riskPerTrade, stopLossPercent) => {
  const riskAmount = accountSize * (riskPerTrade / 100);
  const sharesPerDollar = 1 / (stopLossPercent / 100);
  return Math.floor(riskAmount * sharesPerDollar);
};

// Enhanced stop loss calculation
export const calculateDynamicStopLoss = (currentPrice, volatility, signal, confidence) => {
  let baseStopPercent = 0.05; // 5% base
  
  // Adjust for volatility
  if (volatility === 'High') baseStopPercent = 0.08;
  if (volatility === 'Low') baseStopPercent = 0.03;
  
  // Adjust for confidence
  if (confidence === 'HIGH') baseStopPercent *= 0.8;
  if (confidence === 'LOW') baseStopPercent *= 1.2;
  
  // Calculate stop price
  if (signal.includes('BUY')) {
    return currentPrice * (1 - baseStopPercent);
  } else if (signal.includes('SELL')) {
    return currentPrice * (1 + baseStopPercent);
  }
  
  return currentPrice;
};

// Main price target calculation function
export const calculatePriceTargets = (currentPrice, signal, nissScore, volatility) => {
  const targets = [];
  
  if (signal.includes('BUY')) {
    // Bullish targets
    const multiplier = Math.min(Math.abs(nissScore) / 50, 2);
    targets.push({
      level: 1,
      price: currentPrice * (1 + 0.05 * multiplier),
      probability: 0.7
    });
    targets.push({
      level: 2, 
      price: currentPrice * (1 + 0.10 * multiplier),
      probability: 0.5
    });
    targets.push({
      level: 3,
      price: currentPrice * (1 + 0.15 * multiplier), 
      probability: 0.3
    });
  } else if (signal.includes('SELL')) {
    // Bearish targets
    const multiplier = Math.min(Math.abs(nissScore) / 50, 2);
    targets.push({
      level: 1,
      price: currentPrice * (1 - 0.05 * multiplier),
      probability: 0.7
    });
    targets.push({
      level: 2,
      price: currentPrice * (1 - 0.10 * multiplier), 
      probability: 0.5
    });
    targets.push({
      level: 3,
      price: currentPrice * (1 - 0.15 * multiplier),
      probability: 0.3
    });
  }
  
  return targets;
};

// Legacy function for backward compatibility
export const calculateLegacyPriceTargets = (currentPrice, expectedImpact) => {
  const { min, max } = expectedImpact;
  return {
    downside: currentPrice * (1 + min / 100),
    upside: currentPrice * (1 + max / 100),
    riskRewardRatio: Math.abs(max / min)
  };
};

export const getTimeframe = (eventType) => {
  const timeframes = {
    'earnings': '1-2 days',
    'fda': '1-3 days',
    'clinical': '1-5 days',
    'partnership': '1 day',
    'executive': '2-5 days',
    'analyst': '1-2 days',
    'acquisition': '1-3 days',
    'lawsuit': '2-7 days'
  };
  return timeframes[eventType] || '1-3 days';
};

// Market condition adjustment
export const adjustForMarketConditions = (signal, marketTrend, vixLevel) => {
  let adjustedSignal = { ...signal };
  
  // High VIX (fear) - reduce confidence
  if (vixLevel > 30) {
    if (adjustedSignal.confidence === 'HIGH') adjustedSignal.confidence = 'MEDIUM';
    if (adjustedSignal.confidence === 'MEDIUM') adjustedSignal.confidence = 'LOW';
  }
  
  // Bear market conditions
  if (marketTrend === 'BEARISH') {
    if (signal.signal.includes('BUY')) {
      adjustedSignal.confidence = 'LOW';
      adjustedSignal.signal = 'HOLD - BEAR MARKET';
    }
  }
  
  // Bull market conditions  
  if (marketTrend === 'BULLISH') {
    if (signal.signal.includes('SELL')) {
      adjustedSignal.confidence = 'LOW';
      adjustedSignal.signal = 'HOLD - BULL MARKET';
    }
  }
  
  return adjustedSignal;
};

// Generate comprehensive trade setup
export const generateTradeSetup = (stockData, signal) => {
  const { symbol, quote, nissScore, news } = stockData;
  const currentPrice = quote?.price || 0;
  const volatility = calculateVolatility(quote);
  
  const setup = {
    symbol,
    currentPrice,
    signal: signal.signal,
    confidence: signal.confidence,
    nissScore,
    entry: {
      price: currentPrice,
      reasoning: getEntryReasoning(signal, news[0])
    },
    stopLoss: {
      price: calculateDynamicStopLoss(currentPrice, volatility, signal.signal, signal.confidence),
      reasoning: `${volatility} volatility adjusted stop`
    },
    targets: calculatePriceTargets(currentPrice, signal.signal, nissScore, volatility),
    timeframe: getTimeframe(getNewsCategory(news[0])),
    riskReward: 0,
    catalysts: news.slice(0, 3).map(n => ({
      headline: n.headline,
      source: n.source,
      sentiment: n.sentiment
    }))
  };
  
  // Calculate risk/reward
  if (setup.targets.length > 0) {
    const firstTarget = setup.targets[0].price;
    const risk = Math.abs(currentPrice - setup.stopLoss.price);
    const reward = Math.abs(firstTarget - currentPrice);
    setup.riskReward = reward / risk;
  }
  
  return setup;
};

const calculateVolatility = (quote) => {
  if (!quote) return "Medium";
  const dayRange = ((quote.high - quote.low) / quote.price) * 100;
  if (dayRange > 5) return "High";
  if (dayRange > 2) return "Medium";
  return "Low";
};

const getEntryReasoning = (signal, topNews) => {
  const reasons = [];
  
  if (signal.signal.includes('BUY')) {
    reasons.push("Positive NISS score indicates bullish sentiment");
    if (topNews && topNews.sentiment > 0.3) {
      reasons.push("Strong positive news catalyst");
    }
  } else if (signal.signal.includes('SELL')) {
    reasons.push("Negative NISS score indicates bearish sentiment");
    if (topNews && topNews.sentiment < -0.3) {
      reasons.push("Strong negative news catalyst");
    }
  }
  
  return reasons.join(". ");
};

const getNewsCategory = (news) => {
  if (!news) return 'general';
  
  const headline = news.headline.toLowerCase();
  if (headline.includes('earnings') || headline.includes('revenue')) return 'earnings';
  if (headline.includes('fda') || headline.includes('approval')) return 'fda';
  if (headline.includes('clinical') || headline.includes('trial')) return 'clinical';
  if (headline.includes('partnership') || headline.includes('deal')) return 'partnership';
  if (headline.includes('ceo') || headline.includes('executive')) return 'executive';
  if (headline.includes('analyst') || headline.includes('rating')) return 'analyst';
  if (headline.includes('acquisition') || headline.includes('merger')) return 'acquisition';
  if (headline.includes('lawsuit') || headline.includes('legal')) return 'lawsuit';
  
  return 'general';
};