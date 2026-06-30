import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const WORKER_URL = 'https://kaashvi-admin-api.greatgatch1.workers.dev';

const ProductOverridesContext = createContext();

export function ProductOverridesProvider({ children }) {
  const [overrides, setOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem('kaashvi-cached-overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [customProducts, setCustomProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('kaashvi-cached-products');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const savedOverrides = localStorage.getItem('kaashvi-cached-overrides');
      const savedProducts = localStorage.getItem('kaashvi-cached-products');
      return !(savedOverrides && savedProducts);
    } catch {
      return true;
    }
  });

  const refreshOverrides = useCallback(async () => {
    try {
      const savedOverrides = localStorage.getItem('kaashvi-cached-overrides');
      const savedProducts = localStorage.getItem('kaashvi-cached-products');
      if (!savedOverrides || !savedProducts) {
        setLoading(true);
      }
      const [overridesRes, productsRes] = await Promise.all([
        fetch(`${WORKER_URL}/api/overrides?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`${WORKER_URL}/api/products?t=${Date.now()}`, { cache: 'no-store' }),
      ]);

      if (overridesRes.ok) {
        const data = await overridesRes.json();
        const freshOverrides = data.overrides || {};
        setOverrides(freshOverrides);
        localStorage.setItem('kaashvi-cached-overrides', JSON.stringify(freshOverrides));
      }
      if (productsRes.ok) {
        const data = await productsRes.json();
        const freshProducts = Array.isArray(data.products) ? data.products : [];
        setCustomProducts(freshProducts);
        localStorage.setItem('kaashvi-cached-products', JSON.stringify(freshProducts));
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

  /**
   * Return the images to display for a product, respecting admin overrides.
   * Priority: override.images → product.images → [product.image].
   */
  const getProductImages = useCallback(
    (product) => {
      const override = overrides[product.id];
      if (override?.images && override.images.length > 0) {
        return override.images;
      }
      if (product.images && product.images.length > 0) {
        return product.images;
      }
      return product.image ? [product.image] : [];
    },
    [overrides]
  );

  const getProductColors = useCallback(
    (product) => {
      const override = overrides[product.id];
      if (override?.colors && Array.isArray(override.colors)) {
        return override.colors;
      }
      return [];
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
        getProductImages,
        getProductColors,
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

