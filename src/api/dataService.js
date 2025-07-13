import { API_CONFIG } from "./config";

class DataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute
  }

  async fetchWithCache(url, cacheKey, headers = {}) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(url, { headers });
      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error(`Error fetching ${cacheKey}:`, error);
      throw error;
    }
  }

  async getQuote(symbol) {
    try {
      const url = `${API_CONFIG.finnhub.baseUrl}/quote?symbol=${symbol}&token=${API_CONFIG.finnhub.key}`;
      const data = await this.fetchWithCache(url, `quote_${symbol}`);

      return {
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc,
      };
    } catch (error) {
      console.error("Quote error:", error);
      return null;
    }
  }

  async getNews(symbol) {
    try {
      const url = `${
        API_CONFIG.finnhub.baseUrl
      }/company-news?symbol=${symbol}&from=${
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
      }&to=${new Date().toISOString().split("T")[0]}&token=${
        API_CONFIG.finnhub.key
      }`;
      const news = await this.fetchWithCache(url, `news_${symbol}`);

      return news.slice(0, 5).map((article) => ({
        headline: article.headline,
        summary: article.summary,
        datetime: article.datetime,
        source: article.source,
        sentiment: this.analyzeSentiment(
          article.headline + " " + article.summary
        ),
      }));
    } catch (error) {
      console.error("News error:", error);
      return [];
    }
  }

  analyzeSentiment(text) {
    const positiveWords = [
      "beat",
      "exceed",
      "positive",
      "growth",
      "approval",
      "success",
      "breakthrough",
      "upgrade",
      "strong",
      "gain",
      "profit",
      "up",
      "surge",
    ];
    const negativeWords = [
      "miss",
      "decline",
      "negative",
      "fail",
      "reject",
      "delay",
      "concern",
      "downgrade",
      "weak",
      "loss",
      "down",
      "plunge",
      "drop",
    ];

    const textLower = text.toLowerCase();
    const positiveCount = positiveWords.filter((word) =>
      textLower.includes(word)
    ).length;
    const negativeCount = negativeWords.filter((word) =>
      textLower.includes(word)
    ).length;

    if (positiveCount + negativeCount === 0) return 0;
    return (positiveCount - negativeCount) / (positiveCount + negativeCount);
  }

  calculateNISS(quote, news) {
    if (!quote) return 0;

    const priceChange = Math.abs(quote.changePercent);
    const newsCount = news.length;
    const recentNews = news.filter(
      (n) => Date.now() - n.datetime * 1000 < 86400000
    ).length;
    const avgSentiment =
      news.length > 0
        ? news.reduce((sum, article) => sum + article.sentiment, 0) /
          news.length
        : 0;

    // Enhanced NISS calculation
    const priceScore = priceChange * 10;
    const newsScore = newsCount * 5;
    const recencyScore = recentNews * 10;
    const sentimentScore = avgSentiment * 50;

    return Math.round(priceScore + newsScore + recencyScore + sentimentScore);
  }

  async getStockData(symbol) {
    const [quote, news] = await Promise.all([
      this.getQuote(symbol),
      this.getNews(symbol),
    ]);

    const nissScore = this.calculateNISS(quote, news);

    return {
      symbol,
      quote,
      news,
      nissScore,
    };
  }
}

export default new DataService();