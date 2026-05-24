# Implementation Plan: Homepage Parallax Revamp

> Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

## Overview

Implementation proceeds bottom-up: first add test tooling and shared CSS tokens, then implement the pure parallax math, then the reduced-motion hook, then the `ParallaxProvider` context, then the three consumer hooks (`useParallax`, `useReveal`, `usePointerTracker`), then `Home.css`, then the `Home.jsx` rewrite that wires everything together. Property-based tests (one per documented correctness property) sit close to the unit they validate so failures surface as soon as the relevant code lands. Existing sections (Marquee, AntiTarnish grid, WideBanner, Bestsellers/NewArrivals strips, Korean grid, Mosaic, BrowseAllCTA) are migrated into the new `ParallaxProvider` tree without behavioral changes.

Implementation language: **JavaScript** (React 19 + Vite, vanilla CSS, ESM). Test runner: **Vitest** with **fast-check** for property-based tests, **@testing-library/react** + **jsdom** for DOM/component tests.

## Tasks

- [x] 1. Set up test tooling and CSS tokens
  - [x] 1.1 Add Vitest, fast-check, and Testing Library to devDependencies and wire up the `test` script
    - Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, and `fast-check` as devDependencies in `package.json`
    - Add `"test": "vitest --run"` to `package.json` scripts (single-execution; do not add a watch script)
    - Add a `test` block to `vite.config.js` configuring `environment: 'jsdom'`, `globals: true`, and a `setupFiles` entry pointing to a new `src/test/setup.js`
    - Create `src/test/setup.js` that imports `@testing-library/jest-dom` and provides a minimal `window.matchMedia` polyfill (`addEventListener`/`removeEventListener` no-op, `matches: false`) for tests that don't override it
    - Verify `npm test` runs and reports zero tests collected without error
    - _Requirements: 14.5_

  - [x] 1.2 Add new shared CSS custom property tokens to `src/App.css`
    - Append (do not modify existing tokens) under `:root`: `--ease-editorial: cubic-bezier(0.22, 1, 0.36, 1);`, `--reveal-duration: 750ms;`, `--arch-radius: 50% 50% 0 0 / 35% 35% 0 0;`, `--oval-radius: 50% / 60%;`
    - Confirm `npm run build` and `npm run lint` still succeed
    - _Requirements: 2.6, 4.4_

- [x] 2. Implement parallax math (pure functions)
  - [x] 2.1 Create `src/hooks/parallaxMath.js` with the five pure helpers
    - Implement `clampSpeed(s)`: returns `0` when `s` is `NaN`/`null`/`undefined`/non-finite, otherwise clamps to `[-0.6, 0.6]`
    - Implement `scaleSpeedForViewport(speed, viewportWidth)`: returns `speed * 0.5` when `viewportWidth < 640` and a finite positive number, returns `speed` otherwise
    - Implement `computeParallaxOffset(scrollY, speedFactor, viewportWidth)`: returns `scrollY * scaleSpeedForViewport(clampSpeed(speedFactor), viewportWidth)`
    - Implement `isInViewportBuffer(rectTop, rectBottom, viewportHeight, buffer = 200)`: returns `rectBottom > -buffer && rectTop < viewportHeight + buffer`
    - Implement `computePointerOffset(cursorX, cursorY, rect, maxOffsetPx)`: returns `{x: 0, y: 0}` when `rect.width <= 0` or `rect.height <= 0`; otherwise normalizes the cursor offset against the rect center, clamps each axis to `[-1, 1]`, and scales by `maxOffsetPx`
    - Export every function as a named export
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 5.2, 7.4_

  - [ ]* 2.2 Write property test for `clampSpeed` and `computeParallaxOffset` linearity
    - **Property 1: Parallax math correctness**
    - **Validates: Requirements 3.1, 3.4, 3.6**
    - Use fast-check to assert `clampSpeed(s) ∈ [-0.6, 0.6]` for any number including `NaN`, `±Infinity`, `null`
    - Use fast-check to assert `computeParallaxOffset(2*y, s, vw) === 2 * computeParallaxOffset(y, s, vw)` and `computeParallaxOffset(0, s, vw) === 0` for any finite `y`, any `s`, any `vw > 0`
    - Assert that the transform string built from the helper (`` `translate3d(0, ${offset}px, 0)` ``) matches `/^translate3d\(0(?:px)?, -?\d+(\.\d+)?px, 0(?:px)?\)$/` for representative offsets

  - [ ]* 2.3 Write property test for `isInViewportBuffer`
    - **Property 2: Viewport-buffer culling**
    - **Validates: Requirements 3.5**
    - Use fast-check to assert `isInViewportBuffer(top, bottom, vh, b) === (bottom > -b && top < vh + b)` for any rect `(top, bottom)`, any `vh > 0`, any `b >= 0`

  - [ ]* 2.4 Write property test for `scaleSpeedForViewport`
    - **Property 3: Mobile speed scaling is piecewise linear**
    - **Validates: Requirements 7.4**
    - Use fast-check to assert the result is `s * 0.5` for `vw < 640` and `s` for `vw >= 640`, across any finite `s` and any `vw > 0`

  - [ ]* 2.5 Write property test for `computePointerOffset`
    - **Property 4 (math portion): Pointer offset is bounded, centered, and monotonic**
    - **Validates: Requirements 5.2**
    - Use fast-check to assert `|x| <= m` and `|y| <= m`, that the rect-center cursor produces `{x: 0, y: 0}`, and that for fixed `y`, increasing `cursorX` produces non-decreasing `x` (likewise for the y-axis)

- [x] 3. Implement `useReducedMotion`
  - [x] 3.1 Create `src/hooks/useReducedMotion.js`
    - Default-export a React hook that uses `useSyncExternalStore` to subscribe to `matchMedia('(prefers-reduced-motion: reduce)')`
    - Wrap the `matchMedia` call in `try/catch`; on failure return a stable `false` value
    - The subscribe function MUST register `change` via `addEventListener('change', ...)` and clean up via `removeEventListener` on unsubscribe
    - The snapshot function returns the current `MediaQueryList.matches` value (or `false` on failure)
    - _Requirements: 6.1, 6.4_

  - [ ]* 3.2 Write unit + property tests for `useReducedMotion`
    - **Property 6 (live-response portion): Reduced-motion live response**
    - **Validates: Requirements 6.1, 6.4**
    - Mock `window.matchMedia` to return a controllable `MediaQueryList` stub
    - Use fast-check to drive a sequence of `change` events with random `matches` booleans; after each event, assert the hook's returned value equals the latest `matches` value within a single `act()` flush
    - Assert that when `matchMedia` throws, the hook returns `false` and does not propagate the error

- [x] 4. Implement `ParallaxProvider`
  - [x] 4.1 Create `src/hooks/ParallaxProvider.jsx`
    - Define a React context whose value is `{ reducedMotion, registerParallax(el, speedFactor), registerReveal(el, threshold, onReveal) }`
    - On mount, attach exactly one passive `scroll` listener on `window` and construct exactly one `IntersectionObserver` (threshold 0.15)
    - Wrap all setup in `try/catch`; on failure set internal `forceStatic` state so the context reports `reducedMotion: true` and the register fns become no-ops returning a no-op unregister
    - Use a `Map<HTMLElement, ParallaxRecord>` and a `Map<HTMLElement, RevealRecord>` for registrations so register/unregister is O(1)
    - On each `scroll` event, schedule an idempotent `requestAnimationFrame` tick. Inside the tick: read `window.scrollY` and `window.innerWidth` once, then for each parallax registration call `getBoundingClientRect()` once, run `isInViewportBuffer` to decide whether to write a transform, and on write set `el.style.transform = ` `` `translate3d(0, ${computeParallaxOffset(scrollY, speedFactor, vw)}px, 0)` ``
    - When `reducedMotion === true` (either from the hook or `forceStatic`), the rAF tick MUST NOT write transforms; on the first transition into reduced-motion it MUST clear any previously-written transform back to `''`
    - The `IntersectionObserver` callback MUST call `onReveal()` for the first entry where `isIntersecting === true` and then `unobserve(el)`; subsequent entries MUST be no-ops
    - On unmount, remove the scroll listener, disconnect the observer, and cancel any pending rAF
    - Export both `ParallaxProvider` (default) and a `useParallaxContext` hook that throws a clear error when used outside the provider
    - _Requirements: 3.1, 3.2, 3.5, 3.5a, 3.6, 4.1, 4.3, 6.1, 6.5, 6.6, 10.2, 10.3, 10.5_

  - [ ]* 4.2 Write property tests for the provider's lifecycle and singleton invariants
    - **Property 9: Singleton listener, observer, and per-frame rect read**
    - **Validates: Requirements 10.2, 10.3, 10.5**
    - Spy on `window.addEventListener` / `window.removeEventListener`, on `IntersectionObserver` constructor / `disconnect`, and on `Element.prototype.getBoundingClientRect`
    - Use fast-check to drive random sequences of (mount, register N modules, fire M scroll events within a single rAF, unmount) and assert: exactly one passive `scroll` listener present during mount, exactly one `IntersectionObserver` constructed, both removed on unmount, and `getBoundingClientRect` called at most once per registered module per rAF tick

  - [ ]* 4.3 Write property test for the provider's reveal-once behavior
    - **Property 7: Reveal observer fires at most once per module**
    - **Validates: Requirements 4.3**
    - Use fast-check to drive a random sequence of intersection entries (with random `isIntersecting` booleans) for each registered reveal element and assert: `onReveal` invoked exactly once after the first `isIntersecting === true`, `unobserve` called exactly once for that element, and zero further invocations afterwards

  - [ ]* 4.4 Write property test for engine error resilience
    - **Property 8: Engine error resilience and static fallback**
    - **Validates: Requirements 6.5, 6.6**
    - Mock `matchMedia`, `window.addEventListener`, `IntersectionObserver`, intersection callbacks, the rAF tick, and `getBoundingClientRect` to throw on demand
    - Use fast-check to choose which subset throws and assert: render does not throw, no error boundary fallback is rendered, and every reveal- and parallax-tagged element has `getComputedStyle(el).opacity > 0`

- [x] 5. Checkpoint - Math layer and provider integrated
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement `useParallax` consumer hook
  - [x] 6.1 Create `src/hooks/useParallax.js`
    - Accept `(speedFactor, opts?)` where `opts.mobileScale` defaults to `true`
    - Return a callback ref `{ ref }` that registers with `useParallaxContext().registerParallax(el, clampSpeed(speedFactor))` when called with an element and unregisters when called with `null`
    - Re-register when `speedFactor` changes (cleanup old registration first)
    - Wrap registration in `try/catch`; on failure return an inert ref that does nothing
    - Do not return a style object — the provider mutates `el.style.transform` directly
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 3.8, 6.6_

- [x] 7. Implement `useReveal` consumer hook
  - [x] 7.1 Create `src/hooks/useReveal.js`
    - Accept `(threshold = 0.15)`
    - Return `{ ref, isVisible }` where `isVisible` starts `true` when the context reports `reducedMotion`, otherwise `false`
    - On the callback ref attaching, call `registerReveal(el, threshold, () => setVisible(true))`; the provider unobserves on first reveal
    - On unmount or ref detach, call the returned unregister
    - Wrap registration in `try/catch`; on failure default `isVisible` to `true` so content is never hidden
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 6.3, 6.6_

- [x] 8. Implement `usePointerTracker` consumer hook
  - [x] 8.1 Create `src/hooks/usePointerTracker.js`
    - Accept `(maxOffsetPx = 8)`
    - Disable (return inert ref + identity style `{ transform: '', transition: '' }`) when `useReducedMotion()` is true OR `matchMedia('(pointer: coarse)').matches` is true. Re-evaluate the coarse-pointer query on `change` events
    - On the callback ref attaching, attach `pointermove` and `pointerleave` listeners to the element
    - On `pointermove`, schedule an idempotent rAF that reads the cursor position, calls `computePointerOffset(cx, cy, rect, maxOffsetPx)`, and updates internal state so the returned style becomes `{ transform: `` `translate(${x}px, ${y}px)` ``, transition: 'none' }`
    - On `pointerleave`, set the style to `{ transform: 'translate(0, 0)', transition: 'transform 400ms var(--ease-editorial)' }`
    - On unmount or ref detach, remove listeners and cancel any pending rAF
    - Wrap setup in `try/catch`; on failure return inert ref + identity style
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.2, 6.6_

  - [ ]* 8.2 Write property test for pointer tracker disabled-state and per-frame coalescing
    - **Property 4 (rAF-coalesce portion) + Property 5: Pointer tracker disabled under coarse pointer or reduced motion**
    - **Validates: Requirements 5.4, 5.5, 6.2**
    - Mock `matchMedia` to return any combination of `(prefers-reduced-motion: reduce)` and `(pointer: coarse)` matches. Use fast-check over the four combinations and assert that whenever at least one matches, the hook attaches zero `pointermove` listeners and returns identity style
    - Drive a burst of N random `pointermove` events within a single fake rAF window and assert at most one style transform write occurs that frame

- [x] 9. Checkpoint - All hooks ready
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement `src/pages/Home.css`
  - [x] 10.1 Create the editorial layout, shape, and reveal classes
    - `.hero-editorial` grid: 3 columns at `min-width: 1024px`, 2 columns at `min-width: 640px`, single column below 640px (use the existing `--breakpoint-*` tokens if present, otherwise inline px breakpoints per Requirement 7)
    - `.hero-editorial__column` with a `::after` pseudo-element rendering a 1px guideline divider colored `var(--color-primary-light)`, hidden below 1024px
    - `.arched-panel { border-radius: var(--arch-radius); overflow: hidden; }` and ensure the same `border-radius` resolves at every breakpoint (no media-query override)
    - `.oval-card { border-radius: var(--oval-radius); overflow: hidden; }` plus hover treatment scaling `1.04` with `box-shadow: var(--shadow-lg)` over `300ms` (static box-shadow, not animated alongside transforms — Requirement 10.6)
    - `.dome` headline block, `.dome__headline` using `var(--font-heading)` with `font-size: clamp(2.25rem, 5vw, 4.5rem)`, `.dome__tagline` uppercase with `letter-spacing: 0.18em` and `font-size: clamp(0.75rem, 1.2vw, 0.875rem)`
    - `.date-stamp`, `.date-stamp__num`, `.date-stamp__divider` (40–120px wide 1px line), `.date-stamp__name` uppercase with `letter-spacing: 0.18em`
    - `.guideline-divider` reusable 1px decorative rule (length 40–120px) using `var(--color-primary-light)`
    - `.reveal` initial state `opacity: 0; transform: translateY(24px); transition: opacity var(--reveal-duration) var(--ease-editorial), transform var(--reveal-duration) var(--ease-editorial);`
    - `.reveal.is-visible` final state `opacity: 1; transform: translateY(0);`
    - `:focus-visible` rule on every interactive element inside `.hero-editorial` setting `outline: 2px solid var(--color-primary); outline-offset: 2px;`
    - Use only `var(--*)` tokens (or `transparent`/`currentColor`/`inherit`/`initial`/`unset`) for every color value — no hex, `rgb()`, `rgba()`, `hsl()`, `hsla()`, or named-color literals
    - Do not animate `box-shadow` or `filter` on any selector that also receives a parallax transform
    - _Requirements: 1.1, 1.2, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.4, 7.1, 7.2, 7.3, 10.6, 11.1, 11.2, 11.3, 11.4, 13.1, 13.2, 13.3, 13.4_

  - [ ]* 10.2 Write structural test scanning Home.css for color literals
    - **Property 10: No color literals in homepage CSS**
    - **Validates: Requirements 2.6, 2.7**
    - Use Vitest + Node `fs.readFileSync` to load `src/pages/Home.css`, strip comments, and assert no match for `/#[0-9a-fA-F]{3,8}\b/`, `/\brgba?\(/`, `/\bhsla?\(/`, and the CSS named-color list (excluding `transparent`, `currentColor`, `inherit`, `initial`, `unset`)

  - [ ]* 10.3 Write computed-style test for arched panels at small viewports
    - **Property 15: Arched panels preserve shape below desktop breakpoints**
    - **Validates: Requirements 1.7, 1.8, 7.2**
    - Render a fixture document containing an `.arched-panel` element, resize the jsdom viewport to widths in `[320, 1023]` (use representative widths since jsdom does not lay out media queries), and assert the inline-rule resolution of `border-radius` matches the value of `var(--arch-radius)` (read via `getComputedStyle` after applying both `App.css` and `Home.css`)

  - [ ]* 10.4 Write structural test asserting no animated `box-shadow` or `filter` on parallax-tagged classes
    - **Property 16: No box-shadow or filter:blur transitions on translated elements**
    - **Validates: Requirements 10.6**
    - Parse `Home.css` and assert that for every selector listed in a `transition` shorthand or `transition-property`, neither `box-shadow` nor `filter` appears inside that property list when the same selector is also one of the parallax-tagged classes (`.arched-panel`, `.oval-card`, `.avatar-card`, `.dome`)

- [x] 11. Implement Hero_Editorial_Section module components and select hero products
  - [x] 11.1 Add the `selectHeroProducts(products)` and `pickById(products, id, fallback)` helpers inside `src/pages/Home.jsx`
    - Defensive lookup that resolves to `at-01`, `kr-03`, `at-05`, `at-11`, `kr-06` with first-of-category fallbacks
    - Returns `{ leftAvatar, leftOval, centerHero, rightCard, rightOval }`
    - _Requirements: 9.1, 9.2_

  - [x] 11.2 Implement `<HeroEditorialSection products={...} />` inside `src/pages/Home.jsx`
    - Three-column grid wrapped in `<section className="hero-editorial">` rendering the modules per the design's module specs table
    - Left column: `AvatarCard` (circle, speed `-0.15`, no pointer tracker, `.reveal`) above an `OvalProductCard` for `leftOval` (speed `+0.25`, pointer tracker on, `.reveal`, links to `/product/{leftOval.id}`)
    - Center column: `ArchedDomePanel` (speed `-0.05`, no pointer tracker, `.reveal`) above `ArchedPortraitPanel` for `centerHero` (speed `+0.10`, pointer tracker on, `.reveal`)
    - Right column: `ArchedBrandedCard` for `rightCard` (speed `-0.20`, pointer tracker on, `.reveal`, links to `/product/{rightCard.id}`) above an `OvalProductCard` for `rightOval` (speed `+0.30`, pointer tracker on, `.reveal`, links to `/product/{rightOval.id}`)
    - Render guideline dividers via `.hero-editorial__column::after` (handled in CSS — no extra DOM nodes)
    - Render the `.dome` block with `.dome__tagline` "PRECIOUS · SS25", `.dome__headline` "Jewelry Reimagined", and a `.dome__divider` (`aria-hidden="true"`)
    - Render the `.date-stamp` block with `12.01`, divider, and `KAASHVI · ISSUE 01`
    - Every `<img>` MUST go through `asset(...)` and have a non-empty `alt`. Mark every below-fold `<img>` with `loading="lazy"`
    - Every internal navigation MUST be a `react-router-dom` `<Link>` whose `to` matches `/^\/(shop(\?[^#]*)?|product\/[a-z0-9-]+|)$/`
    - On each oval card render the product name in `var(--font-heading)` and the price as `₹{price}`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.3, 3.4, 8.5, 9.1, 9.2, 9.3, 10.4, 11.1, 11.2, 12.1, 12.2, 13.1, 13.2, 13.3, 13.4_

  - [ ]* 11.3 Write structural test for hero category coverage
    - **Property 20: Hero category coverage**
    - **Validates: Requirements 9.1**
    - Render `<HeroEditorialSection products={products} />` inside a `MemoryRouter` + `ParallaxProvider`, query all `<img>` elements, and assert at least one `src` resolves under `/images/products/anti-tarnish/` and at least one under `/images/products/korean/`

  - [ ]* 11.4 Write property test for oval-card link routing
    - **Property 12: Hero oval cards link to the backing product detail route**
    - **Validates: Requirements 9.2**
    - Use fast-check to generate random `products` arrays, render the hero, query every oval-card link, and assert each rendered `<Link>` (verified via React's element type) has `to === '/product/' + p.id` for the product backing it

  - [ ]* 11.5 Write structural test for oval-card name/price formatting
    - **Property 21: Oval card name and price formatting**
    - **Validates: Requirements 9.3**
    - Render the hero, assert each price text node matches `/^₹\d+$/`, and assert each name node's resolved `font-family` includes `Playfair Display`

  - [ ]* 11.6 Write structural test for image accessibility and asset path
    - **Property 13: Image accessibility and asset path**
    - **Validates: Requirements 12.1, 12.2**
    - Render the hero, assert every `<img>` has `alt.trim().length > 0`, and that every `src` starts with the Vite `BASE_URL` prefix (or the dev fallback `/`) per the `asset()` helper

  - [ ]* 11.7 Write structural test for decorative inline SVGs
    - **Property 23: Decorative inline SVGs are aria-hidden**
    - **Validates: Requirements 12.3**
    - Render the hero, query every inline `<svg>` without a `<title>` child, and assert each has `aria-hidden="true"`

  - [ ]* 11.8 Write property test for lazy-loaded below-fold images
    - **Property 22: Below-fold images are lazy-loaded**
    - **Validates: Requirements 10.4**
    - Render the full Home page in a fixed-size jsdom viewport, use stubbed `getBoundingClientRect` to mark images as below-fold, and assert each below-fold `<img>` has `getAttribute('loading') === 'lazy'`

- [x] 12. Rewrite `src/pages/Home.jsx` to wire everything together
  - [x] 12.1 Replace `Home.jsx` with a `<ParallaxProvider>`-wrapped composition
    - Import `Home.css`
    - Top-level render order: `<HeroEditorialSection>`, then preserved `MarqueeBanner` markup, `AntiTarnishGrid` (existing `home-collection` markup, slice(0,8)), `WideBanner` (existing `home-wide-banner` markup featuring `at-11`), conditional `<Strip title="Bestsellers" items={bestsellers} />` only when `bestsellers.length > 0`, conditional `<Strip title="New Arrivals" items={newArrivals} />` only when `newArrivals.length > 0`, `KoreanGrid` (existing `home-collection` markup, slice(0,8)), `MosaicSection` (existing `home-mosaic` markup), `BrowseAllCTA` (existing `home-browse-cta` markup)
    - Each retained section receives a single shared `useReveal` (one observer registration per section, not per card)
    - All `<img>` elements continue to use `asset(...)` and have non-empty `alt`s; below-fold images receive `loading="lazy"`
    - All internal navigation continues to use `<Link>` from `react-router-dom`
    - Do NOT import or modify `Navbar`, `Footer`, `CartContext`, `products.js`, or any other page
    - _Requirements: 1.1, 4.5, 7.1, 7.2, 7.3, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.4, 9.5, 9.6, 10.1, 10.2, 10.3, 10.4_

  - [ ]* 12.2 Write property test for badged-strip rendering
    - **Property 11: Badged-strip rendering matches available-product count**
    - **Validates: Requirements 9.5, 9.6**
    - Use fast-check to generate random `products` arrays where the count of `Bestseller` and `New` badges varies in `[0, 8]`. Render `<Home />` with the data and assert: when `c === 0` no strip exists in the DOM; when `c > 0` exactly `c` cards render and no empty placeholder slots are present

  - [ ]* 12.3 Write property test for internal-link allow-list
    - **Property 19: Internal links are Link elements with allow-listed routes**
    - **Validates: Requirements 8.5**
    - Render `<Home />` and traverse the React tree (via `react-test-renderer` or `getAllByRole('link')` plus an element-type check). Assert every internal link is a `react-router-dom` `<Link>` whose `to` matches `/^\/(shop(\?[^#]*)?|product\/[a-z0-9-]+|)$/`

  - [ ]* 12.4 Write property test for products data immutability
    - **Property 18: Existing-product data immutability**
    - **Validates: Requirements 8.3**
    - Snapshot a deep clone of `products` before mounting `<Home />`. Use fast-check to drive random sequences of mount/unmount under random viewport widths and `prefers-reduced-motion` states; after each cycle assert `deepEqual(productsBefore, productsAfter)` and assert object identity of every element is preserved

  - [ ]* 12.5 Write property test for reduced-motion suppression
    - **Property 6 (suppression portion): Reduced-motion suppression**
    - **Validates: Requirements 6.1, 6.3**
    - Mount `<Home />` with `matchMedia('(prefers-reduced-motion: reduce)')` returning `matches: true`. Use fast-check to fire random `scroll` events and assert every parallax-tagged element's `style.transform` is empty (or identity), and every `.reveal` element starts with the `is-visible` class

  - [ ]* 12.6 Write structural test for focus visibility (hover ∪ focus)
    - **Property 14: Focus visibility and hover ∪ focus union**
    - **Validates: Requirements 11.3, 11.4**
    - Render `<Home />`, focus each interactive descendant of `.hero-editorial`, and assert `getComputedStyle(el).outlineWidth >= 2px` and the outline color resolves to `var(--color-primary)`. For elements that are simultaneously `:hover` and `:focus-visible`, assert both the hover scale/shadow and focus outline are applied (use a CSS-rules parse since jsdom does not implement layout for `:hover`)

  - [ ]* 12.7 Write structural test for no-horizontal-scroll across viewport widths
    - **Property 17: No horizontal scroll across the supported viewport range**
    - **Validates: Requirements 7.5**
    - Render `<Home />` inside a fixed-width container and use fast-check to sample widths from `[320, 1920]`. For each width assert `document.scrollingElement.scrollWidth <= vw + 1` (using a layout shim like `resize-observer-polyfill` or directly setting `documentElement.clientWidth` since jsdom does not lay out CSS)

- [x] 13. Final checkpoint - Full build, lint, and test sweep
  - Run `npm run build` and confirm a clean Vite production build with no warnings introduced by this feature
  - Run `npm run lint` and confirm zero new ESLint errors or warnings
  - Run `npm test` and confirm every implemented (non-`*`) test passes
  - Manually load `dist/` (or the dev server) at viewport widths `320`, `640`, `1024`, `1440`, and `1920` and confirm there is no horizontal scroll
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; they correspond to the property-based tests and structural tests that validate the 23 documented correctness properties. Each optional task is annotated with the exact property number and the requirements clauses it validates so traceability is preserved even if the test is deferred.
- All 23 correctness properties from `design.md` are mapped to optional sub-tasks: P1→2.2, P2→2.3, P3→2.4, P4→2.5+8.2, P5→8.2, P6→3.2+12.5, P7→4.3, P8→4.4, P9→4.2, P10→10.2, P11→12.2, P12→11.4, P13→11.6, P14→12.6, P15→10.3, P16→10.4, P17→12.7, P18→12.4, P19→12.3, P20→11.3, P21→11.5, P22→11.8, P23→11.7.
- Implementation tasks (non-`*`) are the minimum required to satisfy every requirement clause. Test tasks validate but do not implement behavior.
- Checkpoints (tasks 5 and 13) are validation-only; they do not introduce new code paths.
- The provider, not the per-module hook, performs every `style.transform` write — this keeps the rAF tick the only writer and eliminates layout-thrash races (Requirement 10.5).
- Properties 4 (rAF coalescing) and 6 (live response) are split across two test tasks because their math and lifecycle facets live in different files; both halves cite the same property number and requirements clauses.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "3.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "6.1", "7.1", "8.1", "10.1"] },
    { "id": 4, "tasks": ["8.2", "10.2", "10.3", "10.4", "11.1"] },
    { "id": 5, "tasks": ["11.2"] },
    { "id": 6, "tasks": ["11.3", "11.4", "11.5", "11.6", "11.7", "11.8", "12.1"] },
    { "id": 7, "tasks": ["12.2", "12.3", "12.4", "12.5", "12.6", "12.7"] }
  ]
}
```
