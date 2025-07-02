import React from 'react';
import { Play } from 'lucide-react';

const PaperTradingPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Paper Trading</h1>
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
        <Play size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Paper Trading</h3>
        <p className="text-gray-600">Execute your strategies with virtual money in real-time</p>
      </div>
    </div>
  );
};

export default PaperTradingPage;