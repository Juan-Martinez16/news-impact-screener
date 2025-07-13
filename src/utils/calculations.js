export const calculatePriceTargets = (currentPrice, expectedImpact) => {
  const { min, max } = expectedImpact;
  return {
    downside: currentPrice * (1 + min / 100),
    upside: currentPrice * (1 + max / 100),
    riskRewardRatio: Math.abs(max / min)
  };
};

export const determineSignal = (nissScore, changePercent) => {
  if (nissScore > 75 && changePercent > 0) return { signal: 'STRONG BUY', confidence: 'HIGH' };
  if (nissScore > 60 && changePercent > 0) return { signal: 'BUY', confidence: 'MEDIUM' };
  if (nissScore < -60 && changePercent < 0) return { signal: 'SELL', confidence: 'MEDIUM' };
  if (nissScore < -75 && changePercent < 0) return { signal: 'STRONG SELL', confidence: 'HIGH' };
  return { signal: 'HOLD', confidence: 'LOW' };
};

export const getTimeframe = (eventType) => {
  const timeframes = {
    'earnings': '1-2 days',
    'fda': '1-3 days',
    'clinical': '1-5 days',
    'partnership': '1 day',
    'executive': '2-5 days'
  };
  return timeframes[eventType] || '1-3 days';
};