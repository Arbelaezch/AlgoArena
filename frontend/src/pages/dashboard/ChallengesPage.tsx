import React from 'react';

const ChallengesPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Challenges</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: "Beat the S&P", description: "Outperform SPY this week", participants: 342, reward: "Achievement Badge" },
          { title: "Low Vol Hero", description: "Highest returns with <10% volatility", participants: 128, reward: "Premium Badge" },
          { title: "Sector Specialist", description: "Best returns using only one sector", participants: 89, reward: "Crown Badge" }
        ].map((challenge, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">{challenge.title}</h3>
            <p className="text-gray-600 mb-4">{challenge.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{challenge.participants} participants</span>
              <span className="text-sm font-medium text-blue-600">{challenge.reward}</span>
            </div>
            <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Join Challenge
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChallengesPage;