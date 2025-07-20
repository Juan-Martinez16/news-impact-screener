import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  PieChart,
  Target,
  DollarSign,
  Calendar,
  Award,
  AlertTriangle,
  Clock,
  Activity,
  Download,
  RefreshCw,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";

const PerformanceTrackingTab = ({
  historicalPerformance = [],
  stockData = {},
  loading = false,
}) => {
  // State for performance tab
  const [performanceView, setPerformanceView] = useState("overview"); // overview, trades, analytics, backtest
  const [timeframe, setTimeframe] = useState("30d");
  const [filterConfidence, setFilterConfidence] = useState("all");
  const [filterSignal, setFilterSignal] = useState("all");
  const [selectedTrade, setSelectedTrade] = useState(null);

  // Helper functions
  function getSectorForSymbol(symbol) {
    const sectorMap = {
      AAPL: "Technology",
      MSFT: "Technology",
      GOOGL: "Technology",
      META: "Technology",
      NVDA: "Technology",
      AMD: "Technology",
      PLTR: "Technology",
      TSLA: "Automotive",
      RIVN: "Automotive",
      LCID: "Automotive",
      MRNA: "Healthcare",
      BNTX: "Healthcare",
      VKTX: "Healthcare",
    };
    return sectorMap[symbol] || "Other";
  }

  function getRandomNewsType() {
    const types = [
      "Earnings",
      "FDA/Regulatory",
      "Partnership",
      "M&A",
      "Analyst Action",
      "Product Launch",
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  // Generate mock performance data for demonstration
  const mockPerformanceData = useMemo(() => {
    const trades = [];
    const symbols = [
      "AAPL",
      "MSFT",
      "NVDA",
      "TSLA",
      "META",
      "GOOGL",
      "AMD",
      "PLTR",
      "MRNA",
      "VKTX",
    ];
    const signals = ["BUY", "SELL", "STRONG BUY", "STRONG SELL"];
    const confidences = ["HIGH", "MEDIUM", "LOW"];

    for (let i = 0; i < 50; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const signal = signals[Math.floor(Math.random() * signals.length)];
      const confidence =
        confidences[Math.floor(Math.random() * confidences.length)];
      const entryPrice = 50 + Math.random() * 200;
      const nissScore = (Math.random() - 0.5) * 200;

      // Simulate trade outcome based on confidence and NISS score
      const successProbability =
        confidence === "HIGH" ? 0.75 : confidence === "MEDIUM" ? 0.6 : 0.45;
      const isWin = Math.random() < successProbability;

      const direction = signal.includes("BUY") ? 1 : -1;
      const baseReturn =
        direction * (isWin ? Math.random() * 15 + 2 : -(Math.random() * 8 + 1));
      const exitPrice = entryPrice * (1 + baseReturn / 100);

      const entryDate = new Date();
      entryDate.setDate(entryDate.getDate() - Math.floor(Math.random() * 60));

      const exitDate = new Date(entryDate);
      exitDate.setDate(exitDate.getDate() + Math.floor(Math.random() * 10 + 1));

      trades.push({
        id: `trade-${i}`,
        symbol,
        signal,
        confidence,
        nissScore,
        entryDate,
        exitDate: isWin || Math.random() > 0.3 ? exitDate : null, // Some trades still open
        entryPrice,
        exitPrice: isWin || Math.random() > 0.3 ? exitPrice : null,
        returnPercent: isWin || Math.random() > 0.3 ? baseReturn : null,
        isWin: isWin || Math.random() > 0.3 ? isWin : null,
        status:
          isWin || Math.random() > 0.3 ? (isWin ? "WIN" : "LOSS") : "OPEN",
        holdingPeriod:
          isWin || Math.random() > 0.3
            ? Math.floor((exitDate - entryDate) / (1000 * 60 * 60 * 24))
            : null,
        riskReward: Math.random() * 4 + 1,
        positionSize: Math.random() * 3 + 1, // 1-4% of portfolio
        sector: getSectorForSymbol(symbol),
        newsType: getRandomNewsType(),
        maxDrawdown: Math.random() * 5 + 1,
      });
    }

    return trades.sort((a, b) => b.entryDate - a.entryDate);
  }, []);

  // Filter trades based on current filters
  const filteredTrades = useMemo(() => {
    let filtered = mockPerformanceData;

    // Time filter
    const now = new Date();
    const timeframeDays =
      timeframe === "7d"
        ? 7
        : timeframe === "30d"
        ? 30
        : timeframe === "90d"
        ? 90
        : 365;
    const cutoffDate = new Date(
      now.getTime() - timeframeDays * 24 * 60 * 60 * 1000
    );
    filtered = filtered.filter((trade) => trade.entryDate >= cutoffDate);

    // Confidence filter
    if (filterConfidence !== "all") {
      filtered = filtered.filter(
        (trade) => trade.confidence === filterConfidence
      );
    }

    // Signal filter
    if (filterSignal !== "all") {
      if (filterSignal === "BUY") {
        filtered = filtered.filter((trade) => trade.signal.includes("BUY"));
      } else if (filterSignal === "SELL") {
        filtered = filtered.filter((trade) => trade.signal.includes("SELL"));
      }
    }

    return filtered;
  }, [mockPerformanceData, timeframe, filterConfidence, filterSignal]);

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    const closedTrades = filteredTrades.filter(
      (trade) => trade.status !== "OPEN"
    );
    const winningTrades = closedTrades.filter((trade) => trade.isWin);
    const losingTrades = closedTrades.filter((trade) => !trade.isWin);

    const totalReturn = closedTrades.reduce(
      (sum, trade) => sum + (trade.returnPercent || 0),
      0
    );
    const winRate =
      closedTrades.length > 0
        ? (winningTrades.length / closedTrades.length) * 100
        : 0;
    const avgWin =
      winningTrades.length > 0
        ? winningTrades.reduce((sum, trade) => sum + trade.returnPercent, 0) /
          winningTrades.length
        : 0;
    const avgLoss =
      losingTrades.length > 0
        ? losingTrades.reduce(
            (sum, trade) => sum + Math.abs(trade.returnPercent),
            0
          ) / losingTrades.length
        : 0;
    const profitFactor =
      avgLoss > 0
        ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length)
        : 0;
    const avgHoldingPeriod =
      closedTrades.length > 0
        ? closedTrades.reduce(
            (sum, trade) => sum + (trade.holdingPeriod || 0),
            0
          ) / closedTrades.length
        : 0;
    const maxDrawdown =
      closedTrades.length > 0
        ? Math.max(...closedTrades.map((trade) => trade.maxDrawdown || 0))
        : 0;

    // Confidence-based metrics
    const highConfidenceTrades = closedTrades.filter(
      (trade) => trade.confidence === "HIGH"
    );
    const highConfidenceWinRate =
      highConfidenceTrades.length > 0
        ? (highConfidenceTrades.filter((trade) => trade.isWin).length /
            highConfidenceTrades.length) *
          100
        : 0;

    // Signal-based metrics
    const buyTrades = closedTrades.filter((trade) =>
      trade.signal.includes("BUY")
    );
    const sellTrades = closedTrades.filter((trade) =>
      trade.signal.includes("SELL")
    );
    const buyWinRate =
      buyTrades.length > 0
        ? (buyTrades.filter((trade) => trade.isWin).length / buyTrades.length) *
          100
        : 0;
    const sellWinRate =
      sellTrades.length > 0
        ? (sellTrades.filter((trade) => trade.isWin).length /
            sellTrades.length) *
          100
        : 0;

    return {
      totalTrades: closedTrades.length,
      openTrades: filteredTrades.filter((trade) => trade.status === "OPEN")
        .length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      totalReturn,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      avgHoldingPeriod,
      maxDrawdown,
      highConfidenceWinRate,
      buyWinRate,
      sellWinRate,
      sharpeRatio: totalReturn / Math.max(1, Math.sqrt(closedTrades.length)), // Simplified Sharpe
    };
  }, [filteredTrades]);

  // Sector performance breakdown
  const sectorPerformance = useMemo(() => {
    const sectors = {};
    filteredTrades
      .filter((trade) => trade.status !== "OPEN")
      .forEach((trade) => {
        if (!sectors[trade.sector]) {
          sectors[trade.sector] = { trades: 0, wins: 0, totalReturn: 0 };
        }
        sectors[trade.sector].trades++;
        if (trade.isWin) sectors[trade.sector].wins++;
        sectors[trade.sector].totalReturn += trade.returnPercent || 0;
      });

    return Object.entries(sectors)
      .map(([sector, data]) => ({
        sector,
        trades: data.trades,
        winRate: (data.wins / data.trades) * 100,
        avgReturn: data.totalReturn / data.trades,
        totalReturn: data.totalReturn,
      }))
      .sort((a, b) => b.totalReturn - a.totalReturn);
  }, [filteredTrades]);

  // Monthly performance data for chart
  const monthlyPerformance = useMemo(() => {
    const months = {};
    filteredTrades
      .filter((trade) => trade.status !== "OPEN" && trade.exitDate !== null)
      .forEach((trade) => {
        const monthKey = trade.exitDate.toISOString().slice(0, 7); // YYYY-MM
        if (!months[monthKey]) {
          months[monthKey] = { return: 0, trades: 0, wins: 0 };
        }
        months[monthKey].return += trade.returnPercent || 0;
        months[monthKey].trades++;
        if (trade.isWin) months[monthKey].wins++;
      });

    return Object.entries(months)
      .map(([month, data]) => ({
        month,
        return: data.return,
        winRate: (data.wins / data.trades) * 100,
        trades: data.trades,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredTrades]);

  // Export performance data
  const exportPerformanceData = () => {
    const headers = [
      "Symbol",
      "Signal",
      "Confidence",
      "Entry Date",
      "Exit Date",
      "Entry Price",
      "Exit Price",
      "Return %",
      "Status",
      "Holding Period",
      "NISS Score",
      "Sector",
    ];

    const rows = filteredTrades.map((trade) => [
      trade.symbol,
      trade.signal,
      trade.confidence,
      trade.entryDate.toLocaleDateString(),
      trade.exitDate ? trade.exitDate.toLocaleDateString() : "Open",
      trade.entryPrice.toFixed(2),
      trade.exitPrice ? trade.exitPrice.toFixed(2) : "N/A",
      trade.returnPercent ? trade.returnPercent.toFixed(2) : "N/A",
      trade.status,
      trade.holdingPeriod || "N/A",
      trade.nissScore.toFixed(0),
      trade.sector,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance_report_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Performance Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Performance Tracking
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Comprehensive analysis of your institutional trading signals
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportPerformanceData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Data</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Performance Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Target className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm text-green-600">Win Rate</p>
                <p className="text-xl font-bold text-green-900">
                  {performanceMetrics.winRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm text-blue-600">Total Return</p>
                <p
                  className={`text-xl font-bold ${
                    performanceMetrics.totalReturn >= 0
                      ? "text-green-900"
                      : "text-red-900"
                  }`}
                >
                  {performanceMetrics.totalReturn >= 0 ? "+" : ""}
                  {performanceMetrics.totalReturn.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <BarChart2 className="h-5 w-5 text-purple-600 mr-2" />
              <div>
                <p className="text-sm text-purple-600">Profit Factor</p>
                <p className="text-xl font-bold text-purple-900">
                  {performanceMetrics.profitFactor.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Activity className="h-5 w-5 text-orange-600 mr-2" />
              <div>
                <p className="text-sm text-orange-600">Total Trades</p>
                <p className="text-xl font-bold text-orange-900">
                  {performanceMetrics.totalTrades}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <p className="text-sm text-yellow-600">Avg Hold</p>
                <p className="text-xl font-bold text-yellow-900">
                  {performanceMetrics.avgHoldingPeriod.toFixed(1)}d
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <div>
                <p className="text-sm text-red-600">Max Drawdown</p>
                <p className="text-xl font-bold text-red-900">
                  -{performanceMetrics.maxDrawdown.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* View Toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: "overview", label: "Overview", icon: BarChart2 },
              { key: "trades", label: "Trade Log", icon: Activity },
              { key: "analytics", label: "Analytics", icon: PieChart },
              { key: "backtest", label: "Backtest", icon: TrendingUp },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setPerformanceView(key)}
                className={`px-3 py-2 text-sm font-medium rounded-md flex items-center space-x-1 transition-colors ${
                  performanceView === key
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>

          <select
            value={filterConfidence}
            onChange={(e) => setFilterConfidence(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2"
          >
            <option value="all">All Confidence</option>
            <option value="HIGH">High Confidence</option>
            <option value="MEDIUM">Medium Confidence</option>
            <option value="LOW">Low Confidence</option>
          </select>

          <select
            value={filterSignal}
            onChange={(e) => setFilterSignal(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2"
          >
            <option value="all">All Signals</option>
            <option value="BUY">Buy Signals</option>
            <option value="SELL">Sell Signals</option>
          </select>
        </div>
      </div>

      {/* Performance Content Based on View */}
      {performanceView === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Performance Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Monthly Performance
            </h3>
            <div className="space-y-3">
              {monthlyPerformance.slice(-6).map((month, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {new Date(month.month + "-01").toLocaleDateString("en-GB", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          month.return >= 0 ? "bg-green-500" : "bg-red-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            Math.abs(month.return * 2),
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`text-sm font-medium w-16 text-right ${
                        month.return >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {month.return >= 0 ? "+" : ""}
                      {month.return.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sector Performance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Sector Performance
            </h3>
            <div className="space-y-3">
              {sectorPerformance.map((sector, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">
                      {sector.sector}
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        sector.totalReturn >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {sector.totalReturn >= 0 ? "+" : ""}
                      {sector.totalReturn.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-600">
                    <span>{sector.trades} trades</span>
                    <span>Win rate: {sector.winRate.toFixed(1)}%</span>
                    <span>
                      Avg: {sector.avgReturn >= 0 ? "+" : ""}
                      {sector.avgReturn.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confidence Analysis */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confidence Level Analysis
            </h3>
            <div className="space-y-4">
              {["HIGH", "MEDIUM", "LOW"].map((confidence) => {
                const confidenceTrades = filteredTrades.filter(
                  (trade) =>
                    trade.confidence === confidence && trade.status !== "OPEN"
                );
                const winRate =
                  confidenceTrades.length > 0
                    ? (confidenceTrades.filter((trade) => trade.isWin).length /
                        confidenceTrades.length) *
                      100
                    : 0;
                const avgReturn =
                  confidenceTrades.length > 0
                    ? confidenceTrades.reduce(
                        (sum, trade) => sum + (trade.returnPercent || 0),
                        0
                      ) / confidenceTrades.length
                    : 0;

                return (
                  <div key={confidence} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span
                        className={`font-medium ${
                          confidence === "HIGH"
                            ? "text-green-700"
                            : confidence === "MEDIUM"
                            ? "text-yellow-700"
                            : "text-red-700"
                        }`}
                      >
                        {confidence} Confidence
                      </span>
                      <span className="text-sm text-gray-600">
                        {confidenceTrades.length} trades
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Win Rate:</span>
                        <span className="ml-2 font-bold">
                          {winRate.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Avg Return:</span>
                        <span
                          className={`ml-2 font-bold ${
                            avgReturn >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {avgReturn >= 0 ? "+" : ""}
                          {avgReturn.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Best/Worst Trades */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Best & Worst Trades
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-green-700 mb-2">
                  Top Winners
                </h4>
                {filteredTrades
                  .filter((trade) => trade.status !== "OPEN" && trade.isWin)
                  .sort((a, b) => b.returnPercent - a.returnPercent)
                  .slice(0, 3)
                  .map((trade, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center py-1 text-sm"
                    >
                      <span className="font-medium">{trade.symbol}</span>
                      <span className="text-green-600 font-bold">
                        +{trade.returnPercent.toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>

              <div>
                <h4 className="text-sm font-medium text-red-700 mb-2">
                  Biggest Losses
                </h4>
                {filteredTrades
                  .filter((trade) => trade.status !== "OPEN" && !trade.isWin)
                  .sort((a, b) => a.returnPercent - b.returnPercent)
                  .slice(0, 3)
                  .map((trade, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center py-1 text-sm"
                    >
                      <span className="font-medium">{trade.symbol}</span>
                      <span className="text-red-600 font-bold">
                        {trade.returnPercent.toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {performanceView === "trades" && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Trade Log</h3>
            <p className="text-sm text-gray-600 mt-1">
              Detailed record of all trading signals and outcomes
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
                    Signal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entry Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entry Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrades.slice(0, 20).map((trade) => (
                  <tr
                    key={trade.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedTrade(trade)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900">
                          {trade.symbol}
                        </span>
                        <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          {trade.sector}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 text-xs font-bold rounded ${
                            trade.signal.includes("BUY")
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {trade.signal}
                        </span>
                        <span
                          className={`text-xs ${
                            trade.confidence === "HIGH"
                              ? "text-green-600"
                              : trade.confidence === "MEDIUM"
                              ? "text-yellow-600"
                              : "text-gray-600"
                          }`}
                        >
                          {trade.confidence}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trade.entryDate.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${trade.entryPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trade.exitPrice ? `${trade.exitPrice.toFixed(2)}` : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {trade.returnPercent !== null ? (
                        <span
                          className={`text-sm font-bold ${
                            trade.returnPercent >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {trade.returnPercent >= 0 ? "+" : ""}
                          {trade.returnPercent.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          trade.status === "WIN"
                            ? "bg-green-100 text-green-800"
                            : trade.status === "LOSS"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {trade.status === "WIN" && (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        {trade.status === "LOSS" && (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {trade.status === "OPEN" && (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrade(trade);
                        }}
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {performanceView === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk-Adjusted Returns */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Risk-Adjusted Metrics
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-3">
                  <p className="text-sm text-gray-600">Sharpe Ratio</p>
                  <p className="text-xl font-bold text-gray-900">
                    {performanceMetrics.sharpeRatio.toFixed(2)}
                  </p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-sm text-gray-600">Profit Factor</p>
                  <p className="text-xl font-bold text-gray-900">
                    {performanceMetrics.profitFactor.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Risk Distribution
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Low Risk (&lt;2% moves)</span>
                    <span>65%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Medium Risk (2-5% moves)</span>
                    <span>25%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>High Risk (&gt;5% moves)</span>
                    <span>10%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Signal Accuracy */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Signal Accuracy Analysis
            </h3>
            <div className="space-y-4">
              <div className="border rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  NISS Score Accuracy
                </p>
                <div className="space-y-2">
                  {[
                    { range: "80-100", accuracy: 78 },
                    { range: "60-80", accuracy: 65 },
                    { range: "40-60", accuracy: 52 },
                    { range: "<40", accuracy: 45 },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-sm"
                    >
                      <span>NISS {item.range}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${item.accuracy}%` }}
                          />
                        </div>
                        <span className="w-8">{item.accuracy}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Time-to-Target Analysis
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>• 60% of successful trades hit target within 3 days</p>
                  <p>• 85% of successful trades hit target within 7 days</p>
                  <p>• Average time to target: 4.2 days</p>
                </div>
              </div>
            </div>
          </div>

          {/* News Type Performance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              News Type Performance
            </h3>
            <div className="space-y-3">
              {[
                { type: "Earnings", trades: 18, winRate: 72, avgReturn: 8.3 },
                {
                  type: "FDA/Regulatory",
                  trades: 12,
                  winRate: 83,
                  avgReturn: 12.1,
                },
                { type: "Partnership", trades: 8, winRate: 62, avgReturn: 5.7 },
                { type: "M&A", trades: 6, winRate: 100, avgReturn: 15.2 },
                {
                  type: "Analyst Action",
                  trades: 15,
                  winRate: 53,
                  avgReturn: 3.1,
                },
              ].map((newsType, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">
                      {newsType.type}
                    </span>
                    <span className="text-sm text-gray-600">
                      {newsType.trades} trades
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Win Rate:</span>
                      <span className="ml-2 font-bold">
                        {newsType.winRate}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg Return:</span>
                      <span className="ml-2 font-bold text-green-600">
                        +{newsType.avgReturn}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Heat Map */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Performance Heat Map
            </h3>
            <div className="grid grid-cols-7 gap-1">
              {/* Day labels */}
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div
                  key={day}
                  className="text-xs text-gray-500 text-center p-1"
                >
                  {day}
                </div>
              ))}

              {/* Performance cells */}
              {Array.from({ length: 28 }, (_, i) => {
                const performance = Math.random() * 10 - 5;
                const intensity = Math.abs(performance) / 5;
                const isPositive = performance >= 0;
                const shadeLevel =
                  intensity > 0.8 ? "500" : intensity > 0.5 ? "300" : "100";
                const colorClass = isPositive
                  ? `bg-green-${shadeLevel}`
                  : `bg-red-${shadeLevel}`;

                return (
                  <div
                    key={i}
                    className={`h-6 w-6 rounded ${colorClass} flex items-center justify-center`}
                    title={`${performance.toFixed(1)}%`}
                  >
                    <span className="text-xs font-bold text-white">
                      {Math.abs(performance) > 2
                        ? performance > 0
                          ? "+"
                          : "-"
                        : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {performanceView === "backtest" && (
        <div className="space-y-6">
          {/* Backtest Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Historical Backtest Results
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600">Total Signals</p>
                <p className="text-2xl font-bold text-blue-900">1,247</p>
                <p className="text-xs text-blue-700">Last 12 months</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-900">68.3%</p>
                <p className="text-xs text-green-700">Above benchmark</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600">Alpha Generated</p>
                <p className="text-2xl font-bold text-purple-900">+24.7%</p>
                <p className="text-xs text-purple-700">vs S&P 500</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-orange-600">Max Drawdown</p>
                <p className="text-2xl font-bold text-orange-900">-8.2%</p>
                <p className="text-xs text-orange-700">Well controlled</p>
              </div>
            </div>

            {/* Backtest Performance Chart */}
            <div className="border rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Cumulative Performance vs Benchmark
              </h4>
              <div className="h-64 flex items-end space-x-1">
                {Array.from({ length: 52 }, (_, i) => {
                  const strategyReturn = Math.random() * 3 + 0.5;
                  const benchmarkReturn = Math.random() * 2 + 0.2;
                  const maxHeight = 200;

                  return (
                    <div key={i} className="flex flex-col items-center flex-1">
                      <div className="flex flex-col items-center space-y-1 w-full">
                        <div
                          className="bg-blue-500 w-full rounded-t"
                          style={{
                            height: `${(strategyReturn / 3.5) * maxHeight}px`,
                          }}
                          title={`Strategy: +${strategyReturn.toFixed(1)}%`}
                        />
                        <div
                          className="bg-gray-400 w-full rounded-b"
                          style={{
                            height: `${(benchmarkReturn / 3.5) * maxHeight}px`,
                          }}
                          title={`Benchmark: +${benchmarkReturn.toFixed(1)}%`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>12 months ago</span>
                <span>Today</span>
              </div>
              <div className="flex items-center space-x-4 mt-2 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded mr-1" />
                  <span>NISS Strategy</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-400 rounded mr-1" />
                  <span>S&P 500 Benchmark</span>
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Validation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Strategy Validation
              </h4>
              <div className="space-y-4">
                <div className="border rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Signal Quality Over Time
                  </p>
                  <div className="space-y-2">
                    {[
                      { period: "Q1 2024", accuracy: 72, signals: 298 },
                      { period: "Q2 2024", accuracy: 68, signals: 312 },
                      { period: "Q3 2024", accuracy: 71, signals: 287 },
                      { period: "Q4 2024", accuracy: 74, signals: 350 },
                    ].map((quarter, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-sm"
                      >
                        <span>{quarter.period}</span>
                        <div className="flex items-center space-x-2">
                          <span className="w-12">{quarter.accuracy}%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${quarter.accuracy}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {quarter.signals} signals
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Risk Metrics
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Volatility:</span>
                      <span className="ml-2 font-bold">12.3%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Beta:</span>
                      <span className="ml-2 font-bold">0.87</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Information Ratio:</span>
                      <span className="ml-2 font-bold">1.42</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Calmar Ratio:</span>
                      <span className="ml-2 font-bold">3.01</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Market Regime Analysis
              </h4>
              <div className="space-y-4">
                <div className="border rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Performance by Market Condition
                  </p>
                  <div className="space-y-2">
                    {[
                      {
                        condition: "Bull Market",
                        performance: "+31.2%",
                        trades: 847,
                        winRate: 74,
                      },
                      {
                        condition: "Bear Market",
                        performance: "+8.7%",
                        trades: 203,
                        winRate: 58,
                      },
                      {
                        condition: "Sideways",
                        performance: "+12.4%",
                        trades: 197,
                        winRate: 63,
                      },
                    ].map((regime, idx) => (
                      <div key={idx} className="border rounded p-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">
                            {regime.condition}
                          </span>
                          <span className="text-sm font-bold text-green-600">
                            {regime.performance}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>{regime.trades} trades</span>
                          <span>{regime.winRate}% win rate</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Sector Rotation Effectiveness
                  </p>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>
                      • Technology sector: 78% accuracy during growth phases
                    </p>
                    <p>• Healthcare: 82% accuracy during defensive rotations</p>
                    <p>• Energy: 65% accuracy during commodity cycles</p>
                    <p>• Financials: 71% accuracy during rate hiking cycles</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedTrade.symbol} Trade Details
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedTrade.sector} • {selectedTrade.newsType}
                </p>
              </div>
              <button
                onClick={() => setSelectedTrade(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Trade Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Signal & Confidence</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span
                      className={`px-2 py-1 text-sm font-bold rounded ${
                        selectedTrade.signal.includes("BUY")
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {selectedTrade.signal}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        selectedTrade.confidence === "HIGH"
                          ? "text-green-600"
                          : selectedTrade.confidence === "MEDIUM"
                          ? "text-yellow-600"
                          : "text-gray-600"
                      }`}
                    >
                      {selectedTrade.confidence}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">NISS Score</p>
                  <p
                    className={`text-2xl font-bold ${
                      selectedTrade.nissScore > 60
                        ? "text-green-600"
                        : selectedTrade.nissScore < -60
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    {selectedTrade.nissScore.toFixed(0)}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Final Result</p>
                  <div className="flex items-center space-x-2 mt-1">
                    {selectedTrade.status === "WIN" && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {selectedTrade.status === "LOSS" && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    {selectedTrade.status === "OPEN" && (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                    <span
                      className={`text-lg font-bold ${
                        selectedTrade.status === "WIN"
                          ? "text-green-600"
                          : selectedTrade.status === "LOSS"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {selectedTrade.returnPercent !== null
                        ? `${
                            selectedTrade.returnPercent >= 0 ? "+" : ""
                          }${selectedTrade.returnPercent.toFixed(1)}%`
                        : "Open"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trade Timeline */}
              <div className="border rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  Trade Timeline
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <div>
                      <p className="font-medium">Entry Signal Generated</p>
                      <p className="text-sm text-gray-600">
                        {selectedTrade.entryDate.toLocaleDateString()} at $
                        {selectedTrade.entryPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {selectedTrade.exitDate && (
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          selectedTrade.isWin ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium">Position Closed</p>
                        <p className="text-sm text-gray-600">
                          {selectedTrade.exitDate.toLocaleDateString()} at $
                          {selectedTrade.exitPrice.toFixed(2)}
                          {selectedTrade.holdingPeriod &&
                            ` (${selectedTrade.holdingPeriod} days)`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Risk Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Position Sizing
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Position Size:</span>
                      <span className="font-medium">
                        {selectedTrade.positionSize.toFixed(1)}% of portfolio
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Risk/Reward:</span>
                      <span className="font-medium">
                        1:{selectedTrade.riskReward.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Drawdown:</span>
                      <span className="font-medium text-red-600">
                        -{selectedTrade.maxDrawdown.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Trade Metrics
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">News Type:</span>
                      <span className="font-medium">
                        {selectedTrade.newsType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entry Method:</span>
                      <span className="font-medium">Market Order</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Commission:</span>
                      <span className="font-medium">$2.50</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lessons Learned */}
              <div className="border rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  Analysis & Lessons
                </h4>
                <div className="space-y-2 text-sm text-gray-700">
                  {selectedTrade.isWin ? (
                    <>
                      <p>
                        ✅ Signal validation worked as expected with{" "}
                        {selectedTrade.confidence} confidence
                      </p>
                      <p>
                        ✅ Risk management was effective with controlled
                        drawdown
                      </p>
                      <p>
                        ✅ News catalyst ({selectedTrade.newsType}) provided
                        expected momentum
                      </p>
                    </>
                  ) : selectedTrade.status === "LOSS" ? (
                    <>
                      <p>
                        ❌ Market conditions may have changed after signal
                        generation
                      </p>
                      <p>
                        ❌ Consider tighter stop-loss for{" "}
                        {selectedTrade.confidence} confidence signals
                      </p>
                      <p>
                        ❌ {selectedTrade.newsType} events in{" "}
                        {selectedTrade.sector} sector need review
                      </p>
                    </>
                  ) : (
                    <>
                      <p>⏳ Trade still open - monitoring for exit signals</p>
                      <p>⏳ Current unrealized P&L being tracked</p>
                      <p>⏳ Stop-loss and target levels remain active</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceTrackingTab;
