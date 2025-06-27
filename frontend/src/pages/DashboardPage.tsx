import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { useAuth } from '@/hooks/auth/useAuth';


export function DashboardPage() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

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

  // const formatDate = (dateString: string) => {
  //   return new Date(dateString).toLocaleDateString('en-US', {
  //     year: 'numeric',
  //     month: 'long',
  //     day: 'numeric'
  //   });
  // };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 flex items-center justify-center p-5">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-2xl relative overflow-hidden">
        {/* Top gradient border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Trading Simulator Dashboard</h1>
          <p className="text-gray-600">Welcome to your algorithmic trading playground</p>
        </div>

        {/* User Info Card */}
        <div className="bg-gray-50 p-6 rounded-2xl mb-8">
          {/* User Avatar */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {/* {user.username.charAt(0).toUpperCase()} */}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Welcome, {user.first_name} {user.last_name}!</h2>
              <p className="text-gray-600">{user.email}</p>
              {/* <p className="text-sm text-gray-500">Member since: {formatDate(user.createdAt)}</p> */}
            </div>
          </div>
        </div>

        {/* Protected Content */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg mb-8">
          <div className="flex items-center mb-3">
            <div className="text-2xl mr-3">🎯</div>
            <h3 className="text-lg font-semibold text-blue-800">You're successfully authenticated!</h3>
          </div>
          <p className="text-blue-700 mb-2">
            This is a protected area that requires a valid JWT token.
          </p>
          <p className="text-blue-600 text-sm">
            Your access token will expire in 15 minutes and refresh automatically.
          </p>
        </div>

        {/* Quick Stats or Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-100 to-green-200 p-4 rounded-xl text-center">
            <div className="text-2xl mb-2">📈</div>
            <h4 className="font-semibold text-green-800">Portfolio</h4>
            <p className="text-green-600 text-sm">View your trades</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 p-4 rounded-xl text-center">
            <div className="text-2xl mb-2">⚡</div>
            <h4 className="font-semibold text-yellow-800">Algorithms</h4>
            <p className="text-yellow-600 text-sm">Manage strategies</p>
          </div>
          <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-4 rounded-xl text-center">
            <div className="text-2xl mb-2">📊</div>
            <h4 className="font-semibold text-purple-800">Analytics</h4>
            <p className="text-purple-600 text-sm">Track performance</p>
          </div>
        </div>

        {/* Logout Button */}
        <div className="text-center">
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}