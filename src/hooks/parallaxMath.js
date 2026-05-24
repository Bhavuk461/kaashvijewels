// Pure helpers for the homepage parallax engine.
// No React, no DOM, no side effects — every function is deterministic and
// safe to call from anywhere (provider rAF tick, hooks, tests).

// Clamp a speed factor to the valid range [-0.6, 0.6]. R3.4
// Returns 0 for NaN, null, undefined, or any non-finite number (e.g. ±Infinity)
// so the engine stays stable when callers pass garbage.
export function clampSpeed(s) {
  if (s == null || typeof s !== 'number' || !Number.isFinite(s)) return 0;
  if (s < -0.6) return -0.6;
  if (s > 0.6) return 0.6;
  return s;
}

// Halve the speed factor on small viewports. R7.4
// Returns `speed * 0.5` only when `viewportWidth` is a finite positive number
// strictly less than 640; otherwise returns `speed` unchanged.
export function scaleSpeedForViewport(speed, viewportWidth) {
  if (
    typeof viewportWidth !== 'number' ||
    !Number.isFinite(viewportWidth) ||
    viewportWidth <= 0
  ) {
    return speed;
  }
  return viewportWidth < 640 ? speed * 0.5 : speed;
}

// Compute the parallax translate offset (CSS px) for a given scroll position. R3.1, R3.6
// Pure, deterministic, and linear in `scrollY`.
export function computeParallaxOffset(scrollY, speedFactor, viewportWidth) {
  return scrollY * scaleSpeedForViewport(clampSpeed(speedFactor), viewportWidth);
}

// True if a rect overlaps the viewport expanded by `buffer` px in either direction. R3.5
export function isInViewportBuffer(rectTop, rectBottom, viewportHeight, buffer = 200) {
  return rectBottom > -buffer && rectTop < viewportHeight + buffer;
}

// Normalize a cursor position to a [-maxOffsetPx, +maxOffsetPx] translate
// relative to the rect's center. R5.2
// Returns {x: 0, y: 0} for degenerate rects (non-positive width or height).
export function computePointerOffset(cursorX, cursorY, rect, maxOffsetPx) {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const nx = (cursorX - cx) / (rect.width / 2);   // -1..+1 within bounds
  const ny = (cursorY - cy) / (rect.height / 2);
  const cnx = Math.max(-1, Math.min(1, nx));
  const cny = Math.max(-1, Math.min(1, ny));
  return { x: cnx * maxOffsetPx, y: cny * maxOffsetPx };
}
