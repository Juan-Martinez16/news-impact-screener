// src/api/config.js
// Enhanced configuration with backend integration

// Helper functions
const getToday = () => new Date().toISOString().split("T")[0];
const getLastWeek = () => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split("T")[0];
};

export const API_CONFIG = {
  // Backend Configuration (PRIMARY) - Using Render deployment
  backend: {
    baseUrl:
      process.env.REACT_APP_BACKEND_URL ||
      "https://news-impact-screener-backend.onrender.com",
    endpoints: {
      health: () => "/health",
      quote: (symbol) => `/api/quote/${symbol}`,
      news: (symbol) => `/api/news/${symbol}`,
      technicals: (symbol) => `/api/technicals/${symbol}`,
      options: (symbol) => `/api/options/${symbol}`,
      batchQuotes: () => "/api/batch/quotes",
      screening: () => "/api/screening",
    },
  },

  // Direct API Configuration (FALLBACK ONLY - backend handles keys)
  alphaVantage: {
    key: null, // Backend handles this
    baseUrl: "https://www.alphavantage.co/query",
    endpoints: {
      quote: (symbol) => `function=GLOBAL_QUOTE&symbol=${symbol}`,
      indicators: (symbol) =>
        `function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close`,
    },
  },

  finnhub: {
    key: null, // Backend handles this
    baseUrl: "https://finnhub.io/api/v1",
    endpoints: {
      quote: (symbol) => `/quote?symbol=${symbol}`,
      news: (symbol) =>
        `/company-news?symbol=${symbol}&from=${getLastWeek()}&to=${getToday()}`,
    },
  },

  polygon: {
    key: null, // Backend handles this
    baseUrl: "https://api.polygon.io/v2",
    endpoints: {
      quote: (symbol) => `/aggs/ticker/${symbol}/prev`,
      news: (symbol) => `/reference/news?ticker=${symbol}&limit=10`,
    },
  },

  yahooFinance: {
    headers: {
      "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
      "x-rapidapi-key": null, // Backend handles this
    },
    baseUrl: "https://apidojo-yahoo-finance-v1.p.rapidapi.com",
    endpoints: {
      quote: (symbol) => `/stock/v3/get-summary?symbol=${symbol}&region=US`,
    },
  },
};

// Backend API helper function
export const makeBackendApiCall = async (endpoint, options = {}) => {
  const url = `${API_CONFIG.backend.baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(
        `Backend API call failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Backend API call failed for ${endpoint}:`, error);
    throw error;
  }
};

// Health check helper
export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${API_CONFIG.backend.baseUrl}/health`, {
      method: "GET",
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    console.error("Backend health check failed:", error);
    return false;
  }
};
