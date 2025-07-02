import {
  Home,
  TrendingUp,
  Play,
  Trophy,
  Target,
  Store,
  BarChart3,
  Star,
} from "lucide-react";

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const dashboardNavigationItems: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: Home },
  {
    id: "strategies",
    label: "Strategies",
    path: "/dashboard/strategies",
    icon: TrendingUp,
  },
  {
    id: "backtesting",
    label: "Backtesting",
    path: "/dashboard/backtesting",
    icon: BarChart3,
  },
  {
    id: "paper-trading",
    label: "Paper Trading",
    path: "/dashboard/paper-trading",
    icon: Play,
  },
  {
    id: "leaderboards",
    label: "Leaderboards",
    path: "/dashboard/leaderboards",
    icon: Trophy,
  },
  {
    id: "challenges",
    label: "Challenges",
    path: "/dashboard/challenges",
    icon: Target,
  },
  {
    id: "marketplace",
    label: "Marketplace",
    path: "/dashboard/marketplace",
    icon: Store,
  },
  {
    id: "achievements",
    label: "Achievements",
    path: "/dashboard/achievements",
    icon: Star,
  },
];
