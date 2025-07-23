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
    if (nissScore > 70 && changePercent > 0)
      return { signal: "BUY", color: "text-green-600" };
    if (nissScore > 70 && changePercent < 0)
      return { signal: "WEAK BUY", color: "text-yellow-600" };
    if (nissScore < -70 && changePercent < 0)
      return { signal: "SELL", color: "text-red-600" };
    if (nissScore < -70 && changePercent > 0)
      return { signal: "WEAK SELL", color: "text-orange-600" };
    if (Math.abs(nissScore) < 30)
      return { signal: "HOLD", color: "text-gray-600" };
    return { signal: "NEUTRAL", color: "text-gray-500" };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Stock Screener</h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <Clock className="inline h-4 w-4 mr-1" />
                London: {londonTime}
              </div>
              {loading && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {watchlist.map((symbol) => {
              const stock = stocks[symbol];
              if (!stock || !stock.quote) {
                return (
                  <div
                    key={symbol}
                    className="bg-gray-100 p-4 rounded-lg animate-pulse"
                  >
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-6 bg-gray-300 rounded mb-1"></div>
                    <div className="h-4 bg-gray-300 rounded"></div>
                  </div>
                );
              }

              const { quote, nissScore } = stock;
              const signal = getSignal(nissScore, quote.changePercent);

              return (
                <div
                  key={symbol}
                  className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{symbol}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${signal.color} bg-current bg-opacity-10`}
                    >
                      {signal.signal}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Price:</span>
                      <span className="font-medium">
                        ${quote.price?.toFixed(2) || "N/A"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Change:</span>
                      <span
                        className={`font-medium ${
                          quote.changePercent >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {quote.changePercent >= 0 ? "+" : ""}
                        {quote.changePercent?.toFixed(2) || "0.00"}%
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">NISS:</span>
                      <span
                        className={`font-bold ${
                          nissScore > 60
                            ? "text-green-600"
                            : nissScore < -60
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {nissScore?.toFixed(0) || 0}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Volume:</span>
                      <span className="text-sm">
                        {quote.volume
                          ? (quote.volume / 1000000).toFixed(1) + "M"
                          : "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        News: {stock.news?.length || 0} items
                      </span>
                      {Math.abs(nissScore) > 75 && (
                        <AlertCircle
                          className="h-4 w-4 text-orange-500"
                          title="High NISS Alert"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {Object.keys(stocks).length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No stock data available. Check your API configuration.
              </p>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Market Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-blue-600">Strong Signals</p>
                  <p className="text-xl font-bold text-blue-900">
                    {
                      Object.values(stocks).filter(
                        (s) => Math.abs(s.nissScore) > 70
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-green-600">Bullish</p>
                  <p className="text-xl font-bold text-green-900">
                    {
                      Object.values(stocks).filter((s) => s.nissScore > 50)
                        .length
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center">
                <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
                <div>
                  <p className="text-sm text-red-600">Bearish</p>
                  <p className="text-xl font-bold text-red-900">
                    {
                      Object.values(stocks).filter((s) => s.nissScore < -50)
                        .length
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockScreener;
