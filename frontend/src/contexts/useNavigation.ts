import { useContext } from "react";

import { NavigationContext } from "@/types/navigation";
import type { NavigationContextType } from "@/types/navigation";

export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
