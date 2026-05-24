import { useCallback, useRef } from 'react';
import { useParallaxContext } from './ParallaxProvider';
import { clampSpeed } from './parallaxMath';

// Stable no-op used when registration fails or the hook is mounted outside a
// `<ParallaxProvider>`. Returning a no-op unregister keeps the cleanup path
// uniform regardless of whether registration actually succeeded.
const NOOP = () => {};

/**
 * Per-module parallax hook. Returns a callback `ref` that, when attached to a
 * DOM element, registers that element with the surrounding `<ParallaxProvider>`
 * so the provider's rAF tick can mutate `el.style.transform` directly each
 * frame (R3.1, R3.6, R10.5). The hook itself never writes a style — it only
 * manages registration lifecycle.
 *
 * - `speedFactor` is clamped to `[-0.6, 0.6]` (R3.4) at registration time.
 * - The callback ref's identity changes when the clamped `speedFactor`
 *   changes, so React automatically calls it with `null` (detach → old
 *   unregister) and then with the element (attach → new register). That gives
 *   us re-registration on speed change without an extra effect, and avoids
 *   the double-register that would otherwise happen on mount.
 * - `opts.mobileScale` defaults to `true`; the provider already applies
 *   `scaleSpeedForViewport` inside its rAF tick, so this flag is reserved for
 *   future opt-out and is currently informational.
 * - On any failure — provider missing (`useParallaxContext` throws) or
 *   `registerParallax` itself throws — the returned `ref` becomes an inert
 *   no-op so the consuming component still renders in its static state
 *   instead of crashing the page (R6.6).
 *
 * @param {number} speedFactor — desired drift coefficient before clamping.
 * @param {{ mobileScale?: boolean }} [opts]
 * @returns {{ ref: (el: HTMLElement | null) => void }}
 */
export default function useParallax(speedFactor, opts) {
  // `mobileScale` defaults to `true`. Treat any value other than the explicit
  // `false` as enabled, mirroring the design's defaulting rule.
  const mobileScale = !(opts && opts.mobileScale === false);

  // Read the context defensively. `useParallaxContext` throws when the hook
  // is used outside a `<ParallaxProvider>`; the throw happens *after* its
  // single underlying `useContext` call, so the hook order on this component
  // is stable across renders even when we wrap the read in try/catch.
  // Falling back to `null` lets `useParallax` degrade to an inert ref instead
  // of taking the page down (R6.6).
  let ctx;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- see comment above; underlying useContext is unconditional.
    ctx = useParallaxContext();
  } catch {
    ctx = null;
  }

  // The latest unregister returned by the provider for the currently-attached
  // element. Stored in a ref so the callback ref can reach it across renders
  // without re-creating itself.
  const unregisterRef = useRef(NOOP);

  const registerParallax = ctx ? ctx.registerParallax : null;
  const clamped = clampSpeed(speedFactor);

  const ref = useCallback(
    (el) => {
      // Always tear down the previous registration first so the provider's
      // registry never holds a stale record for an element that has been
      // detached (or for the same element under an outdated speed factor).
      try {
        unregisterRef.current();
      } catch {
        // swallow — the provider's own cleanup is defensive too.
      }
      unregisterRef.current = NOOP;

      // Detach (`el === null`) or no provider available — leave the ref inert.
      if (!el || !registerParallax) return;

      try {
        const unregister = registerParallax(el, clamped);
        unregisterRef.current = typeof unregister === 'function' ? unregister : NOOP;
      } catch {
        // Registration failed — leave the ref inert. The element will simply
        // render in its static, untransformed state (R6.6).
        unregisterRef.current = NOOP;
      }
    },
    // Re-creating the callback when `clamped` changes is intentional: React
    // calls the old callback with `null` (running our cleanup) and then the
    // new callback with the element, so the provider sees a clean re-register
    // under the updated speed factor.
    [registerParallax, clamped]
  );

  // Reference `mobileScale` so lint doesn't strip the parameter parsing; the
  // flag is part of the public API surface even though the provider applies
  // viewport scaling unconditionally in its rAF tick today.
  void mobileScale;

  return { ref };
}
