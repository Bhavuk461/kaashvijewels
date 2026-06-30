import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const WORKER_URL = 'https://kaashvi-admin-api.greatgatch1.workers.dev';

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  const fetchOrders = async (searchVal) => {
    if (!searchVal.trim()) return;
    setLoading(true);
    setError('');
    setOrders([]);

    try {
      const isEmail = searchVal.includes('@');
      let url = `${WORKER_URL}/api/orders/${encodeURIComponent(searchVal.trim())}`;
      if (isEmail) {
        url = `${WORKER_URL}/api/orders/lookup?email=${encodeURIComponent(searchVal.trim())}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('No order found with the provided details.');
        }
        throw new Error('Failed to fetch tracking details. Please try again.');
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([data]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam) {
      setQuery(idParam);
      fetchOrders(idParam);
    }
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrders(query);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIndex = (status) => {
    if (status === 'preparing') return 0;
    if (status === 'shipping') return 1;
    if (status === 'reached') return 2;
    return 0;
  };

  return (
    <div className="track-order-page container" style={{ padding: '60px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="section-title" style={{ textAlign: 'center', marginBottom: '10px' }}>Track Your Order</h1>
      <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: '40px' }}>
        Enter your Order ID (e.g. KJ-XXXXXX) or your email address to check status.
      </p>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', maxWidth: '600px', margin: '0 auto 50px auto' }}>
        <input
          type="text"
          placeholder="Order ID (KJ-XXXXXX) or Email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          required
          style={{
            flex: 1,
            padding: '14px 20px',
            border: '2px solid var(--color-border)',
            borderRadius: '10px',
            fontSize: '1rem',
            outline: 'none',
            background: 'var(--color-bg-card)',
            color: 'var(--color-text)',
          }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0 28px', fontSize: '1rem' }} disabled={loading}>
          {loading ? 'Searching...' : 'Track'}
        </button>
      </form>

      {error && (
        <div style={{ background: '#fdf3f2', color: '#c0392b', border: '1px solid #f5d6d2', borderRadius: '10px', padding: '16px', textAlign: 'center', marginBottom: '30px', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px auto', width: '40px', height: '40px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Fetching order details...</p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {orders.map((order) => {
            const currentStep = getStatusIndex(order.status);
            const estReachDate = order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

            return (
              <div
                key={order.orderId}
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '30px',
                  boxShadow: '0 8px 32px rgba(192, 122, 142, 0.04)',
                }}
              >
                {/* Header info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '20px', marginBottom: '30px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', color: 'var(--color-text)' }}>Order {order.orderId}</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Placed on {formatDate(order.createdAt)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Total Amount</p>
                    <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>₹{order.totals?.total}</span>
                  </div>
                </div>

                {/* Progress Stepper */}
                <div style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '10px' }}>
                    {/* Background track line */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '15px',
                        left: '10%',
                        right: '10%',
                        height: '4px',
                        background: '#e0e0e0',
                        zIndex: 1,
                      }}
                    />
                    {/* Active progress fill line */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '15px',
                        left: '10%',
                        width: `${currentStep * 40}%`,
                        height: '4px',
                        background: 'var(--color-primary)',
                        zIndex: 2,
                        transition: 'width 0.4s ease',
                      }}
                    />

                    {/* Step 1: Preparing */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20%', zIndex: 3 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: currentStep >= 0 ? 'var(--color-primary)' : '#e0e0e0',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '0.9rem',
                          boxShadow: currentStep === 0 ? '0 0 0 6px rgba(192, 122, 142, 0.2)' : 'none',
                        }}
                      >
                        {currentStep > 0 ? '✓' : '1'}
                      </div>
                      <span style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: currentStep === 0 ? 700 : 500, color: currentStep >= 0 ? 'var(--color-text)' : 'var(--color-text-muted)' }}>Preparing</span>
                    </div>

                    {/* Step 2: Shipping */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20%', zIndex: 3 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: currentStep >= 1 ? 'var(--color-primary)' : '#e0e0e0',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '0.9rem',
                          boxShadow: currentStep === 1 ? '0 0 0 6px rgba(192, 122, 142, 0.2)' : 'none',
                        }}
                      >
                        {currentStep > 1 ? '✓' : '2'}
                      </div>
                      <span style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: currentStep === 1 ? 700 : 500, color: currentStep >= 1 ? 'var(--color-text)' : 'var(--color-text-muted)' }}>Shipping</span>
                    </div>

                    {/* Step 3: Reached */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20%', zIndex: 3 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: currentStep >= 2 ? 'var(--color-success)' : '#e0e0e0',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '0.9rem',
                          boxShadow: currentStep === 2 ? '0 0 0 6px rgba(76, 175, 80, 0.2)' : 'none',
                        }}
                      >
                        {currentStep >= 2 ? '✓' : '3'}
                      </div>
                      <span style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: currentStep === 2 ? 700 : 500, color: currentStep >= 2 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>Reached</span>
                    </div>
                  </div>
                </div>

                {/* Tracking Messages / Estimated reach time */}
                {order.status === 'shipping' && estReachDate && (
                  <div style={{ background: 'var(--color-primary-lighter)', border: '1px dashed var(--color-primary)', borderRadius: '12px', padding: '16px', marginBottom: '30px', textAlign: 'center' }}>
                    <p style={{ margin: 0, color: 'var(--color-primary-dark)', fontWeight: 600, fontSize: '0.95rem' }}>
                      🚚 Your order is on its way! Estimated delivery: <span style={{ textDecoration: 'underline' }}>{estReachDate}</span> (4-5 days)
                    </p>
                  </div>
                )}

                {order.status === 'reached' && (
                  <div style={{ background: 'rgba(76, 175, 80, 0.08)', border: '1px dashed var(--color-success)', borderRadius: '12px', padding: '16px', marginBottom: '30px', textAlign: 'center' }}>
                    <p style={{ margin: 0, color: 'var(--color-success)', fontWeight: 600, fontSize: '0.95rem' }}>
                      ✓ Your package has reached! Enjoy your beautiful jewelry.
                    </p>
                  </div>
                )}

                {/* Items Summary */}
                <div>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--color-text)' }}>Items Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(order.items || []).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg)', padding: '12px 16px', borderRadius: '10px' }}>
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.name}</span>
                          {item.selectedColor && (
                            <span style={{ marginLeft: '8px', fontSize: '0.8rem', background: 'var(--color-primary-light)', padding: '2px 8px', borderRadius: '12px', color: 'var(--color-primary-dark)', fontWeight: 600 }}>
                              {item.selectedColor}
                            </span>
                          )}
                        </div>
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                          ₹{item.price} × {item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
