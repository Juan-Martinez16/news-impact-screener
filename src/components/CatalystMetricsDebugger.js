import React, { useState } from 'react';
import { AlertCircle, RefreshCw, CheckCircle, XCircle, Info } from 'lucide-react';

const CatalystMetricsDebugger = ({ stockData, screeningResults }) => {
  const [selectedStock, setSelectedStock] = useState(null);
  const [debugMode, setDebugMode] = useState(true);

  // Get a sample stock for debugging
  const sampleStock = screeningResults?.[0] || Object.values(stockData)?.[0];
  const debugStock = selectedStock || sampleStock;

  // Diagnostic functions
  const checkNISSScore = () => {
    if (!debugStock) return { status: 'error', message: 'No stock data available' };
    
    const nissScore = debugStock.nissScore;
    if (nissScore === undefined) return { status: 'error', message: 'NISS Score is undefined' };
    if (nissScore === 0) return { status: 'warning', message: 'NISS Score is 0 - likely calculation issue' };
    if (Math.abs(nissScore) > 100) return { status: 'warning', message: 'NISS Score seems abnormally high' };
    return { status: 'success', message: `NISS Score: ${nissScore} (Normal)` };
  };

  const checkVolumeData = () => {
    if (!debugStock?.quote) return { status: 'error', message: 'No quote data available' };
    
    const { volume, avgVolume } = debugStock.quote;
    if (!volume) return { status: 'error', message: 'Current volume missing' };
    if (!avgVolume) return { status: 'error', message: 'Average volume missing' };
    
    const ratio = volume / avgVolume;
    return { 
      status: ratio !== 1 ? 'success' : 'warning', 
      message: `Volume: ${volume?.toLocaleString()}, Avg: ${avgVolume?.toLocaleString()}, Ratio: ${ratio.toFixed(2)}x`,
      data: { volume, avgVolume, ratio }
    };
  };

  const checkDataService = () => {
    const isScreeningResults = screeningResults && screeningResults.length > 0;
    const isStockData = stockData && Object.keys(stockData).length > 0;
    
    if (!isScreeningResults && !isStockData) {
      return { status: 'error', message: 'No data from either service' };
    }
    
    if (!isScreeningResults) {
      return { status: 'warning', message: 'InstitutionalDataService not working - using basic DataService only' };
    }
    
    return { status: 'success', message: 'InstitutionalDataService working correctly' };
  };

  const StatusIcon = ({ status }) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const diagnostics = [
    { name: 'Data Service', check: checkDataService },
    { name: 'NISS Score', check: checkNISSScore },
    { name: 'Volume Data', check: checkVolumeData },
  ];

  if (!debugMode) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setDebugMode(true)}
          className="bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600"
          title="Show Debug Info"
        >
          <Info className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border w-96 max-h-96 overflow-y-auto z-50">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Catalyst Debug</h3>
        <button
          onClick={() => setDebugMode(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="p-4 space-y-3">
        {diagnostics.map(({ name, check }) => {
          const result = check();
          return (
            <div key={name} className="flex items-start gap-3">
              <StatusIcon status={result.status} />
              <div className="flex-1">
                <div className="text-sm font-medium">{name}</div>
                <div className="text-xs text-gray-600">{result.message}</div>
              </div>
            </div>
          );
        })}
        
        {debugStock && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs bg-gray-50 p-2 rounded">
              <div><strong>Symbol:</strong> {debugStock.symbol}</div>
              <div><strong>NISS:</strong> {debugStock.nissScore}</div>
              <div><strong>Price:</strong> ${debugStock.quote?.price?.toFixed(2)}</div>
              <div><strong>News:</strong> {debugStock.news?.length || 0} articles</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalystMetricsDebugger;