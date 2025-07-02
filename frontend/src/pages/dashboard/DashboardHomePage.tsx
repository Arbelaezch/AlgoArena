import React from 'react';
import { 
  DollarSign,
  TrendingUp,
  Trophy,
  Star,
  Plus,
  BarChart3,
  Target,
  ChevronRight
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trend?: 'up' | 'down';
}

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  action: string;
  color?: 'blue' | 'green' | 'purple';
}

const DashboardHomePage = () => {
  const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon: Icon, trend = 'up' }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className={`text-sm mt-1 font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </p>
        </div>
        <div className={`p-3 rounded-2xl transition-all duration-300 ${
          trend === 'up' 
            ? 'bg-green-100 group-hover:bg-green-200' 
            : 'bg-red-100 group-hover:bg-red-200'
        }`}>
          <Icon size={24} className={`transition-transform duration-300 group-hover:scale-110 ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`} />
        </div>
      </div>
    </div>
  );

  const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, description, icon: Icon, action, color = 'blue' }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-300 cursor-pointer group hover:scale-[1.02]">
      <div className="flex items-start space-x-4">
        <div className={`p-3 rounded-2xl transition-all duration-300 group-hover:scale-110 ${
          color === 'blue' ? 'bg-blue-100 group-hover:bg-blue-200' :
          color === 'green' ? 'bg-green-100 group-hover:bg-green-200' :
          color === 'purple' ? 'bg-purple-100 group-hover:bg-purple-200' :
          'bg-gray-100 group-hover:bg-gray-200'
        }`}>
          <Icon size={24} className={`${
            color === 'blue' ? 'text-blue-600' :
            color === 'green' ? 'text-green-600' :
            color === 'purple' ? 'text-purple-600' :
            'text-gray-600'
          }`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-gray-800 transition-colors">{title}</h3>
          <p className="text-sm text-gray-600 mb-3 group-hover:text-gray-700 transition-colors">{description}</p>
          <button className={`font-medium text-sm flex items-center space-x-1 transition-all duration-200 hover:gap-2 ${
            color === 'blue' ? 'text-blue-600 hover:text-blue-700' :
            color === 'green' ? 'text-green-600 hover:text-green-700' :
            color === 'purple' ? 'text-purple-600 hover:text-purple-700' :
            'text-gray-600 hover:text-gray-700'
          }`}>
            <span>{action}</span>
            <ChevronRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105">
          <Plus size={20} />
          <span>New Strategy</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Portfolio Value" 
          value="$12,450" 
          change="+12.5% this month" 
          icon={DollarSign}
          trend="up"
        />
        <StatCard 
          title="Active Strategies" 
          value="5" 
          change="2 new this week" 
          icon={TrendingUp}
          trend="up"
        />
        <StatCard 
          title="Leaderboard Rank" 
          value="#42" 
          change="↑8 positions" 
          icon={Trophy}
          trend="up"
        />
        <StatCard 
          title="Achievements" 
          value="18" 
          change="3 unlocked recently" 
          icon={Star}
          trend="up"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuickActionCard 
          title="Build Strategy" 
          description="Create a new algorithmic trading strategy" 
          icon={Plus}
          action="Get Started"
          color="blue"
        />
        <QuickActionCard 
          title="Run Backtest" 
          description="Test your strategy against historical data" 
          icon={BarChart3}
          action="Start Testing"
          color="green"
        />
        <QuickActionCard 
          title="Join Challenge" 
          description="Compete in this week's trading challenge" 
          icon={Target}
          action="View Challenges"
          color="purple"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { action: "Strategy 'RSI Momentum' completed backtest", time: "2 hours ago", type: "success" },
              { action: "New achievement unlocked: 'First Blood'", time: "5 hours ago", type: "achievement" },
              { action: "Weekly challenge participation confirmed", time: "1 day ago", type: "challenge" },
              { action: "Strategy 'MACD Cross' paper trade executed", time: "2 days ago", type: "trade" },
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className={`w-3 h-3 rounded-full transition-all duration-200 group-hover:scale-125 ${
                  activity.type === 'success' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                  activity.type === 'achievement' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                  activity.type === 'challenge' ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                  'bg-gradient-to-r from-blue-400 to-blue-600'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900 group-hover:text-gray-800 transition-colors">{activity.action}</p>
                  <p className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHomePage;