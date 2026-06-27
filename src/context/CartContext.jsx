import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('kaashvi-cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    localStorage.setItem('kaashvi-cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item =>
        item.id === product.id &&
        (item.selectedColor || '') === (product.selectedColor || '')
      );
      if (existing) {
        return prev.map(item =>
          (item.id === product.id &&
            (item.selectedColor || '') === (product.selectedColor || ''))
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
    showToast(`${product.name} added to cart!`, 'success');
  };

  const removeFromCart = (productId, selectedColor) => {
    setCart(prev => prev.filter(item =>
      !(item.id === productId &&
        (item.selectedColor || '') === (selectedColor || ''))
    ));
    showToast('Item removed from cart', 'info');
  };

  const updateQuantity = (productId, quantity, selectedColor) => {
    if (quantity < 1) {
      removeFromCart(productId, selectedColor);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        (item.id === productId &&
          (item.selectedColor || '') === (selectedColor || ''))
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    showToast('Cart cleared', 'info');
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        toast,
        showToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
