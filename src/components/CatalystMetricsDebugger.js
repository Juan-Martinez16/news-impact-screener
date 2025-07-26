// src/components/CatalystMetricsDebugger.js
import React, { useState } from "react";
import {
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";

const CatalystMetricsDebugger = ({ screeningResults = [] }) => {
  const [selectedStock, setSelectedStock] = useState(null);
  const [debugMode, setDebugMode] = useState(false); // Default to false to hide debugger

  // Get a sample stock for debugging
  const sampleStock = screeningResults?.[0];
  const debugStock = selectedStock || sampleStock;

  // Only show debugger in development mode
  if (process.env.NODE_ENV === "production" && !debugMode) {
    return null;
  }

  // Diagnostic functions
  const checkNISSScore = () => {
    if (!debugStock) {
      return {
        status: "error",
        message: "No stock data available from screening results",
      };
    }

    const nissScore = debugStock.nissScore;
    if (nissScore === undefined) {
      return {
        status: "error",
        message: "NISS Score is undefined in screening data",
      };
    }
    if (nissScore === 0) {
      return {
        status: "warning",
        message: "NISS Score is 0 - likely calculation issue",
      };
    }
    if (Math.abs(nissScore) > 100) {
      return {
        status: "warning",
        message: "NISS Score seems abnormally high",
      };
    }
    return {
      status: "success",
      message: `NISS Score: ${nissScore.toFixed(1)} (Normal)`,
    };
  };

  const checkVolumeData = () => {
    if (!debugStock?.quote) {
      return {
        status: "error",
        message: "No quote data available from screening results",
      };
    }

    const { volume, avgVolume } = debugStock.quote;
    if (!volume) {
      return {
        status: "error",
        message: "Current volume missing from quote data",
      };
    }
    if (!avgVolume) {
      return {
        status: "warning",
        message: "Average volume missing - using current volume as fallback",
      };
    }

    const ratio = volume / (avgVolume || volume);
    return {
      status: ratio > 0.5 ? "success" : "warning",
      message: `Volume ratio: ${ratio.toFixed(2)}x average`,
    };
  };

  const checkNewsData = () => {
    if (!debugStock?.news) {
      return {
        status: "warning",
        message: "No news data available",
      };
    }

    const newsCount = debugStock.news.length;
    if (newsCount === 0) {
      return {
        status: "warning",
        message: "No news articles found",
      };
    }

    const hasValidSentiment = debugStock.news.some(
      (article) => article.sentiment !== undefined && article.sentiment !== null
    );

    return {
      status: hasValidSentiment ? "success" : "warning",
      message: `${newsCount} news articles, sentiment analysis: ${
        hasValidSentiment ? "available" : "missing"
      }`,
    };
  };

  const checkTechnicalData = () => {
    if (!debugStock?.technicals) {
      return {
        status: "warning",
        message: "No technical data available",
      };
    }

    const technicals = debugStock.technicals;
    const hasBasicIndicators =
      technicals.rsi && technicals.sma20 && technicals.atr;

    return {
      status: hasBasicIndicators ? "success" : "warning",
      message: `Technical indicators: ${
        hasBasicIndicators ? "complete" : "partial"
      }`,
    };
  };

  const checkTradeSetup = () => {
    if (!debugStock?.tradeSetup) {
      return {
        status: "error",
        message: "No trade setup data available",
      };
    }

    const setup = debugStock.tradeSetup;
    const hasCompleteSetup = setup.action && setup.entry && setup.stopLoss;

    return {
      status: hasCompleteSetup ? "success" : "warning",
      message: `Trade setup: ${hasCompleteSetup ? "complete" : "incomplete"}`,
    };
  };

  const diagnostics = [
    { name: "NISS Score", check: checkNISSScore },
    { name: "Volume Data", check: checkVolumeData },
    { name: "News Data", check: checkNewsData },
    { name: "Technical Data", check: checkTechnicalData },
    { name: "Trade Setup", check: checkTradeSetup },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "bg-green-50 border-green-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "error":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  // Don't render if no data to debug
  if (!debugStock && screeningResults.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setDebugMode(!debugMode)}
        className="mb-2 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Toggle Debug Panel"
      >
        <Activity className="h-5 w-5" />
      </button>

      {/* Debug Panel */}
      {debugMode && (
        <div className="bg-white rounded-lg shadow-2xl border p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              System Diagnostics
            </h3>
            <button
              onClick={() => setDebugMode(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Stock Selector */}
          {screeningResults.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Debug Stock:
              </label>
              <select
                value={debugStock?.symbol || ""}
                onChange={(e) => {
                  const stock = screeningResults.find(
                    (s) => s.symbol === e.target.value
                  );
                  setSelectedStock(stock);
                }}
                className="w-full text-sm border rounded px-3 py-1"
              >
                {screeningResults.slice(0, 10).map((stock) => (
                  <option key={stock.symbol} value={stock.symbol}>
                    {stock.symbol} - NISS:{" "}
                    {stock.nissScore?.toFixed(0) || "N/A"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* System Status */}
          <div className="space-y-3">
            <div className="border-b pb-2">
              <h4 className="text-sm font-medium text-gray-700">
                Screening Results: {screeningResults.length} stocks
              </h4>
            </div>

            {debugStock && (
              <>
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">
                    Current Stock: {debugStock.symbol}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600">Price:</span>
                      <span className="ml-1 font-medium">
                        ${debugStock.quote?.price?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Change:</span>
                      <span
                        className={`ml-1 font-medium ${
                          (debugStock.quote?.changePercent || 0) > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {debugStock.quote?.changePercent?.toFixed(2) || 0}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">NISS:</span>
                      <span className="ml-1 font-medium">
                        {debugStock.nissScore?.toFixed(0) || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Confidence:</span>
                      <span className="ml-1 font-medium">
                        {debugStock.nissData?.confidence || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Diagnostic Results */}
                <div className="space-y-2">
                  {diagnostics.map((diagnostic) => {
                    const result = diagnostic.check();
                    return (
                      <div
                        key={diagnostic.name}
                        className={`p-2 rounded border ${getStatusColor(
                          result.status
                        )}`}
                      >
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(result.status)}
                          <span className="text-sm font-medium">
                            {diagnostic.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {result.message}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* NISS Components Breakdown */}
                {debugStock.nissData?.components && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <h5 className="text-xs font-semibold text-blue-800 mb-2">
                      NISS Components
                    </h5>
                    <div className="space-y-1">
                      {Object.entries(debugStock.nissData.components).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between text-xs"
                          >
                            <span className="text-blue-700 capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}:
                            </span>
                            <span className="font-medium text-blue-900">
                              {typeof value === "number"
                                ? value.toFixed(1)
                                : value}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Trade Setup Summary */}
                {debugStock.tradeSetup && (
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    <h5 className="text-xs font-semibold text-green-800 mb-2">
                      Trade Setup
                    </h5>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-green-700">Action:</span>
                        <span className="font-medium text-green-900">
                          {debugStock.tradeSetup.action}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Entry:</span>
                        <span className="font-medium text-green-900">
                          ${debugStock.tradeSetup.entry?.toFixed(2) || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Stop:</span>
                        <span className="font-medium text-green-900">
                          ${debugStock.tradeSetup.stopLoss?.toFixed(2) || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">R:R:</span>
                        <span className="font-medium text-green-900">
                          1:
                          {debugStock.tradeSetup.riskReward?.toFixed(1) ||
                            "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* System Info */}
            <div className="border-t pt-2 text-xs text-gray-500">
              <div>Build: {process.env.NODE_ENV}</div>
              <div>Last Update: {new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalystMetricsDebugger;
