import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Suspense, lazy } from 'react';

import { AuthProvider } from '@/hooks/auth/useAuth';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { AuthPage } from '@/pages/AuthPage';
import ProfilePage from '@/pages/ProfilePage';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { dashboardNavigationItems } from '@/config/navigation';

// Lazy load dashboard pages for better performance
const DashboardHomePage = lazy(() => import('@/pages/dashboard/DashboardHomePage'));
const StrategiesPage = lazy(() => import('@/pages/dashboard/StrategiesPage'));
const BacktestingPage = lazy(() => import('@/pages/dashboard/BacktestingPage'));
const PaperTradingPage = lazy(() => import('@/pages/dashboard/PaperTradingPage'));
const LeaderboardsPage = lazy(() => import('@/pages/dashboard/LeaderboardsPage'));
const ChallengesPage = lazy(() => import('@/pages/dashboard/ChallengesPage'));
const MarketplacePage = lazy(() => import('@/pages/dashboard/MarketplacePage'));
const AchievementsPage = lazy(() => import('@/pages/dashboard/AchievementsPage'));

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="flex items-center space-x-3">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <span className="text-gray-600">Loading...</span>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Protected dashboard routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <NavigationProvider navigationItems={dashboardNavigationItems}>
                    <DashboardLayout />
                  </NavigationProvider>
                </ProtectedRoute>
              }
            >
              <Route 
                index 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <DashboardHomePage />
                  </Suspense>
                } 
              />
              <Route 
                path="strategies" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <StrategiesPage />
                  </Suspense>
                } 
              />
              <Route 
                path="backtesting" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <BacktestingPage />
                  </Suspense>
                } 
              />
              <Route 
                path="paper-trading" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PaperTradingPage />
                  </Suspense>
                } 
              />
              <Route 
                path="leaderboards" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <LeaderboardsPage />
                  </Suspense>
                } 
              />
              <Route 
                path="challenges" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ChallengesPage />
                  </Suspense>
                } 
              />
              <Route 
                path="marketplace" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <MarketplacePage />
                  </Suspense>
                } 
              />
              <Route 
                path="achievements" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AchievementsPage />
                  </Suspense>
                } 
              />
            </Route>

            {/* Profile route (also protected, using dashboard layout) */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <NavigationProvider navigationItems={dashboardNavigationItems}>
                    <DashboardLayout />
                  </NavigationProvider>
                </ProtectedRoute>
              }
            >
              <Route 
                index 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ProfilePage />
                  </Suspense>
                } 
              />
            </Route>
            
            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;