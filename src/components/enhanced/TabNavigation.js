// src/components/enhanced/TabNavigation.js
// Modular tab navigation component for News Impact Screener
// Clean, optimized tab switching with badges and indicators

import React, { useMemo } from "react";
import {
  Filter,
  Target,
  BarChart3,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

const TabNavigation = ({
  activeTab,
  onTabChange,
  summaryStats = {},
  loading = false,
}) => {
  // ============================================
  // TAB CONFIGURATION
  // ============================================

  const tabs = useMemo(
    () => [
      {
        id: "screener",
        name: "Stock Screener",
        icon: Filter,
        description: "Enhanced 6-component NISS analysis",
        badge:
          summaryStats.activeSignals > 0 ? summaryStats.activeSignals : null,
        badgeColor: "bg-blue-100 text-blue-800",
      },
      {
        id: "catalyst",
        name: "Catalyst Analysis",
        icon: Target,
        description: "News impact and catalyst tracking",
        badge:
          summaryStats.highConfidence > 0 ? summaryStats.highConfidence : null,
        badgeColor: "bg-green-100 text-green-800",
      },
      {
        id: "performance",
        name: "Performance Tracking",
        icon: BarChart3,
        description: "Trade history and analytics",
        badge: summaryStats.total > 10 ? "+" : null,
        badgeColor: "bg-purple-100 text-purple-800",
      },
    ],
    [summaryStats]
  );

  // ============================================
  // TAB INDICATORS
  // ============================================

  const TabIndicator = ({ tab, isActive }) => {
    const getIndicatorIcon = () => {
      if (loading && isActive) {
        return <Clock className="h-3 w-3 animate-pulse" />;
      }

      switch (tab.id) {
        case "screener":
          return summaryStats.activeSignals > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <Activity className="h-3 w-3" />
          );
        case "catalyst":
          return summaryStats.highConfidence > 0 ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          );
        case "performance":
          return <BarChart3 className="h-3 w-3" />;
        default:
          return null;
      }
    };

    return (
      <div className="flex items-center space-x-1">
        {getIndicatorIcon()}
        <span className="text-xs">
          {isActive && loading ? "Loading..." : "Active"}
        </span>
      </div>
    );
  };

  // ============================================
  // TAB STATISTICS
  // ============================================

  const getTabStats = (tabId) => {
    switch (tabId) {
      case "screener":
        return {
          primary: summaryStats.total || 0,
          secondary: `${summaryStats.activeSignals || 0} signals`,
          trend: summaryStats.bullish > summaryStats.bearish ? "up" : "down",
        };
      case "catalyst":
        return {
          primary: summaryStats.highConfidence || 0,
          secondary: `high confidence`,
          trend: summaryStats.highConfidence > 0 ? "up" : "neutral",
        };
      case "performance":
        return {
          primary: summaryStats.total || 0,
          secondary: `analyzed`,
          trend: "neutral",
        };
      default:
        return { primary: 0, secondary: "", trend: "neutral" };
    }
  };

  // ============================================
  // RENDER METHODS
  // ============================================

  const renderTabButton = (tab) => {
    const isActive = activeTab === tab.id;
    const stats = getTabStats(tab.id);

    return (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        disabled={loading}
        className={`
          relative group flex flex-col items-center py-4 px-6 rounded-lg transition-all duration-200
          ${
            isActive
              ? "bg-blue-50 border-2 border-blue-200 text-blue-700"
              : "bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-700"
          }
          ${
            loading
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:shadow-md"
          }
        `}
      >
        {/* Tab Icon and Badge Container */}
        <div className="relative flex items-center mb-2">
          <tab.icon
            className={`h-6 w-6 ${
              isActive ? "text-blue-600" : "text-gray-500"
            }`}
          />

          {/* Badge */}
          {tab.badge && (
            <span
              className={`
              absolute -top-2 -right-2 px-1.5 py-0.5 text-xs font-medium rounded-full
              ${tab.badgeColor}
            `}
            >
              {tab.badge}
            </span>
          )}
        </div>

        {/* Tab Title */}
        <div className="text-center">
          <div
            className={`font-medium text-sm ${
              isActive ? "text-blue-700" : "text-gray-700"
            }`}
          >
            {tab.name}
          </div>

          {/* Tab Description */}
          <div className="text-xs text-gray-500 mt-1 hidden sm:block">
            {tab.description}
          </div>

          {/* Tab Statistics */}
          <div className="text-xs mt-2 flex items-center justify-center space-x-2">
            <span
              className={`font-bold ${
                isActive ? "text-blue-600" : "text-gray-600"
              }`}
            >
              {stats.primary}
            </span>
            <span className="text-gray-500">{stats.secondary}</span>
          </div>
        </div>

        {/* Active Indicator */}
        {isActive && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1">
            <TabIndicator tab={tab} isActive={isActive} />
          </div>
        )}

        {/* Loading Overlay */}
        {loading && isActive && (
          <div className="absolute inset-0 bg-white bg-opacity-50 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </button>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Analysis Dashboard
          </h2>
          <p className="text-sm text-gray-600">
            Choose your analysis view • {summaryStats.total || 0} stocks
            processed
          </p>
        </div>

        {/* Global Status Indicator */}
        <div className="flex items-center space-x-2">
          {loading ? (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Processing...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Buttons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tabs.map(renderTabButton)}
      </div>

      {/* Progress Indicator */}
      {loading && (
        <div className="mt-4">
          <div className="bg-gray-200 rounded-full h-1">
            <div className="bg-blue-600 h-1 rounded-full transition-all duration-300 animate-pulse w-1/3"></div>
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
            Enhanced NISS analysis in progress...
          </div>
        </div>
      )}

      {/* Quick Stats Summary */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-sm font-medium text-gray-600">Bullish</div>
            <div className="text-lg font-bold text-green-600">
              {summaryStats.bullish || 0}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600">Bearish</div>
            <div className="text-lg font-bold text-red-600">
              {summaryStats.bearish || 0}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600">
              High Confidence
            </div>
            <div className="text-lg font-bold text-purple-600">
              {summaryStats.highConfidence || 0}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600">
              Active Signals
            </div>
            <div className="text-lg font-bold text-orange-600">
              {summaryStats.activeSignals || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabNavigation;
