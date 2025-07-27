// src/components/StockScreener.js
// UPDATED: Now uses complete screening universe from InstitutionalDataService
// Enhanced with filtering, sorting, and institutional-grade features

import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Download,
  Settings,
  Activity,
  Target,
  Shield,
  DollarSign,
  BarChart2,
  ChevronDown,
  ChevronRight,
  Eye,
  Zap,
} from "lucide-react";
import InstitutionalDataService from "../api/InstitutionalDataService";

const StockScreener = () => {
  // Enhanced state management
  const [stocks, setStocks] = useState({});
  const [screeningResults, setScreeningResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isScreening, setIsScreening] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState(null);
  const [backendHealth, setBackendHealth] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Enhanced filters for institutional screening
  const [filters, setFilters] = useState({
    marketCap: "all", // all, mega, large, mid, small
    sector: "all", // all sectors from screeningUniverse
    nissThreshold: 60, // Minimum NISS score threshold
    minConfidence: "MEDIUM", // HIGH, MEDIUM, LOW, all
    minVolume: 500000, // Minimum volume filter
    minPrice: 1, // Minimum price filter
    maxPrice: null, // Maximum price filter
    signalType: "all", // all, BUY, SELL, HOLD
    showOnlyWithNews: false, // Filter stocks with news only
  });

  // Sorting options
  const [sortBy, setSortBy] = useState("nissScore");
  const [sortDirection, setSortDirection] = useState("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(20);

  // Enhanced view options
  const [viewMode, setViewMode] = useState("card"); // card, table, compact
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 minutes

  // Time tracking
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Backend health check
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const isHealthy = await InstitutionalDataService.checkBackendHealth();
        setBackendHealth(isHealthy);
      } catch (error) {
        console.error("Backend health check failed:", error);
        setBackendHealth(false);
      }
    };

    checkBackend();
    const healthInterval = setInterval(checkBackend, 5 * 60 * 1000);
    return () => clearInterval(healthInterval);
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      loadAllStocks();
      const interval = setInterval(loadAllStocks, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, filters]);

  // Load complete stock universe using InstitutionalDataService
  const loadAllStocks = async () => {
    if (isScreening) return; // Prevent concurrent screening

    setLoading(true);
    setIsScreening(true);

    try {
      console.log("🔍 Starting institutional stock screening...");

      // Use InstitutionalDataService to screen all stocks
      const results = await InstitutionalDataService.screenAllStocks(filters);

      console.log(
        `📊 Screening complete: ${results.length} opportunities found`
      );

      setScreeningResults(results);

      // Convert to legacy format for backward compatibility
      const stockData = {};
      results.forEach((result) => {
        stockData[result.symbol] = {
          ...result,
          // Add any additional processing here
          lastUpdate: new Date(),
        };
      });

      setStocks(stockData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("❌ Error during stock screening:", error);
      setBackendHealth(false);
    } finally {
      setLoading(false);
      setIsScreening(false);
    }
  };

  // Get available sectors from screening universe
  const getAvailableSectors = () => {
    const sectors = new Set();
    Object.keys(InstitutionalDataService.screeningUniverse).forEach((sector) =>
      sectors.add(sector)
    );
    return Array.from(sectors).sort();
  };

  // Enhanced filtering and sorting
  const filteredAndSortedResults = useMemo(() => {
    let filtered = screeningResults;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(query) ||
          stock.company?.toLowerCase().includes(query) ||
          stock.sector?.toLowerCase().includes(query)
      );
    }

    // Apply sector filter
    if (filters.sector !== "all") {
      filtered = filtered.filter((stock) => stock.sector === filters.sector);
    }

    // Apply signal type filter
    if (filters.signalType !== "all") {
      filtered = filtered.filter((stock) => {
        const signal = stock.tradeSetup?.action || "HOLD";
        if (filters.signalType === "BUY") {
          return signal === "LONG" || signal === "BUY";
        } else if (filters.signalType === "SELL") {
          return signal === "SHORT" || signal === "SELL";
        } else if (filters.signalType === "HOLD") {
          return signal === "HOLD";
        }
        return true;
      });
    }

    // Apply news filter
    if (filters.showOnlyWithNews) {
      filtered = filtered.filter(
        (stock) => stock.news && stock.news.length > 0
      );
    }

    // Apply market cap filter
    if (filters.marketCap !== "all") {
      filtered = filtered.filter((stock) => {
        const mcap = stock.marketCap || 0;
        switch (filters.marketCap) {
          case "mega":
            return mcap >= 200e9;
          case "large":
            return mcap >= 10e9 && mcap < 200e9;
          case "mid":
            return mcap >= 2e9 && mcap < 10e9;
          case "small":
            return mcap < 2e9;
          default:
            return true;
        }
      });
    }

    // Sort results
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case "nissScore":
          aVal = Math.abs(a.nissScore || 0);
          bVal = Math.abs(b.nissScore || 0);
          break;
        case "confidence":
          const confMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          aVal = confMap[a.nissData?.confidence || "LOW"];
          bVal = confMap[b.nissData?.confidence || "LOW"];
          break;
        case "volume":
          aVal = a.quote?.volume || 0;
          bVal = b.quote?.volume || 0;
          break;
        case "changePercent":
          aVal = Math.abs(a.quote?.changePercent || 0);
          bVal = Math.abs(b.quote?.changePercent || 0);
          break;
        case "marketCap":
          aVal = a.marketCap || 0;
          bVal = b.marketCap || 0;
          break;
        case "symbol":
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        default:
          aVal = Math.abs(a.nissScore || 0);
          bVal = Math.abs(b.nissScore || 0);
      }

      if (typeof aVal === "string") {
        return sortDirection === "desc"
          ? bVal.localeCompare(aVal)
          : aVal.localeCompare(bVal);
      }

      return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
    });

    return filtered;
  }, [screeningResults, searchQuery, filters, sortBy, sortDirection]);

  // Pagination
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * resultsPerPage;
    return filteredAndSortedResults.slice(
      startIndex,
      startIndex + resultsPerPage
    );
  }, [filteredAndSortedResults, currentPage, resultsPerPage]);

  const totalPages = Math.ceil(
    filteredAndSortedResults.length / resultsPerPage
  );

  // Helper functions
  const formatMarketCap = (mcap) => {
    if (!mcap) return "N/A";
    if (mcap >= 1e12) return `$${(mcap / 1e12).toFixed(1)}T`;
    if (mcap >= 1e9) return `$${(mcap / 1e9).toFixed(1)}B`;
    if (mcap >= 1e6) return `$${(mcap / 1e6).toFixed(1)}M`;
    return `$${(mcap / 1e3).toFixed(1)}K`;
  };

  const formatNumber = (num) => {
    if (!num) return "N/A";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
    return num.toFixed(2);
  };

  const getSignal = (stock) => {
    const nissScore = stock.nissScore || 0;
    const changePercent = stock.quote?.changePercent || 0;
    const confidence = stock.nissData?.confidence || "LOW";

    if (Math.abs(nissScore) < 30) return { signal: "HOLD", color: "gray" };

    if (nissScore > 75) {
      return {
        signal: confidence === "HIGH" ? "STRONG BUY" : "BUY",
        color: "green",
      };
    } else if (nissScore < -75) {
      return {
        signal: confidence === "HIGH" ? "STRONG SELL" : "SELL",
        color: "red",
      };
    } else if (nissScore > 60) {
      return { signal: "BUY", color: "green" };
    } else if (nissScore < -60) {
      return { signal: "SELL", color: "red" };
    } else if (nissScore > 30) {
      return { signal: "WEAK BUY", color: "green" };
    } else if (nissScore < -30) {
      return { signal: "WEAK SELL", color: "red" };
    }

    return { signal: "HOLD", color: "gray" };
  };

  const getSignalIcon = (signal) => {
    switch (signal) {
      case "STRONG BUY":
      case "BUY":
      case "WEAK BUY":
        return <TrendingUp className="h-4 w-4" />;
      case "STRONG SELL":
      case "SELL":
      case "WEAK SELL":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Export functionality
  const exportToCSV = () => {
    const headers = [
      "Symbol",
      "Company",
      "Sector",
      "NISS Score",
      "Confidence",
      "Signal",
      "Price",
      "Change %",
      "Volume",
      "Market Cap",
      "News Count",
      "Entry",
      "Stop Loss",
      "R:R",
    ];

    const rows = filteredAndSortedResults.map((stock) => [
      stock.symbol,
      stock.company || "",
      stock.sector || "",
      (stock.nissScore || 0).toFixed(0),
      stock.nissData?.confidence || "",
      stock.tradeSetup?.action || "HOLD",
      (stock.quote?.price || 0).toFixed(2),
      (stock.quote?.changePercent || 0).toFixed(2),
      stock.quote?.volume || "",
      formatMarketCap(stock.marketCap),
      stock.news?.length || 0,
      (stock.tradeSetup?.entry || 0).toFixed(2),
      (stock.tradeSetup?.stopLoss || 0).toFixed(2),
      (stock.tradeSetup?.riskReward || 0).toFixed(1),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock_screener_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const londonTime = currentTime.toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Continue with the render function in the next section...
  // Loading state
  if (loading && screeningResults.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Institutional Stock Screening
          </h2>
          <p className="text-gray-600 mb-4">
            Analyzing{" "}
            {
              Object.values(InstitutionalDataService.screeningUniverse).flat()
                .length
            }{" "}
            stocks across multiple sectors...
          </p>
          <div className="bg-white rounded-lg shadow-sm p-4 max-w-md mx-auto">
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Loading market data from institutional sources</p>
              <p>• Calculating enhanced NISS scores</p>
              <p>• Analyzing news sentiment and catalysts</p>
              <p>• Generating trade setups and risk metrics</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Institutional Stock Screener
              </h1>
              <p className="text-gray-600 mt-1">
                Real-time analysis of {filteredAndSortedResults.length}{" "}
                institutional-grade opportunities
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Backend Health Status */}
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    backendHealth ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {backendHealth ? "Backend Online" : "Backend Offline"}
                </span>
              </div>

              <div className="text-sm text-gray-600">
                <Clock className="inline h-4 w-4 mr-1" />
                London: {londonTime}
              </div>

              <div className="text-sm text-gray-600">
                Last update: {lastUpdate.toLocaleTimeString()}
              </div>

              <button
                onClick={loadAllStocks}
                className={`p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
                  isScreening ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={isScreening}
                title="Refresh institutional data"
              >
                <RefreshCw
                  className={`h-5 w-5 ${isScreening ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Activity className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-blue-600">Total Screened</p>
                  <p className="text-xl font-bold text-blue-900">
                    {screeningResults.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-green-600">Buy Signals</p>
                  <p className="text-xl font-bold text-green-900">
                    {
                      screeningResults.filter(
                        (s) =>
                          s.tradeSetup?.action === "LONG" ||
                          s.tradeSetup?.action === "BUY" ||
                          (s.nissScore || 0) > 60
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center">
                <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
                <div>
                  <p className="text-sm text-red-600">Sell Signals</p>
                  <p className="text-xl font-bold text-red-900">
                    {
                      screeningResults.filter(
                        (s) =>
                          s.tradeSetup?.action === "SHORT" ||
                          s.tradeSetup?.action === "SELL" ||
                          (s.nissScore || 0) < -60
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm text-purple-600">High Confidence</p>
                  <p className="text-xl font-bold text-purple-900">
                    {
                      screeningResults.filter(
                        (s) => s.nissData?.confidence === "HIGH"
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Zap className="h-5 w-5 text-orange-600 mr-2" />
                <div>
                  <p className="text-sm text-orange-600">Avg NISS</p>
                  <p className="text-xl font-bold text-orange-900">
                    {screeningResults.length > 0
                      ? (
                          screeningResults.reduce(
                            (sum, s) => sum + Math.abs(s.nissScore || 0),
                            0
                          ) / screeningResults.length
                        ).toFixed(0)
                      : 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center">
                <BarChart2 className="h-5 w-5 text-yellow-600 mr-2" />
                <div>
                  <p className="text-sm text-yellow-600">Sectors</p>
                  <p className="text-xl font-bold text-yellow-900">
                    {new Set(screeningResults.map((s) => s.sector)).size}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search symbols, companies, or sectors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filters */}
            <select
              value={filters.nissThreshold}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  nissThreshold: parseInt(e.target.value),
                })
              }
              className="text-sm border rounded-lg px-3 py-2"
            >
              <option value="30">NISS ≥30 (All Signals)</option>
              <option value="60">NISS ≥60 (Strong Signals)</option>
              <option value="75">NISS ≥75 (Institutional Grade)</option>
            </select>

            <select
              value={filters.minConfidence}
              onChange={(e) =>
                setFilters({ ...filters, minConfidence: e.target.value })
              }
              className="text-sm border rounded-lg px-3 py-2"
            >
              <option value="all">All Confidence</option>
              <option value="HIGH">High Confidence</option>
              <option value="MEDIUM">Medium+ Confidence</option>
            </select>

            <select
              value={filters.sector}
              onChange={(e) =>
                setFilters({ ...filters, sector: e.target.value })
              }
              className="text-sm border rounded-lg px-3 py-2"
            >
              <option value="all">All Sectors</option>
              {getAvailableSectors().map((sector) => (
                <option key={sector} value={sector} className="capitalize">
                  {sector.charAt(0).toUpperCase() + sector.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={filters.marketCap}
              onChange={(e) =>
                setFilters({ ...filters, marketCap: e.target.value })
              }
              className="text-sm border rounded-lg px-3 py-2"
            >
              <option value="all">All Market Caps</option>
              <option value="mega">Mega Cap ($200B+)</option>
              <option value="large">Large Cap ($10-200B)</option>
              <option value="mid">Mid Cap ($2-10B)</option>
              <option value="small">Small Cap (&lt;$2B)</option>
            </select>

            <select
              value={filters.signalType}
              onChange={(e) =>
                setFilters({ ...filters, signalType: e.target.value })
              }
              className="text-sm border rounded-lg px-3 py-2"
            >
              <option value="all">All Signals</option>
              <option value="BUY">Buy Signals</option>
              <option value="SELL">Sell Signals</option>
              <option value="HOLD">Hold/Neutral</option>
            </select>

            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={filters.showOnlyWithNews}
                onChange={(e) =>
                  setFilters({ ...filters, showOnlyWithNews: e.target.checked })
                }
                className="mr-2"
              />
              With News Only
            </label>
          </div>

          {/* Sort and View Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border rounded px-3 py-1"
              >
                <option value="nissScore">NISS Score</option>
                <option value="confidence">Confidence</option>
                <option value="volume">Volume</option>
                <option value="changePercent">Price Change</option>
                <option value="marketCap">Market Cap</option>
                <option value="symbol">Symbol</option>
              </select>

              <button
                onClick={() =>
                  setSortDirection(sortDirection === "desc" ? "asc" : "desc")
                }
                className="p-1 border rounded hover:bg-gray-50"
                title={`Sort ${
                  sortDirection === "desc" ? "ascending" : "descending"
                }`}
              >
                {sortDirection === "desc" ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={resultsPerPage}
                onChange={(e) => setResultsPerPage(parseInt(e.target.value))}
                className="text-sm border rounded px-3 py-1"
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>

              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Screening Results
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Showing {paginatedResults.length} of{" "}
              {filteredAndSortedResults.length} results
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    NISS Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Change %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volume
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    News
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isScreening ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">
                          Screening institutional opportunities...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedResults.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No stocks match your current filters. Try adjusting your
                      criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedResults.map((stock) => {
                    const signal = getSignal(stock);
                    const volumeRatio =
                      stock.quote?.volume && stock.quote?.avgVolume
                        ? (stock.quote.volume / stock.quote.avgVolume).toFixed(
                            1
                          )
                        : "1.0";

                    return (
                      <tr
                        key={stock.symbol}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedStock(stock)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="font-medium text-gray-900 text-lg">
                              {stock.symbol}
                            </div>
                            <div className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded capitalize">
                              {stock.sector}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {stock.company || stock.symbol}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatMarketCap(stock.marketCap)}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span
                              className={`text-lg font-bold ${
                                (stock.nissScore || 0) > 75
                                  ? "text-green-600"
                                  : (stock.nissScore || 0) > 50
                                  ? "text-blue-600"
                                  : (stock.nissScore || 0) < -50
                                  ? "text-red-600"
                                  : "text-gray-600"
                              }`}
                            >
                              {(stock.nissScore || 0).toFixed(0)}
                            </span>
                            <div className="ml-2 w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  (stock.nissScore || 0) > 0
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    Math.abs(stock.nissScore || 0),
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {stock.nissData?.confidence || "LOW"} confidence
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
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
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-lg font-bold text-gray-900">
                            ${(stock.quote?.price || 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Entry: ${(stock.tradeSetup?.entry || 0).toFixed(2)}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-sm font-medium ${
                              (stock.quote?.changePercent || 0) > 0
                                ? "text-green-600"
                                : (stock.quote?.changePercent || 0) < 0
                                ? "text-red-600"
                                : "text-gray-600"
                            }`}
                          >
                            {(stock.quote?.changePercent || 0) > 0 ? "+" : ""}
                            {(stock.quote?.changePercent || 0).toFixed(2)}%
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>{formatNumber(stock.quote?.volume)}</div>
                          <div className="text-xs">
                            {parseFloat(volumeRatio) > 2 ? (
                              <span className="font-bold text-orange-600">
                                {volumeRatio}x avg
                              </span>
                            ) : (
                              `${volumeRatio}x avg`
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span
                              className={`text-sm font-bold ${
                                (stock.news?.length || 0) > 3
                                  ? "text-blue-600"
                                  : (stock.news?.length || 0) > 0
                                  ? "text-gray-900"
                                  : "text-gray-400"
                              }`}
                            >
                              {stock.news?.length || 0}
                            </span>
                            <span className="text-xs text-gray-500 ml-1">
                              articles
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStock(stock);
                            }}
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * resultsPerPage + 1} to{" "}
                {Math.min(
                  currentPage * resultsPerPage,
                  filteredAndSortedResults.length
                )}{" "}
                of {filteredAndSortedResults.length} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>

                <div className="flex items-center space-x-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum =
                      Math.max(1, Math.min(totalPages - 4, currentPage - 2)) +
                      i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 border rounded text-sm ${
                          currentPage === pageNum
                            ? "bg-blue-600 text-white border-blue-600"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stock Detail Modal */}
      {selectedStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedStock.symbol} -{" "}
                  {selectedStock.company || selectedStock.symbol}
                </h3>
                <p className="text-sm text-gray-600 capitalize">
                  {selectedStock.sector} •{" "}
                  {formatMarketCap(selectedStock.marketCap)}
                </p>
              </div>
              <button
                onClick={() => setSelectedStock(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Current Price</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(selectedStock.quote?.price || 0).toFixed(2)}
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      (selectedStock.quote?.changePercent || 0) > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {(selectedStock.quote?.changePercent || 0) > 0 ? "+" : ""}
                    {(selectedStock.quote?.changePercent || 0).toFixed(2)}%
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">NISS Score</p>
                  <p
                    className={`text-2xl font-bold ${
                      (selectedStock.nissScore || 0) > 60
                        ? "text-green-600"
                        : (selectedStock.nissScore || 0) < -60
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    {(selectedStock.nissScore || 0).toFixed(0)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedStock.nissData?.confidence || "LOW"} confidence
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Volume</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(selectedStock.quote?.volume)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedStock.quote?.volume &&
                    selectedStock.quote?.avgVolume
                      ? `${(
                          selectedStock.quote.volume /
                          selectedStock.quote.avgVolume
                        ).toFixed(1)}x avg`
                      : "N/A"}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">News Articles</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedStock.news?.length || 0}
                  </p>
                  <p className="text-sm text-gray-600">recent</p>
                </div>
              </div>

              {/* Trade Setup */}
              {selectedStock.tradeSetup &&
                selectedStock.tradeSetup.action !== "HOLD" && (
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h4 className="text-lg font-semibold text-blue-900 mb-4">
                      Institutional Trade Setup
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600">Action</p>
                        <p
                          className={`text-xl font-bold ${
                            selectedStock.tradeSetup.action === "LONG"
                              ? "text-green-600"
                              : selectedStock.tradeSetup.action === "SHORT"
                              ? "text-red-600"
                              : "text-gray-600"
                          }`}
                        >
                          {selectedStock.tradeSetup.action}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600">Entry Price</p>
                        <p className="text-xl font-bold text-gray-900">
                          ${(selectedStock.tradeSetup.entry || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600">Stop Loss</p>
                        <p className="text-xl font-bold text-red-600">
                          ${(selectedStock.tradeSetup.stopLoss || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600">Risk/Reward</p>
                        <p className="text-xl font-bold text-blue-600">
                          1:
                          {(selectedStock.tradeSetup.riskReward || 0).toFixed(
                            1
                          )}
                        </p>
                      </div>
                    </div>
                    {selectedStock.tradeSetup.reasoning && (
                      <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                        <p className="text-sm text-blue-900">
                          <strong>Analysis:</strong>{" "}
                          {selectedStock.tradeSetup.reasoning}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              {/* Recent News */}
              {selectedStock.news && selectedStock.news.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Recent News ({selectedStock.news.length} articles)
                  </h4>
                  <div className="space-y-3">
                    {selectedStock.news.slice(0, 5).map((article, index) => (
                      <div
                        key={index}
                        className="bg-white p-4 rounded-lg shadow-sm"
                      >
                        <h5 className="font-medium text-gray-900 mb-2">
                          {article.headline}
                        </h5>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>{article.source}</span>
                          <span>
                            {new Date(
                              article.datetime * 1000
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        {article.sentiment && (
                          <div className="mt-2 flex items-center">
                            <span className="text-xs text-gray-500 mr-2">
                              Sentiment:
                            </span>
                            <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${
                                  article.sentiment > 0
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }`}
                                style={{
                                  width: `${
                                    Math.abs(article.sentiment) * 100
                                  }%`,
                                  marginLeft:
                                    article.sentiment < 0 ? "auto" : 0,
                                }}
                              />
                            </div>
                            <span
                              className={`text-xs font-medium ${
                                article.sentiment > 0.3
                                  ? "text-green-600"
                                  : article.sentiment < -0.3
                                  ? "text-red-600"
                                  : "text-gray-600"
                              }`}
                            >
                              {article.sentiment.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockScreener;
