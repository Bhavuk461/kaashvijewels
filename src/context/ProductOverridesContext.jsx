import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const WORKER_URL = 'https://kaashvi-admin-api.greatgatch1.workers.dev';

const ProductOverridesContext = createContext();

export function ProductOverridesProvider({ children }) {
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(true);

  const refreshOverrides = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${WORKER_URL}/api/overrides`);
      if (res.ok) {
        const data = await res.json();
        // data is expected to be { [productId]: { price?: number, outOfStock?: boolean } }
        setOverrides(data);
      }
    } catch (err) {
      console.error('Failed to fetch overrides:', err);
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
