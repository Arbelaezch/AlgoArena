import React, { useState, useTransition, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  TrendingUp, 
  User,
  Bell,
  Search,
  Menu,
  X,
  BarChart3,
  Zap,
  Star,
  Crown,
  Activity,
  Calendar,
  DollarSign,
  ChevronRight,
  Plus,
  Play,
  Trophy,
  Target,
  Store
} from 'lucide-react';

import Sidebar from '@components/Sidebar';
import { useAuth } from '@/hooks/auth/useAuth';


// Type definitions for remaining components
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

const DashboardPage = () => {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl shadow-2xl">
          <div className="flex items-center space-x-3">
            <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-gray-700">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
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
      
      case 'strategies':
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

      case 'backtesting':
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

      case 'paper-trading':
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

      case 'leaderboards':
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

      case 'challenges':
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

      case 'marketplace':
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

      case 'achievements':
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

      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 lg:px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">AlgoArena</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative hidden md:block">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search strategies..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="p-2 rounded-lg hover:bg-gray-100 relative">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>
            <button 
              onClick={handleProfile}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <User size={20} className="text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export { DashboardPage };
export default DashboardPage;