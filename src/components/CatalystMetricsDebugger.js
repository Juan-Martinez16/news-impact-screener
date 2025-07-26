// src/components/CatalystMetricsDebugger.js
// UPDATED TO REMOVE ALL DATASERVICE DEPENDENCIES

import React, { useState } from "react";
import {
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";

const CatalystMetricsDebugger = ({ screeningResults }) => {
  // REMOVED: stockData parameter
  const [selectedStock, setSelectedStock] = useState(null);
  const [debugMode, setDebugMode] = useState(true);

  // Get a sample stock for debugging - ONLY from InstitutionalDataService results
  const sampleStock = screeningResults?.[0];
  const debugStock = selectedStock || sampleStock;

  // Diagnostic functions - UPDATED to only check InstitutionalDataService data
  const checkNISSScore = () => {
    if (!debugStock)
      return {
        status: "error",
        message: "No stock data available from InstitutionalDataService",
      };

    const nissScore = debugStock.nissScore;
    if (nissScore === undefined)
      return {
        status: "error",
        message: "NISS Score is undefined in InstitutionalDataService data",
      };
    if (nissScore === 0)
      return {
        status: "warning",
        message: "NISS Score is 0 - likely calculation issue",
      };
    if (Math.abs(nissScore) > 100)
      return { status: "warning", message: "NISS Score seems abnormally high" };
    return { status: "success", message: `NISS Score: ${nissScore} (Normal)` };
  };

  const checkVolumeData = () => {
    if (!debugStock?.quote)
      return {
        status: "error",
        message: "No quote data available from InstitutionalDataService",
      };

    const { volume, avgVolume } = debugStock.quote;
    if (!volume)
      return {
        status: "error",
        message: "Current volume missing from InstitutionalDataService",
      };
    if (!avgVolume)
      return {
        status: "error",
        message: "Average volume missing from InstitutionalDataService",
      };

    const ratio = volume / avgVolume;
    return {
      status: ratio !== 1 ? "success" : "warning",
      message: `Volume: ${volume?.toLocaleString()}, Avg: ${avgVolume?.toLocaleString()}, Ratio: ${ratio.toFixed(
        2
      )}x`,
      data: { volume, avgVolume, ratio },
    };
  };

  const checkDataService = () => {
    const isScreeningResults = screeningResults && screeningResults.length > 0;

    if (!isScreeningResults) {
      return {
        status: "error",
        message:
          "No data from InstitutionalDataService - check backend connection",
      };
    }

    return {
      status: "success",
      message: "InstitutionalDataService working correctly",
    };
  };

  const checkNewsData = () => {
    if (!debugStock?.news)
      return {
        status: "error",
        message: "No news data in InstitutionalDataService result",
      };

    const newsCount = debugStock.news.length;
    if (newsCount === 0)
      return { status: "warning", message: "No news items found" };

    const hasHeadlines = debugStock.news.some(
      (item) => item.headline || item.title
    );
    if (!hasHeadlines)
      return { status: "warning", message: "News items missing headlines" };

    return {
      status: "success",
      message: `${newsCount} news items with headlines found`,
      data: {
        newsCount,
        sampleHeadline:
          debugStock.news[0]?.headline || debugStock.news[0]?.title,
      },
    };
  };

  const checkTradeSetup = () => {
    if (!debugStock?.tradeSetup)
      return {
        status: "warning",
        message: "No trade setup data from InstitutionalDataService",
      };

    const { entry, stopLoss, targets, riskReward } = debugStock.tradeSetup;

    const checks = [];
    if (!entry) checks.push("Missing entry price");
    if (!stopLoss) checks.push("Missing stop loss");
    if (!targets || targets.length === 0) checks.push("Missing price targets");
    if (!riskReward) checks.push("Missing risk/reward ratio");

    if (checks.length > 0) {
      return {
        status: "warning",
        message: `Trade setup incomplete: ${checks.join(", ")}`,
      };
    }

    return {
      status: "success",
      message: `Complete trade setup: Entry $${entry}, Stop $${stopLoss}, ${targets.length} targets`,
      data: { entry, stopLoss, targets: targets.length, riskReward },
    };
  };

  const StatusIcon = ({ status }) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const diagnostics = [
    { name: "InstitutionalDataService Connection", check: checkDataService },
    { name: "NISS Score Calculation", check: checkNISSScore },
    { name: "Volume Data", check: checkVolumeData },
    { name: "News Data Quality", check: checkNewsData },
    { name: "Trade Setup Generation", check: checkTradeSetup },
  ];

  if (!debugMode) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold text-gray-800">
            InstitutionalDataService Diagnostics
          </h3>
        </div>
        <button
          onClick={() => setDebugMode(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      {/* Stock selector - ONLY showing InstitutionalDataService results */}
      {screeningResults && screeningResults.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Debug Stock:
          </label>
          <select
            value={selectedStock?.symbol || ""}
            onChange={(e) => {
              const stock = screeningResults.find(
                (s) => s.symbol === e.target.value
              );
              setSelectedStock(stock);
            }}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="">Select stock to debug...</option>
            {screeningResults.map((stock) => (
              <option key={stock.symbol} value={stock.symbol}>
                {stock.symbol} - {stock.company || "Unknown Company"}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Diagnostic results */}
      <div className="space-y-3">
        {diagnostics.map((diagnostic, index) => {
          const result = diagnostic.check();
          return (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-white rounded border"
            >
              <StatusIcon status={result.status} />
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-800">
                  {diagnostic.name}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {result.message}
                </div>
                {result.data && (
                  <div className="text-xs text-gray-500 mt-1 font-mono">
                    {JSON.stringify(result.data, null, 2)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sample data display */}
      {debugStock && (
        <div className="mt-4 p-3 bg-white rounded border">
          <h4 className="font-medium text-sm text-gray-800 mb-2">
            Sample InstitutionalDataService Data for {debugStock.symbol}:
          </h4>
          <pre className="text-xs text-gray-600 overflow-x-auto">
            {JSON.stringify(
              {
                symbol: debugStock.symbol,
                nissScore: debugStock.nissScore,
                confidence: debugStock.nissData?.confidence,
                quote: {
                  price: debugStock.quote?.price,
                  volume: debugStock.quote?.volume,
                  avgVolume: debugStock.quote?.avgVolume,
                  changePercent: debugStock.quote?.changePercent,
                },
                newsCount: debugStock.news?.length || 0,
                tradeSetup: debugStock.tradeSetup
                  ? {
                      action: debugStock.tradeSetup.action,
                      entry: debugStock.tradeSetup.entry,
                      stopLoss: debugStock.tradeSetup.stopLoss,
                      targetsCount: debugStock.tradeSetup.targets?.length || 0,
                    }
                  : null,
              },
              null,
              2
            )}
          </pre>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        💡 This debugger helps verify InstitutionalDataService data quality and
        completeness. All legacy DataService dependencies have been removed.
      </div>
    </div>
  );
};

export default CatalystMetricsDebugger;
