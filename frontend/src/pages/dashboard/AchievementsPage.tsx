import React from 'react';
import { Star } from 'lucide-react';

const AchievementsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Achievements</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { name: "First Blood", description: "Make your first profitable trade", unlocked: true },
          { name: "The Streak", description: "5 consecutive profitable days", unlocked: true },
          { name: "Risk Whisperer", description: "Keep max drawdown under 5%", unlocked: false },
          { name: "Market Timer", description: "Successfully time 3 major moves", unlocked: false },
          { name: "Strategy Guru", description: "Strategy copied 100+ times", unlocked: false },
          { name: "Social Butterfly", description: "50+ community interactions", unlocked: true }
        ].map((achievement, index) => (
          <div key={index} className={`bg-white rounded-xl p-6 shadow-sm border border-gray-200 ${
            achievement.unlocked ? 'border-yellow-200 bg-yellow-50' : ''
          }`}>
            <div className="flex items-center space-x-3 mb-3">
              <Star size={24} className={achievement.unlocked ? 'text-yellow-500' : 'text-gray-400'} />
              <h3 className={`font-semibold ${achievement.unlocked ? 'text-yellow-800' : 'text-gray-900'}`}>
                {achievement.name}
              </h3>
            </div>
            <p className={`text-sm ${achievement.unlocked ? 'text-yellow-700' : 'text-gray-600'}`}>
              {achievement.description}
            </p>
            {achievement.unlocked && (
              <div className="mt-3 text-xs font-medium text-yellow-600">UNLOCKED</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AchievementsPage;