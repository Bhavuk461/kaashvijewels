// Hero product selection helpers for the editorial hero section.
// Pure, side-effect-free, and tolerant of null/undefined/empty product arrays.
//
// Used by Home.jsx (task 12.1) to populate the five hero slots:
//   leftAvatar, leftOval, centerHero, rightCard, rightOval.
//
// _Requirements: 9.1, 9.2_

/**
 * Defensive product lookup by id.
 *
 * Returns the first product whose `id` matches, otherwise the supplied
 * `fallback`. Tolerates a `null` / `undefined` / non-array `products`
 * input by returning the fallback directly — never throws.
 *
 * @param {Array<{id: string}>|null|undefined} products
 * @param {string} id
 * @param {*} fallback
 * @returns {*}
 */
export function pickById(products, id, fallback) {
  if (!Array.isArray(products)) return fallback;
  return products.find((p) => p && p.id === id) || fallback;
}

/**
 * Select the five products that populate the editorial hero composition.
 *
 * Looks up the curated ids first; falls back to the first available
 * product in the relevant category when an id is missing. If a category
 * has no products at all, the corresponding slot resolves to `null` so
 * the hero can skip rendering that module gracefully.
 *
 * @param {Array<{id: string, category: string}>|null|undefined} products
 * @returns {{
 *   leftAvatar: object|null,
 *   leftOval: object|null,
 *   centerHero: object|null,
 *   rightCard: object|null,
 *   rightOval: object|null,
 * }}
 */
export function selectHeroProducts(products) {
  const safe = Array.isArray(products) ? products : [];

  const antiTarnish = safe.filter((p) => p && p.category === 'anti-tarnish');
  const korean = safe.filter((p) => p && p.category === 'korean');

  return {
    // Anti-tarnish floral statement (Bestseller)
    leftAvatar: pickById(safe, 'at-01', antiTarnish[0] || null),
    // Korean delicate piece (Bestseller)
    leftOval: pickById(safe, 'kr-03', korean[0] || null),
    // Anti-tarnish flagship (Bestseller cascading flower)
    centerHero: pickById(safe, 'at-05', antiTarnish[0] || null),
    // Anti-tarnish butterfly (Bestseller)
    rightCard: pickById(safe, 'at-11', antiTarnish[1] || antiTarnish[0] || null),
    // Korean pearl cluster (Bestseller)
    rightOval: pickById(safe, 'kr-06', korean[1] || korean[0] || null),
  };
}
