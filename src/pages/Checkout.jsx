import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://kaashvi-payments.greatgatch1.workers.dev';

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, getCartTotal, clearCart, showToast } = useCart();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  // ── Derived totals (display only; the Worker re-validates these) ──
  const subtotal = getCartTotal();
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;

  // ── Form handlers ──
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ── Form validation ──
  const validateForm = () => {
    const requiredFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'address',
      'city',
      'state',
      'pincode',
    ];
    for (const field of requiredFields) {
      if (!formData[field].trim()) {
        const label = field
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (s) => s.toUpperCase());
        showToast(`Please fill in ${label}`, 'error');
        return false;
      }
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      showToast('Please enter a valid email address', 'error');
      return false;
    }
    if (!/^\d{10}$/.test(formData.phone.replace(/\s/g, ''))) {
      showToast('Please enter a valid 10-digit phone number', 'error');
      return false;
    }
    if (!/^\d{6}$/.test(formData.pincode.replace(/\s/g, ''))) {
      showToast('Please enter a valid 6-digit pincode', 'error');
      return false;
    }
    return true;
  };

  // ── Razorpay payment flow (create order -> checkout -> verify) ──
  const handlePayment = async () => {
    if (!validateForm()) return;
    if (!WORKER_URL) {
      showToast('Payment is not configured. Please try again later.', 'error');
      return;
    }
    if (!window.Razorpay) {
      showToast('Payment library failed to load. Refresh and retry.', 'error');
      return;
    }

    const items = cart.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      ...(item.selectedColor ? { selectedColor: item.selectedColor } : {}),
    }));

    setSubmitting(true);
    try {
      // 1) Create the order server-side.
      const orderRes = await fetch(`${WORKER_URL}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!orderRes.ok) throw new Error('create-order failed');
      const { orderId, amount, currency, keyId } = await orderRes.json();

      // 2) Open Razorpay checkout.
      const options = {
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: 'The Kaashvi Jewels',
        description: 'Jewellery Purchase',
        image: '/images/logo.png',
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          contact: formData.phone,
        },
        theme: { color: '#C07A8E' },
        handler: async function (response) {
          // 3) Verify the payment signature server-side.
          try {
            const verifyRes = await fetch(`${WORKER_URL}/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                customer: formData,
                items,
              }),
            });
            if (!verifyRes.ok) throw new Error('verify failed');
            showToast('Payment successful! Your order is confirmed.', 'success');
            clearCart();
            navigate('/');
          } catch {
            showToast(
              'Payment captured but verification failed. We will contact you.',
              'error'
            );
          }
        },
        modal: {
          ondismiss: function () {
            showToast('Payment cancelled.', 'info');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function () {
        showToast('Payment failed. Please try again.', 'error');
      });
      rzp.open();
    } catch {
      showToast('Could not start payment. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Empty cart state ──
  if (cart.length === 0) {
    return (
      <div className="checkout-page">
        <div className="container">
          <h1 style={{ marginBottom: 'var(--space-lg)' }}>Checkout</h1>
          <div className="cart-empty">
            <div className="cart-empty__icon">🛒</div>
            <h3 className="cart-empty__title">Your cart is empty</h3>
            <p className="cart-empty__text">
              You need to add some items to your cart before checking out.
            </p>
            <Link to="/shop" className="btn btn-primary">
              💎 Browse Collection
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <h1 style={{ marginBottom: 'var(--space-2xl)' }}>Checkout</h1>

        <div className="checkout-layout">
          {/* ── Shipping Form ── */}
          <div>
            <h3 style={{ marginBottom: 'var(--space-xl)' }}>Shipping Details</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  placeholder="Enter first name"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  placeholder="Enter last name"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="10-digit mobile number"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">Address</label>
              <textarea
                id="address"
                name="address"
                rows="3"
                placeholder="House no., Street, Landmark"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  placeholder="Enter city"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="state">State</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  placeholder="Enter state"
                  value={formData.state}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="pincode">Pincode</label>
              <input
                type="text"
                id="pincode"
                name="pincode"
                placeholder="6-digit pincode"
                value={formData.pincode}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* ── Order Summary + Payment ── */}
          <div className="cart-summary">
            <h3 className="cart-summary__title">Order Summary</h3>

            {cart.map((item) => (
              <div
                key={item.id}
                className="cart-summary__row"
                style={{ fontSize: '0.85rem' }}
              >
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>₹{item.price * item.quantity}</span>
              </div>
            ))}

            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                marginTop: 'var(--space-md)',
                paddingTop: 'var(--space-md)',
              }}
            ></div>

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
              <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Free</span>
            </div>
            <div className="cart-summary__row cart-summary__row--total">
              <span>Total</span>
              <span>₹{total}</span>
            </div>

            <button
              className="btn btn-gold btn-lg"
              style={{ width: '100%', marginTop: 'var(--space-xl)' }}
              onClick={handlePayment}
              disabled={submitting}
            >
              {submitting ? 'Processing…' : '💳 Pay with Razorpay'}
            </button>

            <p
              style={{
                textAlign: 'center',
                marginTop: 'var(--space-md)',
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              🔒 Secure payment powered by Razorpay
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
