import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Clock } from 'lucide-react';
import DataService from '../api/dataService';

const StockScreener = () => {
  const [stocks, setStocks] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const watchlist = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];

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
      const promises = watchlist.map(symbol => DataService.getStockData(symbol));
      const results = await Promise.all(promises);
      
      const stockData = {};
      results.forEach(result => {
        if (result.quote) {
          stockData[result.symbol] = result;
        }
      });
      
      setStocks(stockData);
    } catch (error) {
      console.error('Error loading stocks:', error);
    }
    setLoading(false);
  };

  const londonTime = currentTime.toLocaleTimeString('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const getSignal = (nissScore, changePercent) => {
    if (nissScore > 70 && changePercent > 0) return { signal: 'BUY', color: 'text-green-600' };
    if (nissScore > 70 && changePercent < 0) return { signal: 'SELL', color: 'text-red-600' };
    return { signal: 'HOLD', color: 'text-gray-600' };
  };

  if (loading && Object.keys(stocks).length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">News Impact Stock Screener</h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <Clock className="inline h-4 w-4 mr-1" />
                London: {londonTime}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Stock Watchlist</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NISS Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">News</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.values(stocks).map((stock) => {
                  const { signal, color } = getSignal(stock.nissScore, stock.quote?.changePercent || 0);
                  return (
                    <tr key={stock.symbol} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {stock.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${stock.quote?.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className={`flex items-center ${stock.quote?.changePercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stock.quote?.changePercent > 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                          {stock.quote?.changePercent.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`font-bold ${stock.nissScore > 70 ? 'text-blue-600' : 'text-gray-600'}`}>
                          {stock.nissScore}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-semibold ${color}`}>{signal}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stock.news.length} articles
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StockScreener;