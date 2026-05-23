import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { asset } from '../utils/assetPath';

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, getCartTotal } = useCart();

  const subtotal = getCartTotal();
  const gst = Math.round(subtotal * 0.18);
  const shipping = subtotal > 499 ? 0 : 49;
  const total = subtotal + gst + shipping;

  // ── Empty cart ──
  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <h1 style={{ marginBottom: 'var(--space-lg)' }}>Shopping Cart</h1>
          <div className="cart-empty">
            <div className="cart-empty__icon">🛒</div>
            <h3 className="cart-empty__title">Your cart is empty</h3>
            <p className="cart-empty__text">
              Looks like you haven't added any jewellery yet. Explore our beautiful collection
              and find something you love!
            </p>
            <Link to="/shop" className="btn btn-primary">
              💎 Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <h1 style={{ marginBottom: 'var(--space-2xl)' }}>Shopping Cart</h1>

        <div className="cart-layout">
          {/* ── Cart Items ── */}
          <div className="cart-items">
            {cart.map((item) => {
              const categoryLabel =
                item.category === 'anti-tarnish' ? 'Anti-Tarnish' : 'Korean';

              return (
                <div className="cart-item" key={item.id}>
                  {/* Item Image */}
                  <img
                    src={asset(item.image)}
                    alt={item.name}
                    className="cart-item__image"
                  />

                  {/* Item Info */}
                  <div className="cart-item__info">
                    <h4 className="cart-item__name">{item.name}</h4>
                    <p className="cart-item__price">₹{item.price}</p>
                    <p
                      style={{
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--color-primary)',
                        fontWeight: 600,
                      }}
                    >
                      {categoryLabel}
                    </p>
                  </div>

                  {/* Item Actions */}
                  <div className="cart-item__actions">
                    <button
                      className="cart-item__remove"
                      onClick={() => removeFromCart(item.id)}
                    >
                      ✕ Remove
                    </button>
                    <div className="quantity-controls">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, Math.min(item.quantity + 1, 10))
                        }
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Order Summary ── */}
          <div className="cart-summary">
            <h3 className="cart-summary__title">Order Summary</h3>

            <div className="cart-summary__row">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="cart-summary__row">
              <span>GST (18%)</span>
              <span>₹{gst}</span>
            </div>
            <div className="cart-summary__row">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
            </div>
            <div className="cart-summary__row cart-summary__row--total">
              <span>Total</span>
              <span>₹{total}</span>
            </div>

            <Link
              to="/checkout"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 'var(--space-xl)' }}
            >
              Proceed to Checkout →
            </Link>

            <Link
              to="/shop"
              style={{
                display: 'block',
                textAlign: 'center',
                marginTop: 'var(--space-md)',
                color: 'var(--color-primary)',
                fontWeight: 500,
                fontSize: '0.9rem',
              }}
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
