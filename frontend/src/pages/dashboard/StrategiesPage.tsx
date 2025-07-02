import React from 'react';
import { TrendingUp, Plus } from 'lucide-react';

const StrategiesPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Strategies</h1>
        <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105">
          <Plus size={20} />
          <span>Create Strategy</span>
        </button>
      </div>
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 text-center group hover:shadow-lg transition-all duration-300">
        <div className="p-4 rounded-2xl bg-gray-100 inline-block mb-4 group-hover:bg-gray-200 transition-colors">
          <TrendingUp size={48} className="text-gray-400 group-hover:text-gray-500 transition-colors" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Strategy Builder Coming Soon</h3>
        <p className="text-gray-600">Visual drag-and-drop interface for creating trading strategies</p>
      </div>
    </div>
  );
};

export default StrategiesPage;