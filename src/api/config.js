// Helper functions
const getToday = () => new Date().toISOString().split("T")[0];
const getLastWeek = () => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split("T")[0];
};

export const API_CONFIG = {
  // Alpha Vantage
  alphaVantage: {
    key: process.env.REACT_APP_ALPHA_VANTAGE_KEY,
    baseUrl: "https://www.alphavantage.co/query",
    endpoints: {
      quote: (symbol) => `function=GLOBAL_QUOTE&symbol=${symbol}`,
      indicators: (symbol) =>
        `function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close`,
    },
  },

  // Finnhub
  finnhub: {
    key: process.env.REACT_APP_FINNHUB_KEY,
    baseUrl: "https://finnhub.io/api/v1",
    endpoints: {
      quote: (symbol) => `/quote?symbol=${symbol}`,
      news: (symbol) =>
        `/company-news?symbol=${symbol}&from=${getLastWeek()}&to=${getToday()}`,
    },
  },

  // Yahoo Finance
  yahooFinance: {
    headers: {
      "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
      "x-rapidapi-key": process.env.REACT_APP_RAPIDAPI_KEY,
    },
    baseUrl: "https://apidojo-yahoo-finance-v1.p.rapidapi.com",
    endpoints: {
      quote: (symbol) => `/stock/v3/get-summary?symbol=${symbol}&region=US`,
    },
  },
};
