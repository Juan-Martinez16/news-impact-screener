// src/utils/DataNormalizer.js
// Data normalization utilities for consistent data handling across the application

import _ from "lodash";

class DataNormalizer {
  constructor() {
    this.dataVersion = "1.0.0";
    console.log("📊 DataNormalizer initialized");
  }

  // ============================================
  // STOCK DATA NORMALIZATION
  // ============================================

  normalizeStockQuote(rawQuote) {
    try {
      if (!rawQuote) {
        throw new Error("No quote data provided");
      }

      // Handle different API response formats
      const normalized = {
        symbol: this.extractSymbol(rawQuote),
        price: this.extractPrice(rawQuote),
        changePercent: this.extractChangePercent(rawQuote),
        change: this.extractChange(rawQuote),
        volume: this.extractVolume(rawQuote),
        avgVolume: this.extractAvgVolume(rawQuote),
        marketCap: this.extractMarketCap(rawQuote),
        high52Week: this.extractHigh52Week(rawQuote),
        low52Week: this.extractLow52Week(rawQuote),
        sector: this.extractSector(rawQuote),
        previousClose: this.extractPreviousClose(rawQuote),
        open: this.extractOpen(rawQuote),
        high: this.extractHigh(rawQuote),
        low: this.extractLow(rawQuote),
        timestamp: new Date().toISOString(),
        dataSource: rawQuote.dataSource || "API",
      };

      // Validate essential fields
      this.validateQuoteData(normalized);

      return normalized;
    } catch (error) {
      console.error("Quote normalization error:", error);
      return this.generateFallbackQuote(rawQuote);
    }
  }

  normalizeNewsData(rawNews) {
    try {
      if (!Array.isArray(rawNews)) {
        rawNews = [rawNews];
      }

      return rawNews
        .filter((item) => item && (item.headline || item.title))
        .map((item) => ({
          headline: item.headline || item.title || "",
          summary: item.summary || item.description || "",
          source: item.source || item.publisher || "Unknown",
          datetime: this.extractDatetime(item),
          url: item.url || item.link || "",
          sentiment: this.extractSentiment(item),
          relevanceScore: item.relevanceScore || 50,
          category: item.category || "general",
          timestamp: new Date().toISOString(),
        }))
        .sort((a, b) => new Date(b.datetime) - new Date(a.datetime)); // Sort by newest first
    } catch (error) {
      console.error("News normalization error:", error);
      return [];
    }
  }

  normalizeTechnicalData(rawTechnical) {
    try {
      if (!rawTechnical) {
        return this.generateDefaultTechnicals();
      }

      return {
        rsi: this.extractNumericValue(rawTechnical.rsi, 50, 0, 100),
        macd: this.extractNumericValue(rawTechnical.macd, 0),
        macdSignal: this.extractNumericValue(rawTechnical.macdSignal, 0),
        macdHistogram: this.extractNumericValue(rawTechnical.macdHistogram, 0),
        sma20: this.extractNumericValue(rawTechnical.sma20, null),
        sma50: this.extractNumericValue(rawTechnical.sma50, null),
        sma200: this.extractNumericValue(rawTechnical.sma200, null),
        bollinger: {
          upper: this.extractNumericValue(
            rawTechnical.bollingerUpper || rawTechnical.bollinger?.upper,
            null
          ),
          middle: this.extractNumericValue(
            rawTechnical.bollingerMiddle || rawTechnical.bollinger?.middle,
            null
          ),
          lower: this.extractNumericValue(
            rawTechnical.bollingerLower || rawTechnical.bollinger?.lower,
            null
          ),
        },
        adx: this.extractNumericValue(rawTechnical.adx, 25, 0, 100),
        atr: this.extractNumericValue(rawTechnical.atr, null),
        stochastic: this.extractNumericValue(
          rawTechnical.stochastic,
          50,
          0,
          100
        ),
        momentum: this.extractNumericValue(rawTechnical.momentum, 50),
        williamsR: this.extractNumericValue(
          rawTechnical.williamsR,
          -50,
          -100,
          0
        ),
        timestamp: new Date().toISOString(),
        dataSource: rawTechnical.dataSource || "API",
      };
    } catch (error) {
      console.error("Technical data normalization error:", error);
      return this.generateDefaultTechnicals();
    }
  }

  normalizeOptionsData(rawOptions) {
    try {
      if (!rawOptions) {
        return this.generateDefaultOptions();
      }

      return {
        putCallRatio: this.extractNumericValue(
          rawOptions.putCallRatio,
          1,
          0,
          10
        ),
        callVolume: this.extractNumericValue(rawOptions.callVolume, 0, 0),
        putVolume: this.extractNumericValue(rawOptions.putVolume, 0, 0),
        callOI: this.extractNumericValue(
          rawOptions.callOpenInterest || rawOptions.callOI,
          0,
          0
        ),
        putOI: this.extractNumericValue(
          rawOptions.putOpenInterest || rawOptions.putOI,
          0,
          0
        ),
        unusualActivity: Boolean(rawOptions.unusualActivity),
        impliedVolatility: this.extractNumericValue(
          rawOptions.impliedVolatility,
          0.3,
          0,
          5
        ),
        timestamp: new Date().toISOString(),
        dataSource: rawOptions.dataSource || "API",
      };
    } catch (error) {
      console.error("Options data normalization error:", error);
      return this.generateDefaultOptions();
    }
  }

  // ============================================
  // DATA EXTRACTION HELPERS
  // ============================================

  extractSymbol(data) {
    return (
      data.symbol || data.ticker || data.Symbol || data.Ticker || "UNKNOWN"
    );
  }

  extractPrice(data) {
    const price =
      data.price ||
      data.currentPrice ||
      data.c ||
      data.close ||
      data.regularMarketPrice ||
      data.Price ||
      0;
    return this.extractNumericValue(price, 0, 0);
  }

  extractChangePercent(data) {
    const change =
      data.changePercent ||
      data.changesPercentage ||
      data.dp ||
      data.regularMarketChangePercent ||
      data.ChangePercent ||
      0;
    return this.extractNumericValue(change, 0);
  }

  extractVolume(data) {
    const volume =
      data.volume || data.v || data.regularMarketVolume || data.Volume || 0;
    return parseInt(volume) || 0;
  }

  extractMarketCap(data) {
    const marketCap =
      data.marketCap || data.marketCapitalization || data.mktCap || 0;
    return parseInt(marketCap) || 0;
  }

  extractDatetime(data) {
    const datetime =
      data.datetime ||
      data.publishedAt ||
      data.date ||
      data.time ||
      data.timestamp ||
      new Date().toISOString();

    // Handle various datetime formats
    if (typeof datetime === "number") {
      return new Date(datetime * 1000).toISOString(); // Unix timestamp
    }

    try {
      return new Date(datetime).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  extractSentiment(data) {
    const sentiment = data.sentiment || data.sentimentScore || 0;
    return this.extractNumericValue(sentiment, 0, -1, 1);
  }

  extractNumericValue(value, defaultValue = 0, min = null, max = null) {
    try {
      let numValue = parseFloat(value);

      if (isNaN(numValue)) {
        return defaultValue;
      }

      if (min !== null && numValue < min) {
        return min;
      }

      if (max !== null && numValue > max) {
        return max;
      }

      return numValue;
    } catch {
      return defaultValue;
    }
  }

  // ============================================
  // VALIDATION METHODS
  // ============================================

  validateQuoteData(quote) {
    const required = ["symbol", "price"];
    const missing = required.filter(
      (field) => !quote[field] || quote[field] === 0
    );

    if (missing.length > 0) {
      throw new Error(`Invalid quote data: missing ${missing.join(", ")}`);
    }

    if (quote.price <= 0) {
      throw new Error(`Invalid price: ${quote.price}`);
    }

    return true;
  }

  // ============================================
  // FALLBACK DATA GENERATORS
  // ============================================
  generateFallbackQuote(rawQuote) {
    const symbol = this.extractSymbol(rawQuote) || "UNKNOWN";
    const basePrice = 50 + Math.random() * 200; // $50-$250 range

    return {
      symbol,
      price: parseFloat(basePrice.toFixed(2)),
      changePercent: (Math.random() - 0.5) * 10, // -5% to +5%
      change: 0,
      volume: Math.floor(100000 + Math.random() * 1000000),
      avgVolume: Math.floor(80000 + Math.random() * 800000),
      marketCap: Math.floor(basePrice * 10000000),
      high52Week: basePrice * (1.2 + Math.random() * 0.8),
      low52Week: basePrice * (0.4 + Math.random() * 0.4),
      sector: "Technology",
      previousClose: basePrice * (0.98 + Math.random() * 0.04),
      open: basePrice * (0.99 + Math.random() * 0.02),
      high: basePrice * (1.0 + Math.random() * 0.03),
      low: basePrice * (0.97 + Math.random() * 0.02),
      timestamp: new Date().toISOString(),
      dataSource: "Fallback",
    };
  }

  generateDefaultTechnicals() {
    return {
      rsi: 45 + Math.random() * 10,
      macd: (Math.random() - 0.5) * 2,
      macdSignal: (Math.random() - 0.5) * 1.5,
      macdHistogram: (Math.random() - 0.5) * 0.5,
      sma20: null,
      sma50: null,
      sma200: null,
      bollinger: { upper: null, middle: null, lower: null },
      adx: 20 + Math.random() * 30,
      atr: null,
      stochastic: 40 + Math.random() * 20,
      momentum: 45 + Math.random() * 10,
      williamsR: -60 + Math.random() * 20,
      timestamp: new Date().toISOString(),
      dataSource: "Default",
    };
  }

  generateDefaultOptions() {
    return {
      putCallRatio: 0.8 + Math.random() * 0.6,
      callVolume: Math.floor(Math.random() * 10000),
      putVolume: Math.floor(Math.random() * 8000),
      callOI: Math.floor(Math.random() * 50000),
      putOI: Math.floor(Math.random() * 40000),
      unusualActivity: Math.random() < 0.1,
      impliedVolatility: 0.2 + Math.random() * 0.4,
      timestamp: new Date().toISOString(),
      dataSource: "Default",
    };
  }
}

// ✅ CORRECTED EXPORTS - Only one export pattern
// Create singleton instance
// ✅ ONLY these lines at the end:
const dataNormalizer = new DataNormalizer();
export default dataNormalizer;
