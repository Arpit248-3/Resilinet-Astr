// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

/**
 * TACTICAL TEST SUITE CONFIGURATION
 * Optimized to remove "Useless constructor" and unused parameter warnings.
 */

// 1. Mock Canvas API (Required for NeuralNetworkBackground and Recharts)
import 'jest-canvas-mock';

// 2. Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
};

// 3. Mock window.scrollTo
window.scrollTo = jest.fn();

// 4. Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
};

/**
 * GLOBAL SUPPRESSION
 * Suppresses specific Leaflet/Map warnings for a cleaner test console.
 */
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string') {
    if (args[0].includes('Warning: React does not recognize the %s prop on a DOM element')) return;
    if (args[0].includes('Error: Not implemented: HTMLCanvasElement.prototype.getContext')) return;
  }
  originalError.call(console, ...args);
};