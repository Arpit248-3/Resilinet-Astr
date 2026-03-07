/**
 * TACTICAL PERFORMANCE MONITORING
 * This module tracks the 'Health Metrics' of the ResiliNet Frontend.
 * It measures how quickly the Command Map and Analytics render.
 */

const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // Dynamic import to keep the initial 'Boot Sequence' light
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      
      // 1. Cumulative Layout Shift (Visual Stability)
      getCLS(onPerfEntry);
      
      // 2. First Input Delay (Tactical Responsiveness)
      getFID(onPerfEntry);
      
      // 3. First Contentful Paint (Boot Speed)
      getFCP(onPerfEntry);
      
      // 4. Largest Contentful Paint (Map/Dashboard Load)
      getLCP(onPerfEntry);
      
      // 5. Time to First Byte (Handshake Speed with Backend)
      getTTFB(onPerfEntry);
    }).catch(err => {
      console.error("[TELEMETRY_ERROR] Failed to load web-vitals:", err);
    });
  }
};

export default reportWebVitals;