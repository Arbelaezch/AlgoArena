import React from 'react';
import { Crown, Activity, Zap } from 'lucide-react';

const LeaderboardsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Leaderboards</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { title: "Monthly Returns", icon: Crown, color: "yellow" },
          { title: "Sharpe Ratio", icon: Activity, color: "green" },
          { title: "Consistency", icon: Zap, color: "blue" }
        ].map((board, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <board.icon size={24} className={`text-${board.color}-600`} />
              <h3 className="font-semibold text-gray-900">{board.title}</h3>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((rank) => (
                <div key={rank} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500">#{rank}</span>
                    <span className="text-sm text-gray-900">Trader{rank}</span>
                  </div>
                  <span className="text-sm font-medium text-green-600">+{15 - rank * 2}.{5 - rank}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardsPage;