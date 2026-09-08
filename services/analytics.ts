import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Injected at build time from GA_MEASUREMENT_ID in your local env file.
// Empty means analytics is disabled, which is the default for a fresh clone.
export const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || '';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

let initialized = false;

// Loads gtag.js and opens the measurement session.
// No-op when no measurement ID is configured, so forks never report to someone else's property.
export const initAnalytics = () => {
  if (initialized || !GA_MEASUREMENT_ID) return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  // gtag.js expects the raw `arguments` object on dataLayer, not an array.
  function gtag(..._args: any[]) {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
};

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
