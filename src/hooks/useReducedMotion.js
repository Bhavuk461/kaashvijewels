import { useSyncExternalStore } from 'react';

// Media query string for the reduced-motion user preference.
const QUERY = '(prefers-reduced-motion: reduce)';

// A no-op unsubscribe used when subscription cannot be established.
const NOOP = () => {};

/**
 * Subscribe to changes on the `(prefers-reduced-motion: reduce)` MediaQueryList.
 *
 * The function attempts to register a `change` listener via `addEventListener`.
 * Any failure (e.g. `matchMedia` undefined, throwing, or missing listener APIs)
 * results in a no-op subscription so that the hook degrades to a stable `false`
 * value rather than crashing the component tree.
 */
function subscribe(notify) {
  if (typeof window === 'undefined') return NOOP;

  let mql;
  try {
    mql = window.matchMedia(QUERY);
  } catch {
    return NOOP;
  }
  if (!mql || typeof mql.addEventListener !== 'function') return NOOP;

  const listener = () => notify();
  try {
    mql.addEventListener('change', listener);
  } catch {
    return NOOP;
  }

  return () => {
    try {
      mql.removeEventListener('change', listener);
    } catch {
      /* swallow — already cleaned up or unsupported */
    }
  };
}

/**
 * Read the current value of the `(prefers-reduced-motion: reduce)` query.
 * Returns `false` (motion enabled) on any failure so the page remains usable.
 */
function getSnapshot() {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia(QUERY).matches === true;
  } catch {
    return false;
  }
}

/**
 * Server-rendering safe snapshot. Always returns `false` so SSR markup matches
 * the client's safe default (motion enabled) before hydration.
 */
function getServerSnapshot() {
  return false;
}

/**
 * React hook returning `true` when the user has expressed a preference for
 * reduced motion via `(prefers-reduced-motion: reduce)`. The value updates
 * within a single render cycle when the user toggles the system preference.
 *
 * Failure modes (matchMedia unavailable or throwing) resolve to a stable
 * `false` so consumers degrade gracefully without unmounting.
 */
export default function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
