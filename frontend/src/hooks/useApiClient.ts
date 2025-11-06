import { useContext, createContext } from 'react';
import { apiService } from '../services/api';
import type { WidgetApiClient } from '../widget-api';

/**
 * Hook to get the appropriate API client
 * - In standalone widget: uses WidgetApiClient from context
 * - In main app: uses the regular apiService
 */

// Context for widget API (exported from widget-entry.tsx)
export const WidgetApiContext = createContext<WidgetApiClient | null>(null);

export function useApiClient() {
  // Check if we're in widget context
  const widgetApi = useContext(WidgetApiContext);

  if (widgetApi) {
    // We're in standalone widget - return widget API
    return widgetApi;
  }

  // We're in main app - return regular API service
  return apiService;
}
