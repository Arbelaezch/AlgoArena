import React from 'react';
import { Store } from 'lucide-react';

const MarketplacePage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Strategy Marketplace</h1>
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
        <Store size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Marketplace Coming Soon</h3>
        <p className="text-gray-600">Buy and sell successful trading strategies with the community</p>
      </div>
    </div>
  );
};

export default MarketplacePage;