import { useMemo } from 'react';
import { products as staticProducts } from '../data/products';
import { useProductOverrides } from '../context/ProductOverridesContext';

/**
 * Returns the full catalogue: the static (built-in) products merged with
 * admin-created custom products fetched from the Worker (`/api/products`).
 *
 * Custom products are appended after the static ones so "Newest First"
 * sorting surfaces them naturally. Each custom product already carries an
 * `images` array and a `custom: true` flag.
 */
export function useAllProducts() {
  const { customProducts } = useProductOverrides();

  return useMemo(() => {
    if (!customProducts || customProducts.length === 0) return staticProducts;
    return [...staticProducts, ...customProducts];
  }, [customProducts]);
}
