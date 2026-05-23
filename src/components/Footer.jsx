import { Link } from 'react-router-dom';
import { asset } from '../utils/assetPath';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input').value;
    if (email) {
      alert('Thank you for subscribing! 💌');
      e.target.reset();
    }
  };

  return (
    <footer className="footer" id="main-footer">
      <div className="container">
        <div className="footer__grid">
          {/* Brand */}
          <div>
            <img src={asset('/images/logo.png')} alt="The Kaashvi Jewels" className="footer__brand-logo" />
            <p className="footer__brand-text">
              Discover the beauty of affordable luxury. The Kaashvi Jewels brings you exquisite 
              artificial jewellery that makes every moment special. Premium quality, timeless designs.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="footer__heading">Quick Links</h4>
            <Link to="/" className="footer__link">Home</Link>
            <Link to="/shop" className="footer__link">Shop All</Link>
            <Link to="/shop?category=anti-tarnish" className="footer__link">Anti-Tarnish</Link>
            <Link to="/shop?category=korean" className="footer__link">Korean Style</Link>
            <Link to="/about" className="footer__link">About Us</Link>
            <Link to="/contact" className="footer__link">Contact</Link>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="footer__heading">Help</h4>
            <Link to="/contact" className="footer__link">FAQs</Link>
            <Link to="/contact" className="footer__link">Shipping Info</Link>
            <Link to="/contact" className="footer__link">Returns & Exchange</Link>
            <Link to="/contact" className="footer__link">Track Order</Link>
            <Link to="/contact" className="footer__link">Privacy Policy</Link>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="footer__heading">Stay Connected</h4>
            <p className="footer__newsletter-text">
              Subscribe to get exclusive offers, new arrivals, and styling tips delivered to your inbox.
            </p>
            <form className="footer__newsletter-form" onSubmit={handleNewsletterSubmit}>
              <input 
                type="email" 
                placeholder="Your email address" 
                className="footer__newsletter-input"
                required
                id="footer-newsletter-input"
              />
              <button type="submit" className="btn btn-primary btn-sm" id="footer-newsletter-btn">
                →
              </button>
            </form>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__copyright">
            © {currentYear} The Kaashvi Jewels. All rights reserved. Made with 💕
          </p>
          <div className="footer__socials">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="footer__social-link" aria-label="Instagram">
              📸
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="footer__social-link" aria-label="Facebook">
              📘
            </a>
            <a href="https://wa.me/919871796965" target="_blank" rel="noopener noreferrer" className="footer__social-link" aria-label="WhatsApp">
              💬
            </a>
            <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" className="footer__social-link" aria-label="Pinterest">
              📌
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
