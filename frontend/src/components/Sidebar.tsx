import React, { useTransition } from 'react';
import { Link } from 'react-router';

import { useNavigation } from '@/contexts/useNavigation';

interface SidebarProps {
  isMobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isMobileMenuOpen, 
  onMobileMenuClose 
}) => {
  const [isPending, startTransition] = useTransition();
  const { navigationItems, isActiveTab } = useNavigation();

  const handleNavClick = () => {
    startTransition(() => {
      onMobileMenuClose();
    });
  };

  return (
    <aside className={`${
      isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
    } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-lg border-r border-gray-200 transition-transform duration-300 ease-in-out flex flex-col h-full`}>
      
      {/* Navigation Section */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <nav className="space-y-2 p-6 pt-8">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveTab(item.id);
            
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={handleNavClick}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                } ${isPending ? 'opacity-50' : ''}`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
                {isPending && isActive && (
                  <div className="ml-auto w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      
      {/* Upgrade Card Section */}
      <div className="flex-shrink-0 p-6">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 text-white">
          <h3 className="font-semibold mb-2">Upgrade to Pro</h3>
          <p className="text-sm text-blue-100 mb-3">Unlock unlimited strategies and advanced features</p>
          <button className="w-full bg-white text-blue-600 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
            Upgrade Now
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;