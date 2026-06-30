import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { CartProvider, useCart } from './context/CartContext';
import { ProductOverridesProvider, useProductOverrides } from './context/ProductOverridesContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import About from './pages/About';
import Contact from './pages/Contact';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import OrderConfirmation from './pages/OrderConfirmation';
import TrackOrder from './pages/TrackOrder';
import './App.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Toast() {
  const { toast } = useCart();
  if (!toast) return null;
  return (
    <div className={`toast toast--${toast.type}`} key={toast.message + Date.now()}>
      {toast.type === 'success' ? '✅' : 'ℹ️'} {toast.message}
    </div>
  );
}

function AppLayout() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  const { loading } = useProductOverrides();

  if (loading && !isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-bg)' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginTop: '16px', fontWeight: 500 }}>Loading Kaashvi Jewels...</p>
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
      {!isAdmin && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
          <Route path="/track-order" element={<TrackOrder />} />
        </Routes>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <Toast />}
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ProductOverridesProvider>
        <CartProvider>
          <AppLayout />
        </CartProvider>
      </ProductOverridesProvider>
    </HashRouter>
  );
}
