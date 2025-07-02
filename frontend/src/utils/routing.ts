export const routes = {
    // Public routes
    auth: '/auth',
    
    // Dashboard routes
    dashboard: {
      home: '/dashboard',
      strategies: '/dashboard/strategies',
      backtesting: '/dashboard/backtesting',
      paperTrading: '/dashboard/paper-trading',
      leaderboards: '/dashboard/leaderboards',
      challenges: '/dashboard/challenges',
      marketplace: '/dashboard/marketplace',
      achievements: '/dashboard/achievements',
    },
    
    // Other routes
    profile: '/profile',
  } as const;
  
  export type RouteKeys = typeof routes;
  
  // Helper function to generate route paths with parameters
  export function generatePath(template: string, params: Record<string, string | number>): string {
    return Object.entries(params).reduce(
      (path, [key, value]) => path.replace(`:${key}`, String(value)),
      template
    );
  }
  
  // Helper function to check if current path matches a route pattern
  export function matchesRoute(currentPath: string, routePattern: string): boolean {
    const pattern = routePattern.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(currentPath);
  }
  
  // Navigation helper with type safety
  export function createNavigation(navigate: (path: string, options?: any) => void) {
    return {
      toAuth: () => navigate(routes.auth),
      toDashboard: () => navigate(routes.dashboard.home),
      toStrategies: () => navigate(routes.dashboard.strategies),
      toBacktesting: () => navigate(routes.dashboard.backtesting),
      toPaperTrading: () => navigate(routes.dashboard.paperTrading),
      toLeaderboards: () => navigate(routes.dashboard.leaderboards),
      toChallenges: () => navigate(routes.dashboard.challenges),
      toMarketplace: () => navigate(routes.dashboard.marketplace),
      toAchievements: () => navigate(routes.dashboard.achievements),
      toProfile: () => navigate(routes.profile),
    };
  }