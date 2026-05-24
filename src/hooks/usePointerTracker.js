import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import useReducedMotion from './useReducedMotion';
import { computePointerOffset } from './parallaxMath';

// Media query that flags touch-style "coarse" pointers — disables pointer
// parallax per R5.5 / Property 5.
const COARSE_QUERY = '(pointer: coarse)';

// No-op used when subscription cannot be established or as a default cleanup.
const NOOP = () => {};

// Stable identity style returned whenever the tracker is disabled, has
// failed to set up, or has not yet observed a pointermove.
const IDENTITY_STYLE = Object.freeze({ transform: '', transition: '' });

// Resting style applied on `pointerleave` so the element eases back to its
// origin over 400ms using the editorial easing token (R5.3).
const REST_STYLE = Object.freeze({
  transform: 'translate(0, 0)',
  transition: 'transform 400ms var(--ease-editorial)',
});

/* ------------------------------------------------------------------ *
 * useSyncExternalStore subscription for `(pointer: coarse)`.
 * Mirrors the structure used by `useReducedMotion` for parity (R5.5,
 * Property 5 — disabled state must respond to live media-query changes).
 * ------------------------------------------------------------------ */

function subscribeCoarse(notify) {
  if (typeof window === 'undefined') return NOOP;

  let mql;
  try {
    mql = window.matchMedia(COARSE_QUERY);
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

function getCoarseSnapshot() {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia(COARSE_QUERY).matches === true;
  } catch {
    return false;
  }
}

// SSR-safe default — coarse pointer assumed false so the static markup
// matches the conservative "tracker disabled if coarse" branch only when
// the client genuinely flips it on.
function getCoarseServerSnapshot() {
  return false;
}

function useCoarsePointer() {
  return useSyncExternalStore(
    subscribeCoarse,
    getCoarseSnapshot,
    getCoarseServerSnapshot,
  );
}

/* ------------------------------------------------------------------ *
 * usePointerTracker
 * ------------------------------------------------------------------ */

/**
 * Per-module pointer-offset hook. Translates the attached element by up to
 * `±maxOffsetPx` along each axis based on the cursor's position relative
 * to the element's center, using a single coalesced `requestAnimationFrame`
 * per frame regardless of how many `pointermove` events arrive (R5.4 /
 * Property 4 rAF-coalesce).
 *
 * The tracker is disabled — returning an inert callback ref and the
 * identity style — when either:
 *   - the user prefers reduced motion (R5.5 / R6.2 / Property 5), or
 *   - the primary pointer is "coarse" (R5.5 / Property 5).
 * The disabled state re-evaluates live: a `(pointer: coarse)` change event
 * (e.g. plugging in a mouse) re-enables the tracker and a future
 * `pointermove` will reattach the offset.
 *
 * Setup is wrapped in `try/catch`; on any listener-registration failure
 * the hook degrades to inert ref + identity style without unmounting the
 * consumer (R6.6 / Property 8).
 *
 * Always returns the same `{ ref, style }` shape regardless of disabled
 * state so consumers can spread `style` unconditionally.
 *
 * @param {number} [maxOffsetPx=8] Maximum translate magnitude in CSS px.
 * @returns {{ ref: (node: HTMLElement | null) => void, style: { transform: string, transition: string } }}
 */
export default function usePointerTracker(maxOffsetPx = 8) {
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const disabled = reducedMotion || coarsePointer;

  const [style, setStyle] = useState(IDENTITY_STYLE);

  // Mirror the latest `maxOffsetPx` into a ref so listener closures stay
  // stable when the prop changes — avoids tearing down + re-attaching
  // listeners on every re-render.
  const maxOffsetRef = useRef(maxOffsetPx);
  useEffect(() => {
    maxOffsetRef.current = maxOffsetPx;
  }, [maxOffsetPx]);

  // Listener teardown for the currently-attached element.
  const cleanupRef = useRef(NOOP);

  // rAF id sentinel — `0` means "no rAF pending" so scheduling stays
  // idempotent (Property 4 rAF-coalesce).
  const rafIdRef = useRef(0);

  // Latest cursor coordinates pending consumption by the rAF tick.
  const pendingPointerRef = useRef(null);

  // Tear down on unmount: detach listeners, cancel any pending rAF,
  // and forget the pending cursor coordinate.
  useEffect(() => {
    return () => {
      try {
        cleanupRef.current();
      } catch {
        /* swallow */
      }
      cleanupRef.current = NOOP;
    };
  }, []);

  // Callback ref. React invokes this with the element on attach and with
  // `null` on detach (or when the ref function identity changes). The dep
  // list captures `disabled` so flipping reduced-motion or coarse-pointer
  // forces React to detach (calling the ref with `null`) and re-attach
  // (calling the ref with the same element under the new branch),
  // satisfying live response without an extra effect.
  const ref = useCallback(
    (node) => {
      // Detach any previously-attached listeners on this hook instance.
      try {
        cleanupRef.current();
      } catch {
        /* swallow */
      }
      cleanupRef.current = NOOP;

      // No element attached — keep style at identity until something
      // mounts. (Resetting to IDENTITY_STYLE is safe because it's a
      // module-level constant: React's bail-out check will skip the
      // re-render when the value is already identity.)
      if (!node) {
        setStyle(IDENTITY_STYLE);
        return;
      }

      // Disabled (reduced motion or coarse pointer): do not attach
      // listeners, ensure inert style. R5.5 / R6.2 / Property 5.
      if (disabled) {
        setStyle(IDENTITY_STYLE);
        return;
      }

      try {
        const onPointerMove = (event) => {
          // Latch the latest cursor position; the rAF tick consumes it.
          pendingPointerRef.current = {
            x: event.clientX,
            y: event.clientY,
          };

          if (rafIdRef.current !== 0) return; // already scheduled this frame

          try {
            rafIdRef.current = window.requestAnimationFrame(() => {
              rafIdRef.current = 0;
              const pt = pendingPointerRef.current;
              if (!pt) return;

              try {
                const rect = node.getBoundingClientRect();
                const { x, y } = computePointerOffset(
                  pt.x,
                  pt.y,
                  rect,
                  maxOffsetRef.current,
                );
                setStyle({
                  transform: `translate(${x}px, ${y}px)`,
                  transition: 'none',
                });
              } catch {
                /* swallow — leave previous style applied */
              }
            });
          } catch {
            // rAF unavailable / threw — clear the sentinel so the next
            // pointermove can retry scheduling.
            rafIdRef.current = 0;
          }
        };

        const onPointerLeave = () => {
          // Cancel any pending tick so we don't overwrite the rest style
          // with a stale offset right after we set it.
          if (rafIdRef.current !== 0) {
            try {
              window.cancelAnimationFrame(rafIdRef.current);
            } catch {
              /* swallow */
            }
            rafIdRef.current = 0;
          }
          pendingPointerRef.current = null;
          setStyle(REST_STYLE);
        };

        node.addEventListener('pointermove', onPointerMove);
        node.addEventListener('pointerleave', onPointerLeave);

        cleanupRef.current = () => {
          try {
            node.removeEventListener('pointermove', onPointerMove);
          } catch {
            /* swallow */
          }
          try {
            node.removeEventListener('pointerleave', onPointerLeave);
          } catch {
            /* swallow */
          }
          if (rafIdRef.current !== 0) {
            try {
              window.cancelAnimationFrame(rafIdRef.current);
            } catch {
              /* swallow */
            }
            rafIdRef.current = 0;
          }
          pendingPointerRef.current = null;
        };
      } catch {
        // Setup failed entirely — degrade to inert ref + identity style
        // without crashing the consumer (R6.6 / Property 8).
        cleanupRef.current = NOOP;
        setStyle(IDENTITY_STYLE);
      }
    },
    [disabled],
  );

  // When disabled is true we override `style` so the consumer always sees
  // identity, even if a stale state value lingered from before the flip.
  return {
    ref,
    style: disabled ? IDENTITY_STYLE : style,
  };
}
