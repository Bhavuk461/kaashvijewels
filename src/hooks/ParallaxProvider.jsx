import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useReducedMotion from './useReducedMotion';
import { clampSpeed, computeParallaxOffset, isInViewportBuffer } from './parallaxMath';

// React context exposing the parallax engine to consumer hooks.
// `null` is the default so `useParallaxContext` can detect misuse outside the provider.
const ParallaxContext = createContext(null);

// Stable no-op used as a fallback unregister and as a `cleanup` placeholder.
const NOOP = () => {};

/**
 * Read the parallax engine context. Throws when used outside `<ParallaxProvider>`
 * so consumers fail fast during development rather than silently no-oping.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useParallaxContext() {
  const ctx = useContext(ParallaxContext);
  if (!ctx) {
    throw new Error('useParallaxContext must be used within a <ParallaxProvider>');
  }
  return ctx;
}

/**
 * Owns the single passive `scroll` listener and the single `IntersectionObserver`
 * that drive every parallax/reveal module on the homepage. Per the design (R10.2,
 * R10.3, R10.5) the provider — not the per-module hook — is the only writer of
 * `style.transform`, so the rAF tick is the lone path that mutates the DOM and
 * layout-thrash races are eliminated.
 *
 * The engine is initialized **lazily** on the first `registerParallax` /
 * `registerReveal` call. This matters because React invokes a child's callback
 * ref *before* the parent's `useEffect` runs — if we deferred observer
 * construction to mount-time `useEffect`, every child registering on attach
 * would see a `null` observer and silently no-op. Lazy init guarantees the
 * observer exists the first time anyone tries to use it.
 *
 * On any initialization failure (matchMedia / addEventListener / IntersectionObserver
 * throwing) the provider flips into a static fallback in which `reducedMotion` is
 * reported as `true` and the register functions become no-ops that return no-op
 * unregisters, satisfying R6.5 / R6.6 / Property 8.
 */
export default function ParallaxProvider({ children }) {
  const userReducedMotion = useReducedMotion();
  const [forceStatic, setForceStatic] = useState(false);

  const reducedMotion = userReducedMotion || forceStatic;

  // Registries — Maps so register/unregister is O(1) and iteration order is
  // insertion order. Per design: ParallaxRecord = { speedFactor, cleared },
  // RevealRecord = { threshold, onReveal, fired }.
  const parallaxMapRef = useRef(new Map());
  const revealMapRef = useRef(new Map());

  // Engine state.
  const observerRef = useRef(null);
  const onScrollRef = useRef(null);
  const engineReadyRef = useRef(false);  // true once the lazy init has run successfully.
  const rafIdRef = useRef(0);            // 0 means "no rAF pending" — idempotent scheduling sentinel.
  const reducedMotionRef = useRef(reducedMotion); // mirrored into the rAF tick without re-creating it.
  const initFailedRef = useRef(false);   // synchronous twin of `forceStatic` — readable from register fns.

  // The tick. Reads scroll/vw/vh once, then iterates the registry and
  // writes transforms directly. Called either from the passive `scroll`
  // listener (synchronous, zero-latency) or from `requestAnimationFrame`
  // when registrations change. Every per-module write is wrapped in
  // try/catch so a faulty module never blocks the rest (Property 8 / R6.6).
  const tick = useCallback(() => {
    rafIdRef.current = 0;

    let scrollY;
    let vh;
    let vw;
    try {
      scrollY = window.scrollY;
      vh = window.innerHeight;
      vw = window.innerWidth;
    } catch {
      return;
    }

    const isReduced = reducedMotionRef.current;

    for (const [el, rec] of parallaxMapRef.current) {
      try {
        if (isReduced) {
          if (!rec.cleared) {
            el.style.transform = '';
            rec.cleared = true;
          }
          continue;
        }

        rec.cleared = false;

        const rect = el.getBoundingClientRect();
        if (!isInViewportBuffer(rect.top, rect.bottom, vh)) {
          continue;
        }

        const y = computeParallaxOffset(scrollY, rec.speedFactor, vw);
        el.style.transform = `translate3d(0, ${y}px, 0)`;
      } catch {
        // Per-module failure: skip this module this frame.
      }
    }
  }, []);

  // Idempotent rAF scheduler. Multiple scroll events between frames coalesce
  // into a single tick (R3.2, Property 9).
  const scheduleTick = useCallback(() => {
    if (initFailedRef.current) return;
    if (rafIdRef.current !== 0) return;
    if (typeof window === 'undefined') return;
    try {
      rafIdRef.current = window.requestAnimationFrame(tick);
    } catch {
      // rAF unavailable or threw — leave rafId at 0 so future schedules retry.
      rafIdRef.current = 0;
    }
  }, [tick]);

  // Lazy engine initialization. Idempotent — safe to call from every register
  // entry point. Runs only once (or until init fails permanently).
  const ensureEngine = useCallback(() => {
    if (engineReadyRef.current) return true;
    if (initFailedRef.current) return false;
    if (typeof window === 'undefined') return false;

    try {
      // Synchronous scroll handler — runs `tick()` directly so the
      // transform write lands in the same frame as the scroll event.
      // Going through rAF here added ~16ms of perceptible lag.
      // Transform writes are GPU-composited so writing on every scroll
      // event is cheap and matches native scroll responsiveness.
      const onScroll = () => tick();
      window.addEventListener('scroll', onScroll, { passive: true });
      onScrollRef.current = onScroll;

      const handleIntersect = (entries) => {
        const observer = observerRef.current;
        for (const entry of entries) {
          const el = entry.target;
          const rec = revealMapRef.current.get(el);
          if (!rec || rec.fired) continue;          // subsequent entries are no-ops (Property 7)
          if (!entry.isIntersecting) continue;
          rec.fired = true;
          try {
            rec.onReveal();
          } catch {
            // Module-level reveal callback failed — swallow so other modules continue.
          }
          if (observer) {
            try {
              observer.unobserve(el);
            } catch {
              // swallow — already disconnected, etc.
            }
          }
        }
      };

      observerRef.current = new IntersectionObserver(handleIntersect, { threshold: 0.15 });
      engineReadyRef.current = true;
      return true;
    } catch (err) {
      initFailedRef.current = true;
      setForceStatic(true);
      if (
        typeof import.meta !== 'undefined' &&
        import.meta.env &&
        import.meta.env.DEV
      ) {
        console.warn('[ParallaxProvider] init failed; static fallback active', err);
      }
      return false;
    }
  }, [tick, scheduleTick]);

  // Single mount/unmount effect. The engine itself is initialized lazily on
  // first register; this effect only handles teardown when the provider
  // unmounts (and a one-time scheduleTick to settle initial offsets).
  useEffect(() => {
    // Schedule an initial tick so any modules registered during the first
    // render get their initial offsets without waiting for a scroll event.
    scheduleTick();

    return () => {
      // Tear down whatever was lazily initialized.
      const onScroll = onScrollRef.current;
      if (onScroll) {
        try { window.removeEventListener('scroll', onScroll); } catch { /* swallow */ }
        onScrollRef.current = null;
      }
      if (observerRef.current) {
        try { observerRef.current.disconnect(); } catch { /* swallow */ }
        observerRef.current = null;
      }
      if (rafIdRef.current !== 0) {
        try { window.cancelAnimationFrame(rafIdRef.current); } catch { /* swallow */ }
        rafIdRef.current = 0;
      }
      engineReadyRef.current = false;
    };
  }, [scheduleTick]);

  // Keep the rAF tick's view of reducedMotion fresh, and re-tick on flip so
  // transforms get cleared (entering reduced-motion) or re-applied (leaving it)
  // promptly without waiting for the next scroll event.
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
    scheduleTick();
  }, [reducedMotion, scheduleTick]);

  const registerParallax = useCallback(
    (el, speedFactor) => {
      if (initFailedRef.current) return NOOP;
      if (!el) return NOOP;
      // Parallax doesn't actually need the IntersectionObserver, but lazy-
      // initializing here keeps the engine warm-up cost on the very first
      // registration (whichever it happens to be).
      ensureEngine();
      try {
        const rec = { speedFactor: clampSpeed(speedFactor), cleared: false };
        parallaxMapRef.current.set(el, rec);
        scheduleTick();
        return () => {
          try { parallaxMapRef.current.delete(el); } catch { /* swallow */ }
        };
      } catch {
        return NOOP;
      }
    },
    [ensureEngine, scheduleTick]
  );

  const registerReveal = useCallback(
    (el, threshold, onReveal) => {
      if (initFailedRef.current) return NOOP;
      if (!el || typeof onReveal !== 'function') return NOOP;
      if (!ensureEngine()) return NOOP;
      const observer = observerRef.current;
      if (!observer) return NOOP;
      try {
        const rec = { threshold, onReveal, fired: false };
        revealMapRef.current.set(el, rec);
        observer.observe(el);
        return () => {
          try {
            revealMapRef.current.delete(el);
            observer.unobserve(el);
          } catch {
            // swallow — element may already be disconnected.
          }
        };
      } catch {
        return NOOP;
      }
    },
    [ensureEngine]
  );

  const value = useMemo(
    () => ({ reducedMotion, registerParallax, registerReveal }),
    [reducedMotion, registerParallax, registerReveal]
  );

  return <ParallaxContext.Provider value={value}>{children}</ParallaxContext.Provider>;
}
