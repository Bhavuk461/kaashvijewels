import { useCallback, useEffect, useRef, useState } from 'react';
import { useParallaxContext } from './ParallaxProvider';

// Stable no-op used as the inert ref returned outside a provider, as a default
// unregister, and as a placeholder while no element is attached.
const NOOP = () => {};

/**
 * Per-module reveal-on-scroll hook.
 *
 * Returns a callback ref to attach to the reveal target plus an `isVisible`
 * boolean that flips to `true` the first time the element intersects the
 * viewport. The single shared `IntersectionObserver` lives on
 * `ParallaxProvider`, which unobserves on first reveal so the animation does
 * not retrigger on subsequent scrolls (R4.3, Property 7).
 *
 * Behavior:
 *   - `isVisible` starts `true` when the engine reports `reducedMotion`
 *     (R6.3) so the static state shows immediately and content is never
 *     animated for users with motion sensitivity.
 *   - When used outside a `<ParallaxProvider>`, returns
 *     `{ ref: noop, isVisible: true }` so consumers never accidentally hide
 *     content when the provider is missing.
 *   - Registration is wrapped in `try/catch`; on failure `isVisible` is
 *     forced to `true` (R6.6, Property 8) so reveal-tagged content is never
 *     stuck hidden if the engine throws.
 *
 * @param {number} [threshold=0.15] IntersectionObserver intersection ratio
 *   forwarded to the provider's reveal registration.
 * @returns {{ ref: (el: HTMLElement | null) => void, isVisible: boolean }}
 */
export default function useReveal(threshold = 0.15) {
  // Read the engine context. `useParallaxContext` throws when used outside
  // the provider, but that condition is structural for a given mount: the
  // `useContext` call inside it ALWAYS runs unconditionally (only the post-
  // hook throw is conditional), so React's hook-call order is preserved
  // across every render of this hook instance.
  let ctx = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- see comment above; underlying useContext is always called.
    ctx = useParallaxContext();
  } catch {
    ctx = null;
  }

  const reducedMotion = !!(ctx && ctx.reducedMotion);
  const [isVisible, setVisible] = useState(reducedMotion);

  // Persists the unregister returned by the provider so we can tear down on
  // ref detach (el === null) or unmount even though the callback ref closes
  // over different values across renders.
  const unregisterRef = useRef(NOOP);

  const ref = useCallback(
    (el) => {
      // Always tear down any prior registration before handling the new ref.
      // This covers both ref detach (el === null) and ref swap (el changed).
      try { unregisterRef.current(); } catch { /* swallow */ }
      unregisterRef.current = NOOP;

      if (!ctx || !el) return;

      try {
        const unregister = ctx.registerReveal(el, threshold, () => setVisible(true));
        unregisterRef.current = typeof unregister === 'function' ? unregister : NOOP;
      } catch {
        // Engine registration failed — surface the content (R6.6) so reveal
        // targets never stay invisible because of a downstream engine bug.
        setVisible(true);
        unregisterRef.current = NOOP;
      }
    },
    [ctx, threshold]
  );

  // Final cleanup on unmount — guarantees the provider's registry never
  // retains a reference to a detached element after the consumer is gone.
  useEffect(() => {
    return () => {
      try { unregisterRef.current(); } catch { /* swallow */ }
      unregisterRef.current = NOOP;
    };
  }, []);

  // Outside the provider — return inert ref + visible content (R6.6).
  if (!ctx) {
    return { ref: NOOP, isVisible: true };
  }

  return { ref, isVisible };
}
