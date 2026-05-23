import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { CartProvider, useCart } from './context/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import About from './pages/About';
import Contact from './pages/Contact';
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
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
      <Footer />
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <AppLayout />
      </CartProvider>
    </BrowserRouter>
  );
}
