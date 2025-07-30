// src/components/enhanced/HeaderComponent.js
// Modular header component for News Impact Screener
// Extracted from main component for better organization

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Bell,
  Activity,
  Shield,
  Wifi,
  WifiOff,
  Download,
  Clock,
  BarChart3,
  Zap,
  Info,
} from "lucide-react";

const HeaderComponent = ({
  serviceStatus,
  marketContext,
  summaryStats,
  loading = false,
  onRefresh,
  onSettingsChange,
  onExport,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showStatusDetails, setShowStatusDetails] = useState(false);

  // ============================================
  // JM TRADING LOGO COMPONENT
  // ============================================

  const JMTradingLogo = ({ className = "" }) => (
    <div className={`flex items-center ${className}`}>
      <svg
        width="140"
        height="50"
        viewBox="0 0 140 50"
        xmlns="http://www.w3.org/2000/svg"
        className="mr-3"
      >
        <defs>
          <linearGradient
            id="jm-header-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop
              offset="0%"
              style={{ stopColor: "#1e40af", stopOpacity: 1 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "#3b82f6", stopOpacity: 1 }}
            />
          </linearGradient>
        </defs>
        <text
          x="70"
          y="28"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="26"
          fontWeight="700"
          fill="url(#jm-header-gradient)"
          textAnchor="middle"
          letterSpacing="1.5"
        >
          JM
        </text>
        <text
          x="70"
          y="38"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="8"
          fontWeight="300"
          fill="#475569"
          textAnchor="middle"
          letterSpacing="1.5"
        >
          TRADING SERVICES
        </text>
      </svg>
    </div>
  );

  // ============================================
  // STATUS INDICATORS
  // ============================================

  const StatusIndicator = ({ status, label, icon: Icon, details }) => {
    const getStatusColor = () => {
      if (typeof status === "boolean") {
        return status ? "text-green-600" : "text-red-600";
      }

      switch (status) {
        case "connected":
        case "HIGH":
        case "BULLISH":
          return "text-green-600";
        case "disconnected":
        case "LOW":
        case "BEARISH":
          return "text-red-600";
        case "MEDIUM":
        case "NEUTRAL":
        default:
          return "text-yellow-600";
      }
    };

    return (
      <div className="flex items-center space-x-2">
        <Icon className={`h-4 w-4 ${getStatusColor()}`} />
        <span className="text-sm text-gray-700">{label}</span>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {typeof status === "boolean" ? (status ? "OK" : "Error") : status}
        </span>
        {details && showStatusDetails && (
          <span className="text-xs text-gray-500">({details})</span>
        )}
      </div>
    );
  };

  // ============================================
  // SUMMARY STATS DISPLAY
  // ============================================

  const SummaryStatsDisplay = () => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="bg-white rounded-lg p-3 shadow-sm border">
        <div className="text-lg font-bold text-blue-600">
          {summaryStats.total || 0}
        </div>
        <div className="text-xs text-gray-600">Total Analyzed</div>
      </div>

      <div className="bg-white rounded-lg p-3 shadow-sm border">
        <div className="text-lg font-bold text-green-600">
          {summaryStats.bullish || 0}
        </div>
        <div className="text-xs text-gray-600">Bullish Signals</div>
      </div>

      <div className="bg-white rounded-lg p-3 shadow-sm border">
        <div className="text-lg font-bold text-red-600">
          {summaryStats.bearish || 0}
        </div>
        <div className="text-xs text-gray-600">Bearish Signals</div>
      </div>

      <div className="bg-white rounded-lg p-3 shadow-sm border">
        <div className="text-lg font-bold text-purple-600">
          {summaryStats.highConfidence || 0}
        </div>
        <div className="text-xs text-gray-600">High Confidence</div>
      </div>

      <div className="bg-white rounded-lg p-3 shadow-sm border">
        <div className="text-lg font-bold text-orange-600">
          {summaryStats.activeSignals || 0}
        </div>
        <div className="text-xs text-gray-600">Active Signals</div>
      </div>
    </div>
  );

  // ============================================
  // ACTION BUTTONS
  // ============================================

  const ActionButtons = () => (
    <div className="flex items-center space-x-3">
      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={loading}
        className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
          loading
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        <RefreshCw
          className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
        />
        {loading ? "Screening..." : "Refresh"}
      </button>

      {/* Export Button */}
      {onExport && summaryStats.total > 0 && (
        <button
          onClick={onExport}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </button>
      )}

      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <Settings className="h-4 w-4" />
      </button>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Row */}
        <div className="py-4 flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center">
            <JMTradingLogo />
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">
                News Impact Screener
              </h1>
              <p className="text-sm text-gray-600">
                Institutional-Grade Stock Analysis • Enhanced 6-Component
                Framework
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <ActionButtons />
        </div>

        {/* Status and Stats Row */}
        <div className="pb-4 border-t border-gray-100 pt-4">
          {/* Status Indicators */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-6">
              <StatusIndicator
                status={serviceStatus?.backendHealth}
                label="Backend"
                icon={serviceStatus?.backendHealth ? Wifi : WifiOff}
                details={`v${serviceStatus?.version}`}
              />

              <StatusIndicator
                status={marketContext?.trend}
                label="Market"
                icon={
                  marketContext?.trend === "BULLISH"
                    ? TrendingUp
                    : marketContext?.trend === "BEARISH"
                    ? TrendingDown
                    : Activity
                }
                details={marketContext?.volatility}
              />

              <StatusIndicator
                status="connected"
                label="NISS Engine"
                icon={Zap}
                details="v3.0"
              />

              <StatusIndicator
                status={summaryStats.total > 0 ? "active" : "idle"}
                label="Screening"
                icon={BarChart3}
                details={`${serviceStatus?.totalSymbols || 0} universe`}
              />
            </div>

            {/* Status Details Toggle */}
            <button
              onClick={() => setShowStatusDetails(!showStatusDetails)}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
            >
              <Info className="h-4 w-4 mr-1" />
              {showStatusDetails ? "Hide" : "Show"} Details
            </button>
          </div>

          {/* Summary Statistics */}
          <SummaryStatsDisplay />
        </div>

        {/* Settings Panel (Collapsible) */}
        {showSettings && (
          <div className="pb-4 border-t border-gray-100 pt-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refresh Interval
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    onChange={(e) =>
                      onSettingsChange({
                        refreshInterval: parseInt(e.target.value),
                      })
                    }
                    defaultValue="300000"
                  >
                    <option value="60000">1 minute</option>
                    <option value="300000">5 minutes</option>
                    <option value="600000">10 minutes</option>
                    <option value="1800000">30 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cache Management
                  </label>
                  <button
                    onClick={() => onSettingsChange({ clearCache: true })}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700"
                  >
                    Clear Cache
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Performance
                  </label>
                  <div className="text-sm text-gray-600">
                    <div>Cache: {serviceStatus?.cacheSize || 0} items</div>
                    <div>
                      Avg NISS: {summaryStats.avgNissScore?.toFixed(1) || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeaderComponent;
