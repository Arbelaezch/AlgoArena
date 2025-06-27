import React from 'react';

import { useAuth } from '@/hooks/auth/useAuth';

const Dashboard: React.FC = () => {
  const { user, logout, isLoading } = useAuth();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || user?.email.charAt(0).toUpperCase() || '?';
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-8">
            {/* User Info Section */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                {getInitials(user.first_name, user.last_name)}
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome{user.first_name ? `, ${user.first_name}` : ''}!
              </h2>
              
              <p className="text-gray-600 mb-2">{user.email}</p>
              
              <p className="text-sm text-gray-500">
                Member since: {formatDate(user.created_at)}
              </p>
            </div>

            {/* Protected Content Section */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-green-800 mb-2 flex items-center">
                🎯 You're successfully authenticated!
              </h3>
              <p className="text-green-700 mb-2">
                This is a protected area that requires a valid JWT token.
              </p>
              <p className="text-green-600 text-sm">
                Your access token will expire in 15 minutes and refresh automatically.
              </p>
            </div>

            {/* User Stats/Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-1">Account Balance</h4>
                <p className="text-2xl font-bold text-blue-900">
                  ${user.balance?.toLocaleString() || '0'}
                </p>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-purple-800 mb-1">Account Type</h4>
                <p className="text-lg font-semibold text-purple-900">Trader</p>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-orange-800 mb-1">Status</h4>
                <p className="text-lg font-semibold text-orange-900">Active</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Start Trading
              </button>
              
              <button className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                View Portfolio
              </button>
              
              <button
                onClick={logout}
                disabled={isLoading}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;