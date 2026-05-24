# Requirements Document

## Introduction

This feature revamps the homepage of the Kaashvi Jewels e-commerce site (React 19 + Vite, vanilla CSS, HashRouter) into a luxury editorial layout inspired by the user-supplied "PRECIOUS — Jewelry Reimagined" reference image. The revamp introduces an arched, three-column, magazine-style grid composed of distinct visual modules (avatar card, product oval cards, arched dome panels, branded ribbon, portrait hero, etc.). Every module scrolls at its own rate to create a parallax effect, and reacts to pointer/scroll input through hover, mouse-tracking, and reveal animations.

The existing brand identity is retained: the rose-gold / pinkish theme defined in `src/App.css` (e.g. `--color-primary: #C07A8E`, `--color-primary-light: #F5D5DC`, `--color-bg: #FFF8F9`, `--gradient-rose`, `--gradient-hero`). The reference's dark-teal palette is replaced with the brand's pink/cream palette while keeping the structural composition (arched panels, thin guideline dividers, three-column editorial grid).

Scope is strictly the homepage (`src/pages/Home.jsx` and the styles it consumes). Other pages (Shop, ProductDetail, Cart, Checkout, About, Contact) are out of scope and MUST remain untouched. The existing `Navbar`, `Footer`, `CartContext`, `products.js` data, and `react-router-dom` routes are preserved.

## Glossary

- **Homepage**: The React component rendered at route `/` by `src/pages/Home.jsx`.
- **Parallax_Engine**: The client-side mechanism (CSS variables driven by a scroll listener using `requestAnimationFrame`, or an equivalent React hook abstraction) that translates the page's vertical scroll position into per-module transform offsets.
- **Scroll_Module**: A self-contained visual block on the Homepage (e.g. avatar card, arched hero panel, oval product card, marquee ribbon) that has its own parallax speed factor.
- **Speed_Factor**: A numeric multiplier (typically between -0.6 and +0.6) that determines how far a Scroll_Module translates per pixel of scroll relative to the document.
- **Editorial_Grid**: The three-column, arched-panel layout structure that mirrors the reference image's composition (left column, center dome column, right column).
- **Arched_Panel**: A visual container styled with a top half-circle (border-radius `50% 50% 0 0 / 35% 35% 0 0` or an SVG/CSS arch) used to frame imagery and headlines.
- **Reveal_Observer**: An `IntersectionObserver`-based mechanism that toggles a `is-visible` class on Scroll_Modules when they enter the viewport, triggering CSS transitions.
- **Pointer_Tracker**: A handler that reads `mousemove` events over a Scroll_Module and applies a small translate/rotate based on cursor offset from the module's center.
- **Reduced_Motion_User**: A user whose system reports `prefers-reduced-motion: reduce` via the CSS media query and `window.matchMedia`.
- **Brand_Palette**: The set of CSS custom properties already defined under `:root` in `src/App.css`, primarily the pink, rose-gold, cream, and accent gold tokens.
- **Animation_Library_Decision**: The selected approach for implementing animations (native CSS + `IntersectionObserver` + `requestAnimationFrame`, OR an installed library such as Framer Motion / GSAP). To be finalized in the Design phase; requirements below are library-agnostic.
- **Existing_Product_Data**: The 28 products exported from `src/data/products.js` across the `anti-tarnish` and `korean` categories.
- **Hero_Editorial_Section**: The first viewport-height composition on the Homepage replicating the reference's three-column arched layout.
- **Featured_Spotlight**: The center arched dome containing the headline "Jewelry Reimagined" (or brand-adapted equivalent) and a portrait/product hero image.

## Requirements

### Requirement 1: Editorial Three-Column Hero Composition

**User Story:** As a visitor landing on the Homepage, I want to see a luxury editorial three-column composition with arched panels, so that the brand feels premium and curated like the reference image.

#### Acceptance Criteria

1. THE Homepage SHALL render a Hero_Editorial_Section as the first section below the existing Navbar.
2. THE Hero_Editorial_Section SHALL contain exactly three columns at viewport widths of 1024px and above: a left column, a center column, and a right column.
3. THE center column of the Hero_Editorial_Section SHALL contain a Featured_Spotlight composed of an upper Arched_Panel with a serif headline and a lower Arched_Panel with a portrait or product image.
4. THE left column of the Hero_Editorial_Section SHALL contain at least one circular avatar/badge module and at least one oval-shaped product card module sourced from Existing_Product_Data.
5. THE right column of the Hero_Editorial_Section SHALL contain at least one arched branded card module and at least one oval-shaped product card module sourced from Existing_Product_Data.
6. THE Hero_Editorial_Section SHALL render thin guideline dividers (1px, color `var(--color-border)` or `var(--color-primary-light)`) between the three columns.
7. WHERE the viewport width is below 1024px and at or above 640px, THE Hero_Editorial_Section SHALL collapse to a two-column layout, AND THE Arched_Panel styling SHALL be preserved on every panel that uses it at the desktop breakpoint.
8. WHERE the viewport width is below 640px, THE Hero_Editorial_Section SHALL collapse to a single-column stacked layout, AND THE Arched_Panel styling SHALL be preserved on every panel that uses it at the desktop breakpoint.

### Requirement 2: Brand Color Palette Retention

**User Story:** As the brand owner, I want the existing pink/rose-gold theme retained, so that the revamp stays on-brand and does not introduce the reference image's dark-teal palette.

#### Acceptance Criteria

1. THE Homepage SHALL use only color values defined as CSS custom properties under `:root` in `src/App.css` (the Brand_Palette) for all backgrounds, text, borders, and accents introduced by this feature.
2. THE Homepage SHALL NOT introduce any dark-teal, deep-green, or non-brand hue as the dominant background of any Scroll_Module.
3. WHERE the reference image uses a deep-red accent (e.g. the Marriott ribbon, the portrait panel background), THE Homepage SHALL substitute `var(--color-primary-dark)` or `var(--color-primary-deeper)` to preserve depth contrast within the Brand_Palette.
4. WHERE the reference image uses a cream/off-white background, THE Homepage SHALL use `var(--color-bg)` or `var(--color-bg-warm)`.
5. THE Homepage SHALL use `var(--font-heading)` (Playfair Display) for editorial headlines and `var(--font-accent)` (Cormorant Garamond) for decorative serif accents, consistent with existing `App.css` typography tokens.
6. IF a new color token is required to express the editorial layout, THEN THE feature SHALL add the token to `:root` in `src/App.css` rather than hardcoding the value inside a component.
7. THE Homepage SHALL reference every color value (including existing brand colors) exclusively via CSS custom properties from the Brand_Palette, and SHALL NOT inline literal hex, `rgb()`, `rgba()`, `hsl()`, or named-color values for any background, text, border, shadow, or accent introduced by this feature.

### Requirement 3: Parallax Scroll Behavior

**User Story:** As a visitor scrolling the Homepage, I want each visual module to move at its own speed, so that the page feels layered, dynamic, and premium.

#### Acceptance Criteria

1. THE Parallax_Engine SHALL apply a vertical translate transform to each Scroll_Module proportional to the document's scroll position multiplied by the module's Speed_Factor.
2. THE Parallax_Engine SHALL update transforms inside a `requestAnimationFrame` callback driven by a passive `scroll` listener, so that the main thread is not blocked between frames.
3. THE Parallax_Engine SHALL assign distinct Speed_Factors to at least four different Scroll_Modules within the Hero_Editorial_Section so that no two adjacent modules move at the same rate.
4. THE Speed_Factor for any Scroll_Module SHALL be within the closed interval [-0.6, 0.6].
5. WHEN a Scroll_Module is outside the viewport plus a 200px buffer on either side, THE Parallax_Engine SHALL skip transform updates for that module to avoid wasted work.
5a. IF the Parallax_Engine attempts a transform update for a Scroll_Module whose bounding box is outside the viewport plus the 200px buffer, THEN THE Parallax_Engine SHALL short-circuit before any DOM write and SHALL leave the module's existing `transform` value unchanged.
6. THE Parallax_Engine SHALL apply transforms via `transform: translate3d(0, Ypx, 0)` (or `translateY` on the GPU layer) to keep animations on the compositor.
7. WHILE the page is being scrolled, THE Parallax_Engine SHALL maintain a sustained frame rate of at least 50 frames per second on a mid-range desktop browser (Chromium 120+ on a 4-core CPU) for the Homepage.
8. THE Parallax_Engine SHALL be implemented as a reusable React hook (e.g. `useParallax(speedFactor)`) returning a ref and inline style object, so that Scroll_Modules opt-in declaratively.

### Requirement 4: Scroll-Triggered Reveal Animations

**User Story:** As a visitor scrolling down the Homepage, I want elements to fade and slide into view as they enter the viewport, so that the page feels alive and guides my attention.

#### Acceptance Criteria

1. THE Reveal_Observer SHALL be implemented using the browser `IntersectionObserver` API with a single shared observer instance across all reveal targets on the Homepage.
2. WHEN a Scroll_Module's bounding box first intersects the viewport with at least 15% visibility, THE Reveal_Observer SHALL add the class `is-visible` to that module.
3. THE Reveal_Observer SHALL stop observing a Scroll_Module after its first reveal so that the animation does not retrigger on subsequent scrolls.
4. THE Homepage SHALL define CSS transitions on the `is-visible` class for opacity (from 0 to 1) and `transform: translateY(24px)` to `translateY(0)`, with a duration between 600ms and 900ms and an easing of `cubic-bezier(0.22, 1, 0.36, 1)` or equivalent.
5. WHERE a Scroll_Module is in the initial viewport on load, THE Reveal_Observer SHALL trigger its reveal within 100ms of the first paint so that above-the-fold content does not appear empty.

### Requirement 5: Pointer-Tracking Micro-Interactions

**User Story:** As a visitor moving my cursor over a card on the Homepage, I want the card to subtly tilt or shift toward the cursor, so that the page feels interactive and tactile.

#### Acceptance Criteria

1. THE Pointer_Tracker SHALL be applied to every oval product card and arched panel in the Hero_Editorial_Section.
2. WHEN the cursor moves over a tracked Scroll_Module, THE Pointer_Tracker SHALL translate the module's inner image by an offset between -8px and +8px on each axis proportional to the normalized cursor position relative to the module's center.
3. WHEN the cursor leaves a tracked Scroll_Module, THE Pointer_Tracker SHALL animate the module back to its resting position over a duration between 300ms and 500ms.
4. THE Pointer_Tracker SHALL update transforms inside `requestAnimationFrame` so that pointer movement does not produce more than one transform write per frame.
5. WHERE the input device reports `(pointer: coarse)` (touch devices) via media query, THE Pointer_Tracker SHALL be disabled, AND THE Homepage SHALL NOT expose any user-facing override that re-enables Pointer_Tracker on coarse-pointer devices.

### Requirement 6: Reduced-Motion Accessibility

**User Story:** As a visitor with a vestibular disorder or motion sensitivity, I want the parallax and movement effects to be suppressed when my OS reports reduced-motion preference, so that I can browse comfortably.

#### Acceptance Criteria

1. WHEN the media query `(prefers-reduced-motion: reduce)` evaluates to true at page load, THE Parallax_Engine SHALL set every Scroll_Module's effective Speed_Factor to 0.
2. WHEN the media query `(prefers-reduced-motion: reduce)` evaluates to true at page load, THE Pointer_Tracker SHALL be disabled.
3. WHEN the media query `(prefers-reduced-motion: reduce)` evaluates to true at page load, THE Reveal_Observer SHALL set Scroll_Modules to their final visible state immediately without animating opacity or translateY.
4. WHEN the user changes the system reduced-motion preference during a session, THE Homepage SHALL reflect the new preference within 1 second by re-evaluating the media query via `matchMedia(...).addEventListener('change', ...)`.
5. THE Homepage SHALL provide static CSS fallbacks so that all content is visible and legible even when JavaScript is disabled or the Parallax_Engine fails to initialize.
6. IF the Parallax_Engine, Reveal_Observer, or Pointer_Tracker throws during initialization or during a frame update, THEN THE Homepage SHALL catch the error, SHALL leave every Scroll_Module in its static (un-transformed, fully visible) state, AND SHALL NOT propagate the error to React's error boundary so that the rest of the page remains usable.

### Requirement 7: Responsive Layout

**User Story:** As a visitor on a phone, tablet, or desktop, I want the Homepage to look intentional and read well at my screen size, so that the editorial composition does not break on small screens.

#### Acceptance Criteria

1. WHILE the viewport width is greater than or equal to 1024px (inclusive boundary), THE Homepage SHALL render the full three-column Editorial_Grid layout with all Arched_Panels and oval product cards.
2. WHILE the viewport width is between 640px (inclusive) and 1024px (exclusive), THE Homepage SHALL render a two-column layout where the center Featured_Spotlight spans both columns and the side modules stack underneath, and SHALL preserve the Arched_Panel styling on every panel that uses it at the desktop breakpoint.
3. WHILE the viewport width is below 640px, THE Homepage SHALL render a single-column stacked layout in the order: avatar card, Featured_Spotlight, oval product cards, branded ribbon, secondary content.
4. WHERE the viewport width is below 640px, THE Parallax_Engine SHALL reduce all Speed_Factors by a factor of 0.5 to avoid disorienting movement on small screens.
5. THE Homepage SHALL render without horizontal scrollbars at viewport widths from 320px through 1920px inclusive.

### Requirement 8: Integration With Existing App Shell

**User Story:** As a developer maintaining the codebase, I want the homepage revamp to integrate with the existing Navbar, Footer, routing, and cart context, so that nothing else in the app regresses.

#### Acceptance Criteria

1. THE Homepage SHALL continue to be rendered at route `/` by `src/App.jsx` via the existing `<Route path="/" element={<Home />} />` entry without changes to that route declaration.
2. THE Homepage SHALL continue to render below the existing `<Navbar />` and above the existing `<Footer />` from `src/App.jsx`.
3. THE Homepage SHALL consume products via the existing exports from `src/data/products.js` and SHALL NOT mutate that module.
4. WHEN a visitor clicks an "Add to Cart" control rendered on the Homepage, THE Homepage SHALL invoke the existing `addToCart` function from `useCart()` defined in `src/context/CartContext.jsx`.
5. THE Homepage SHALL link to existing routes (`/shop`, `/shop?category=anti-tarnish`, `/shop?category=korean`, `/product/:id`) using `<Link>` from `react-router-dom`.
6. THE feature SHALL NOT modify `src/pages/Shop.jsx`, `src/pages/ProductDetail.jsx`, `src/pages/Cart.jsx`, `src/pages/Checkout.jsx`, `src/pages/About.jsx`, or `src/pages/Contact.jsx`.
7. THE feature SHALL NOT modify `src/components/Navbar.jsx` or `src/components/Footer.jsx`.

### Requirement 9: Content Mapping From Existing Products

**User Story:** As the brand owner, I want the new editorial modules to feature actual products from the catalog, so that the homepage drives shoppers to real items rather than placeholders.

#### Acceptance Criteria

1. THE Homepage SHALL render at least one product image from the `anti-tarnish` category and at least one from the `korean` category within the Hero_Editorial_Section.
2. WHEN a visitor clicks an oval product card in the Hero_Editorial_Section, THE Homepage SHALL navigate to `/product/{id}` for the product whose data backs that card.
3. THE Homepage SHALL render the product name and price overlay on each oval product card using `var(--font-heading)` for the name and the brand price format (`₹{price}`) for the price.
4. THE Homepage SHALL retain a section that lists "Bestseller" badged products (`product.badge === 'Bestseller'`) and a section that lists "New" badged products, sourced from Existing_Product_Data.
5. IF the count of Bestseller-badged or New-badged products in Existing_Product_Data is between 1 and 3 inclusive, THEN THE Homepage SHALL render the corresponding section with only the available products and without empty placeholder slots.
6. WHEN the count of Bestseller-badged or New-badged products in Existing_Product_Data is 0, THE Homepage SHALL omit the corresponding section entirely rather than rendering an empty container.

### Requirement 10: Performance Budget

**User Story:** As a visitor on a typical broadband connection, I want the homepage to load and animate smoothly, so that I do not abandon the page due to lag or jank.

#### Acceptance Criteria

1. THE Homepage SHALL keep the cumulative size of newly added third-party JavaScript dependencies (animation libraries) under 60 KB gzipped.
2. THE Parallax_Engine SHALL register exactly one passive `scroll` listener on `window` for the entire Homepage, regardless of how many Scroll_Modules are present.
3. THE Reveal_Observer SHALL use a single shared `IntersectionObserver` instance for the entire Homepage.
4. THE Homepage SHALL lazy-load product images outside the initial viewport using the native `loading="lazy"` attribute on `<img>` elements.
5. WHILE the user is actively scrolling, THE Homepage SHALL NOT trigger layout-thrashing reads (e.g. `getBoundingClientRect`) more than once per Scroll_Module per animation frame.
6. THE Homepage SHALL avoid CSS `box-shadow` and `filter: blur()` animations on elements that are simultaneously translated by the Parallax_Engine, to keep work on the compositor.

### Requirement 11: Hover and Focus Interactions

**User Story:** As a visitor hovering over interactive elements, I want clear visual feedback, so that I know what is clickable and the experience feels polished.

#### Acceptance Criteria

1. WHEN the cursor hovers an oval product card, THE Homepage SHALL apply a scale transform between 1.02 and 1.05 and a shadow elevation increase using `var(--shadow-lg)` over a duration between 200ms and 400ms.
2. WHEN the cursor hovers an Arched_Panel containing a call-to-action, THE Homepage SHALL reveal an underline or arrow indicator on the call-to-action label.
3. WHEN an interactive element receives keyboard focus via `Tab`, THE Homepage SHALL render a visible focus outline using at least 2px solid `var(--color-primary)` with 2px offset.
4. WHEN an interactive element is either hovered by a mouse pointer or focused via the keyboard, THE Homepage SHALL apply the union of the hover visual treatment and the focus visual treatment so that both states are simultaneously expressed (e.g. focus outline plus hover scale/shadow).

### Requirement 12: Image Asset Handling

**User Story:** As a visitor on the deployed GitHub Pages build, I want all product images to load correctly regardless of base path, so that the homepage renders without broken images.

#### Acceptance Criteria

1. THE Homepage SHALL resolve every image URL through the existing `asset()` helper from `src/utils/assetPath.js` so that the Vite base path is honored.
2. THE Homepage SHALL render every `<img>` element with a non-empty descriptive `alt` attribute, including images used for decorative SVG icons (e.g. the diamond accent above the Featured_Spotlight).
3. WHERE a decorative icon is rendered as an inline `<svg>` element (not as `<img>`), THE Homepage SHALL mark that inline SVG with `aria-hidden="true"` so screen readers skip it.

### Requirement 13: Editorial Typography and Headlines

**User Story:** As a visitor reading the Homepage, I want headlines that feel like a magazine cover, so that the brand reads as luxury and editorial.

#### Acceptance Criteria

1. THE Featured_Spotlight SHALL render a primary serif headline at a font size between 3rem and 5rem at viewports of 1024px and above.
2. THE Featured_Spotlight SHALL render a secondary uppercase tracking-wide tagline at a font size between 0.75rem and 0.875rem with letter-spacing of at least 0.15em.
3. THE Homepage SHALL render at least one date stamp module (mirroring the reference's "12.01" + "ELISABETH WALSH" pattern) using the brand's name or a curated editorial label, with a serif date in `var(--font-heading)` and a uppercase tracking-wide name label.
4. THE Homepage SHALL render at least one decorative thin horizontal divider (1px, length between 40px and 120px) under or beside section labels to mirror the reference's editorial accents.

### Requirement 14: Animation Library Decision Boundary

**User Story:** As a developer, I want the requirements to be agnostic to a specific animation library, so that the Design phase can choose between native CSS, Framer Motion, or GSAP based on bundle size and developer ergonomics.

#### Acceptance Criteria

1. THE requirements SHALL NOT mandate a specific animation library.
2. THE Design phase SHALL select the Animation_Library_Decision and document the rationale (bundle size, API ergonomics, accessibility hooks).
3. WHERE an animation library is added as a third-party JavaScript dependency, THE Design phase SHALL ensure compliance with Requirement 10's performance budget (under 60 KB gzipped of newly added animation library code).
4. WHERE animations are implemented using only native CSS (transitions, keyframes, custom properties) without adding any third-party JavaScript, THE feature SHALL be exempt from the 60 KB performance budget in Requirement 10.1, since native CSS adds zero JavaScript bundle size.
5. WHERE no animation library is added, THE Design phase SHALL document the native APIs used (`IntersectionObserver`, `matchMedia`, `requestAnimationFrame`, CSS transitions, CSS custom properties) and how they cover all behavioral requirements above.
