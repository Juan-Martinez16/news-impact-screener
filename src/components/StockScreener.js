// src/components/StockScreener.js
// Updated to use InstitutionalDataService

import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, AlertCircle, Clock } from "lucide-react";
import InstitutionalDataService from "../api/InstitutionalDataService";

const StockScreener = () => {
  const [stocks, setStocks] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const watchlist = ["AAPL", "MSFT", "GOOGL", "TSLA", "NVDA"];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadStockData();
    const interval = setInterval(loadStockData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const loadStockData = async () => {
    setLoading(true);
    try {
      // Use InstitutionalDataService methods instead of DataService
      const promises = watchlist.map((symbol) =>
        InstitutionalDataService.getStockData(symbol)
      );
      const results = await Promise.all(promises);

      const stockData = {};
      results.forEach((result) => {
        if (result && result.quote) {
          stockData[result.symbol] = result;
        }
      });

      setStocks(stockData);
    } catch (error) {
      console.error("Error loading stocks:", error);
    }
    setLoading(false);
  };

  const londonTime = currentTime.toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const getSignal = (nissScore, changePercent) => {
    if (Math.abs(nissScore) < 30) return { signal: "HOLD", color: "gray" };

    if (nissScore > 60) {
      return {
        signal: changePercent > 0 ? "STRONG BUY" : "BUY",
        color: "green",
      };
    } else if (nissScore < -60) {
      return {
        signal: changePercent < 0 ? "STRONG SELL" : "SELL",
        color: "red",
      };
    } else if (nissScore > 30) {
      return { signal: "BUY", color: "green" };
    } else if (nissScore < -30) {
      return { signal: "SELL", color: "red" };
    }

    return { signal: "HOLD", color: "gray" };
  };

  const getSignalIcon = (signal) => {
    switch (signal) {
      case "STRONG BUY":
      case "BUY":
        return <TrendingUp className="h-4 w-4" />;
      case "STRONG SELL":
      case "SELL":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading stock screener...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Stock Screener
              </h1>
              <p className="text-gray-600">
                Real-time analysis of {watchlist.length} tracked stocks
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <Clock className="inline h-4 w-4 mr-1" />
                London: {londonTime}
              </div>
              <button
                onClick={loadStockData}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={loading}
              >
                <RefreshCw
                  className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {watchlist.map((symbol) => {
            const stock = stocks[symbol];
            if (!stock) {
              return (
                <div key={symbol} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <RefreshCw className="h-5 w-5 animate-spin text-gray-400 mr-3" />
                    <span className="text-gray-600">Loading {symbol}...</span>
                  </div>
                </div>
              );
            }

            const signal = getSignal(
              stock.nissScore,
              stock.quote.changePercent
            );

            return (
              <div key={symbol} className="bg-white rounded-lg shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-bold text-gray-900">
                        {symbol}
                      </h3>
                      <span
                        className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
                          signal.color === "green"
                            ? "bg-green-100 text-green-800"
                            : signal.color === "red"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {getSignalIcon(signal.signal)}
                        <span>{signal.signal}</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        ${stock.quote.price.toFixed(2)}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          stock.quote.changePercent > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {stock.quote.changePercent > 0 ? "+" : ""}
                        {stock.quote.changePercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">NISS Score</p>
                      <p
                        className={`text-lg font-bold ${
                          stock.nissScore > 50
                            ? "text-green-600"
                            : stock.nissScore < -50
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {stock.nissScore.toFixed(0)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Volume</p>
                      <p className="text-lg font-bold text-gray-900">
                        {stock.quote.volume?.toLocaleString() || "N/A"}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">News Items</p>
                      <p className="text-lg font-bold text-blue-600">
                        {stock.news?.length || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Last Update</p>
                      <p className="text-sm text-gray-900">
                        {stock.quote.timestamp?.toLocaleTimeString() || "N/A"}
                      </p>
                    </div>
                  </div>

                  {stock.news && stock.news.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Recent News
                      </h4>
                      <div className="space-y-2">
                        {stock.news.slice(0, 2).map((article, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            <p className="font-medium">{article.headline}</p>
                            <p className="text-xs text-gray-500">
                              {article.source} •{" "}
                              {new Date(
                                article.datetime * 1000
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StockScreener;
