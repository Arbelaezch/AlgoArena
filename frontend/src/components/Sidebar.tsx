import React, { useTransition } from 'react';
import { 
  Home, 
  TrendingUp, 
  Play, 
  Trophy, 
  Target, 
  Store,
  BarChart3,
  Star
} from 'lucide-react';

// Type definitions
interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface NavItemProps {
  item: NavigationItem;
  isActive: boolean;
  onClick: (id: string) => void;
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isMobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  isMobileMenuOpen, 
  onMobileMenuClose 
}) => {
  const [isPending, startTransition] = useTransition();

  const navigationItems: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'strategies', label: 'Strategies', icon: TrendingUp },
    { id: 'backtesting', label: 'Backtesting', icon: BarChart3 },
    { id: 'paper-trading', label: 'Paper Trading', icon: Play },
    { id: 'leaderboards', label: 'Leaderboards', icon: Trophy },
    { id: 'challenges', label: 'Challenges', icon: Target },
    { id: 'marketplace', label: 'Marketplace', icon: Store },
    { id: 'achievements', label: 'Achievements', icon: Star },
  ];

  const NavItem: React.FC<NavItemProps> = ({ item, isActive, onClick }) => {
    const Icon = item.icon;
    
    const handleClick = () => {
      startTransition(() => {
        onClick(item.id);
      });
    };

    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
          isActive 
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25' 
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50'
        }`}
      >
        <Icon size={20} />
        <span className="font-medium">{item.label}</span>
        {isPending && isActive && (
          <div className="ml-auto w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
      </button>
    );
  };

  return (
    <aside className={`${
      isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
    } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-lg border-r border-gray-200 transition-transform duration-300 ease-in-out flex flex-col h-full`}>
      
      {/* Navigation Section */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <nav className="space-y-2 p-6 pt-8">
          {navigationItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              isActive={activeTab === item.id}
              onClick={(id) => {
                onTabChange(id);
                onMobileMenuClose();
              }}
            />
          ))}
        </nav>
      </div>
      
      {/* Spacer to push upgrade card to bottom */}
      <div className="flex-shrink-0">
        {/* Upgrade Card Section */}
        <div className="p-6">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 text-white">
            <h3 className="font-semibold mb-2">Upgrade to Pro</h3>
            <p className="text-sm text-blue-100 mb-3">Unlock unlimited strategies and advanced features</p>
            <button className="w-full bg-white text-blue-600 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;