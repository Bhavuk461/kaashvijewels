import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const WORKER_URL = 'https://kaashvi-admin-api.greatgatch1.workers.dev';

const ProductOverridesContext = createContext();

export function ProductOverridesProvider({ children }) {
  const [overrides, setOverrides] = useState({});
  const [customProducts, setCustomProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshOverrides = useCallback(async () => {
    try {
      setLoading(true);
      const [overridesRes, productsRes] = await Promise.all([
        fetch(`${WORKER_URL}/api/overrides?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`${WORKER_URL}/api/products?t=${Date.now()}`, { cache: 'no-store' }),
      ]);

      if (overridesRes.ok) {
        const data = await overridesRes.json();
        setOverrides(data.overrides || {});
      }
      if (productsRes.ok) {
        const data = await productsRes.json();
        setCustomProducts(Array.isArray(data.products) ? data.products : []);
      }
    } catch (err) {
      console.error('Failed to fetch product data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshOverrides();
  }, [refreshOverrides]);

  const getProductPrice = useCallback(
    (product) => {
      const override = overrides[product.id];
      if (override && override.price != null) {
        return override.price;
      }
      return product.price;
    },
    [overrides]
  );

  const isOutOfStock = useCallback(
    (productId) => {
      const override = overrides[productId];
      return override?.outOfStock === true;
    },
    [overrides]
  );

  return (
    <ProductOverridesContext.Provider
      value={{
        overrides,
        customProducts,
        loading,
        getProductPrice,
        isOutOfStock,
        refreshOverrides,
      }}
    >
      {children}
    </ProductOverridesContext.Provider>
  );
}

export function useProductOverrides() {
  const context = useContext(ProductOverridesContext);
  if (!context) {
    throw new Error(
      'useProductOverrides must be used within a ProductOverridesProvider'
    );
  }
  return context;
}
