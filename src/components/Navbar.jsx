import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { getCartCount } = useCart();
  const location = useLocation();
  const cartCount = getCartCount();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`} id="main-navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__logo" id="navbar-logo">
          <img src="/images/logo.png" alt="The Kaashvi Jewels" />
        </Link>

        <div className={`navbar__links ${mobileOpen ? 'navbar__links--open' : ''}`}>
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar__link ${location.pathname === link.to ? 'navbar__link--active' : ''}`}
              id={`nav-link-${link.label.toLowerCase()}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="navbar__actions">
          <Link to="/cart" className="navbar__cart-btn" id="navbar-cart-btn">
            🛒
            {cartCount > 0 && (
              <span className="navbar__cart-badge" key={cartCount}>
                {cartCount}
              </span>
            )}
          </Link>

          <button
            className="navbar__mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            id="navbar-mobile-toggle"
          >
            <span style={mobileOpen ? { transform: 'rotate(45deg) translate(5px, 5px)' } : {}} />
            <span style={mobileOpen ? { opacity: 0 } : {}} />
            <span style={mobileOpen ? { transform: 'rotate(-45deg) translate(5px, -5px)' } : {}} />
          </button>
        </div>
      </div>
    </nav>
  );
}
