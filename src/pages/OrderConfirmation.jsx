import { useParams, Link } from 'react-router-dom';

export default function OrderConfirmation() {
  const { orderId } = useParams();

  const handleCopyId = () => {
    navigator.clipboard.writeText(orderId);
    alert('Order ID copied to clipboard!');
  };

  return (
    <div className="order-conf-page container" style={{ padding: '80px 20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <div className="order-conf-cardCard" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '40px 30px', boxShadow: '0 8px 32px rgba(192, 122, 142, 0.08)' }}>
        <div style={{ fontSize: '4rem', color: 'var(--color-success)', marginBottom: '20px' }}>🎉</div>
        <h1 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)', fontSize: '2rem', marginBottom: '10px' }}>Order Confirmed!</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem', marginBottom: '30px' }}>
          Thank you for shopping with us. We have received your payment and are preparing your order.
        </p>

        <div style={{ background: 'var(--color-bg)', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
          <p style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', fontWeight: 600, color: 'var(--color-text-secondary)', margin: '0 0 8px 0' }}>Your Order ID</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-primary-dark)', letterSpacing: '1px' }}>{orderId}</span>
            <button 
              onClick={handleCopyId} 
              style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Copy
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '8px 0 0 0' }}>Save this ID to track your order in real time.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link to={`/track-order?id=${orderId}`} className="btn btn-primary btn-lg" style={{ width: '100%', textDecoration: 'none', display: 'inline-block' }}>
            🚚 Track Order
          </Link>
          <Link to="/shop" className="btn btn-outline btn-lg" style={{ width: '100%', textDecoration: 'none', display: 'inline-block', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
