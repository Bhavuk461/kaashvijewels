import '@testing-library/jest-dom'

// Minimal `window.matchMedia` polyfill for jsdom.
// Tests that depend on a specific media-query result should override
// `window.matchMedia` (or the returned MediaQueryList) themselves.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}
