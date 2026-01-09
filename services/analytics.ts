import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const GA_MEASUREMENT_ID = 'G-BJPWBB6KYZ';

declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: Record<string, any>) => void;
  }
}

// Log a specific action
export const logEvent = (action: string, params?: Record<string, any>) => {
  if (window.gtag) {
    window.gtag('event', action, params);
  } else {
    // Optional: Log to console in dev mode if needed
    // console.log(`[GA] ${action}`, params);
  }
};

// Hook to track page views on route change
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    if (window.gtag) {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search
      });
    }
  }, [location]);
};