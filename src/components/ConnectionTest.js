// src/components/ConnectionTest.js
// Simple component to test backend connection after deployment
// Use this temporarily to verify v4.0.0 connection works

import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, RefreshCw, Activity, Zap } from "lucide-react";

const ConnectionTest = () => {
  const [status, setStatus] = useState("testing");
  const [healthData, setHealthData] = useState(null);
  const [error, setError] = useState(null);
  const [screeningData, setScreeningData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Backend URL from environment
  const backendUrl =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setStatus("testing");
    setError(null);
    setHealthData(null);

    try {
      console.log("🔍 Testing backend connection to:", backendUrl);

      // Test health endpoint
      const healthResponse = await fetch(`${backendUrl}/api/health`);

      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }

      const health = await healthResponse.json();
      setHealthData(health);

      if (health.version === "4.0.0-multi-api") {
        setStatus("connected");
        console.log("✅ Connected to v4.0.0 backend successfully!");
      } else {
        setStatus("version-mismatch");
        setError(
          `Version mismatch: Expected 4.0.0-multi-api, got ${health.version}`
        );
      }
    } catch (err) {
      setStatus("failed");
      setError(err.message);
      console.error("❌ Connection test failed:", err);
    }
  };

  const testScreening = async () => {
    setLoading(true);
    setScreeningData(null);

    try {
      console.log("🔍 Testing screening endpoint...");
      const startTime = Date.now();

      const screeningResponse = await fetch(`${backendUrl}/api/screening`);

      if (!screeningResponse.ok) {
        throw new Error(`Screening failed: ${screeningResponse.status}`);
      }

      const screening = await screeningResponse.json();
      const processingTime = Date.now() - startTime;

      setScreeningData({
        ...screening,
        processingTime,
      });

      console.log("✅ Screening test successful!", screening.summary);
    } catch (err) {
      setError(err.message);
      console.error("❌ Screening test failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "testing":
        return <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />;
      case "connected":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "failed":
      case "version-mismatch":
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Activity className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case "testing":
        return "Testing backend connection...";
      case "connected":
        return "✅ Connected to optimized v4.0.0 backend!";
      case "failed":
        return `❌ Connection failed: ${error}`;
      case "version-mismatch":
        return `⚠️ Version mismatch: ${error}`;
      default:
        return "Unknown status";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <Zap className="h-7 w-7 text-blue-600 mr-3" />
            News Impact Screener - Connection Test
          </h1>

          {/* Connection Status */}
          <div className="border-l-4 border-blue-500 bg-blue-50 p-4 mb-6">
            <div className="flex items-center">
              {getStatusIcon()}
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Connection Status
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {getStatusMessage()}
                </p>
              </div>
            </div>
          </div>

          {/* Backend URL Display */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Backend URL:
            </h4>
            <code className="block bg-gray-100 p-3 rounded text-sm font-mono">
              {backendUrl}
            </code>
          </div>

          {/* Environment Variables Display */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Environment Check:
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">REACT_APP_BACKEND_URL:</span>
                  <br />
                  <code className="text-xs text-gray-600">
                    {process.env.REACT_APP_BACKEND_URL || "Not set"}
                  </code>
                </div>
                <div>
                  <span className="font-medium">REACT_APP_VERSION:</span>
                  <br />
                  <code className="text-xs text-gray-600">
                    {process.env.REACT_APP_VERSION || "Not set"}
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Health Data Display */}
          {healthData && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Backend Health Data:
              </h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Version:</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded text-xs ${
                        healthData.version === "4.0.0-multi-api"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {healthData.version}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded text-xs ${
                        healthData.status === "OK"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {healthData.status}
                    </span>
                  </div>
                </div>

                {/* API Status */}
                {healthData.apis && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-700 mb-2">
                      API Status:
                    </h5>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {Object.entries(healthData.apis).map(([api, status]) => (
                        <div
                          key={api}
                          className="flex items-center justify-between bg-white p-2 rounded"
                        >
                          <span className="capitalize">{api}:</span>
                          <span
                            className={`px-2 py-1 rounded ${
                              status === "OK"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={testConnection}
              disabled={status === "testing"}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${
                  status === "testing" ? "animate-spin" : ""
                }`}
              />
              Retest Connection
            </button>

            {status === "connected" && (
              <button
                onClick={testScreening}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Activity
                  className={`h-4 w-4 mr-2 ${loading ? "animate-pulse" : ""}`}
                />
                Test Screening (46+ stocks)
              </button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 border-l-4 border-red-500 bg-red-50 p-4">
              <div className="flex">
                <XCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Connection Error
                  </h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Screening Results */}
          {screeningData && (
            <div className="mt-6 border-l-4 border-green-500 bg-green-50 p-4">
              <h3 className="text-lg font-medium text-green-900 mb-3">
                ✅ Screening Test Results (v4.0.0)
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-white p-3 rounded">
                  <div className="text-green-600 font-semibold">
                    {screeningData.summary?.totalProcessed || 0}
                  </div>
                  <div className="text-gray-600">Stocks Processed</div>
                </div>

                <div className="bg-white p-3 rounded">
                  <div className="text-green-600 font-semibold">
                    {screeningData.summary?.successRate || 0}%
                  </div>
                  <div className="text-gray-600">Success Rate</div>
                </div>

                <div className="bg-white p-3 rounded">
                  <div className="text-green-600 font-semibold">
                    {Math.round(screeningData.processingTime / 1000)}s
                  </div>
                  <div className="text-gray-600">Processing Time</div>
                </div>

                <div className="bg-white p-3 rounded">
                  <div
                    className={`font-semibold ${
                      screeningData.summary?.totalProcessed >= 46 &&
                      screeningData.processingTime < 15000
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {screeningData.summary?.totalProcessed >= 46 &&
                    screeningData.processingTime < 15000
                      ? "✅ Target"
                      : "⚠️ Below Target"}
                  </div>
                  <div className="text-gray-600">v4.0.0 Performance</div>
                </div>
              </div>

              {screeningData.results && screeningData.results.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Sample Results:
                  </h4>
                  <div className="bg-white rounded overflow-hidden">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            Symbol
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            NISS Score
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            Price
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            Change %
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            Source
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {screeningData.results
                          .slice(0, 5)
                          .map((stock, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-3 py-2 font-mono">
                                {stock.symbol}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`px-2 py-1 rounded ${
                                    stock.nissScore >= 7
                                      ? "bg-green-100 text-green-800"
                                      : stock.nissScore >= 5
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {stock.nissScore?.toFixed(1) || "N/A"}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                ${stock.currentPrice?.toFixed(2) || "N/A"}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={
                                    stock.changePercent >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }
                                >
                                  {stock.changePercent?.toFixed(2) || 0}%
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-500">
                                {stock.dataSource || "N/A"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Next Steps */}
          {status === "connected" && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                🎉 Connection Successful - Next Steps:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                <li>
                  • Replace this test component with your full
                  NewsImpactScreener
                </li>
                <li>
                  • Your backend v4.0.0 is ready with{" "}
                  {healthData?.summary?.totalApis || "6"} APIs
                </li>
                <li>• Expected performance: 46+ stocks in &lt;15 seconds ✅</li>
                <li>• Ready to proceed to Phase 4.1 (100+ stock scaling)</li>
              </ul>
            </div>
          )}

          {/* Troubleshooting */}
          {status !== "connected" && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-yellow-900 mb-2">
                🛠️ Troubleshooting:
              </h3>
              <ul className="text-sm text-yellow-800 space-y-1 ml-4">
                <li>
                  • Check that REACT_APP_BACKEND_URL is set correctly in .env
                </li>
                <li>
                  • Verify backend is working:{" "}
                  <a
                    href="https://news-impact-screener-backend.onrender.com/api/health"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Test backend directly
                  </a>
                </li>
                <li>• Clear browser cache and hard refresh (Ctrl+Shift+R)</li>
                <li>• Check browser console for detailed error messages</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionTest;
