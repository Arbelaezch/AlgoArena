import React from 'react';
import { BarChart3 } from 'lucide-react';

const BacktestingPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Backtesting</h1>
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
        <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Backtesting Engine</h3>
        <p className="text-gray-600">Test your strategies against historical market data</p>
      </div>
    </div>
  );
};

export default BacktestingPage;