import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { products, categories } from '../data/products';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const { addToCart } = useCart();

  const antiTarnish = products.filter(p => p.category === 'anti-tarnish');
  const korean = products.filter(p => p.category === 'korean');
  const bestsellers = products.filter(p => p.badge === 'Bestseller');
  const newArrivals = products.filter(p => p.badge === 'New');

  return (
    <>
      {/* ═══ Full-Width Hero Banner ═══ */}
      <section className="home-hero">
        <div className="home-hero__grid">
          <Link to="/shop?category=anti-tarnish" className="home-hero__panel home-hero__panel--left">
            <img src="/images/products/anti-tarnish/at-05.png" alt="Anti-Tarnish Collection" className="home-hero__img" />
            <div className="home-hero__overlay">
              <span className="home-hero__label">Anti-Tarnish Collection</span>
              <h2 className="home-hero__title">Golden Elegance</h2>
              <span className="home-hero__cta">Shop Now →</span>
            </div>
          </Link>
          <Link to="/shop?category=korean" className="home-hero__panel home-hero__panel--right">
            <img src="/images/products/korean/kr-07.png" alt="Korean Collection" className="home-hero__img" />
            <div className="home-hero__overlay">
              <span className="home-hero__label">Korean Collection</span>
              <h2 className="home-hero__title">Crystal & Pearl</h2>
              <span className="home-hero__cta">Shop Now →</span>
            </div>
          </Link>
        </div>
      </section>

      {/* ═══ Bestsellers Strip ═══ */}
      <section className="home-strip">
        <div className="container">
          <div className="home-strip__header">
            <h2>Bestsellers</h2>
            <Link to="/shop" className="home-strip__viewall">View All →</Link>
          </div>
          <div className="home-scroll">
            {bestsellers.map(product => (
              <div className="home-scroll__item" key={product.id}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Marquee Trust Banner ═══ */}
      <div className="home-marquee">
        <div className="home-marquee__track">
          {[...Array(3)].map((_, i) => (
            <span key={i} className="home-marquee__content">
              <span>✨ ANTI-TARNISH GUARANTEED</span>
              <span className="home-marquee__dot">·</span>
              <span>🚚 FREE SHIPPING ABOVE ₹499</span>
              <span className="home-marquee__dot">·</span>
              <span>↩️ 7-DAY EASY RETURNS</span>
              <span className="home-marquee__dot">·</span>
              <span>🔒 SECURE PAYMENTS</span>
              <span className="home-marquee__dot">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ═══ Anti-Tarnish Collection Full Grid ═══ */}
      <section className="home-collection">
        <div className="container">
          <div className="home-strip__header">
            <div>
              <h2>Anti-Tarnish Collection</h2>
              <p className="home-collection__sub">Premium gold-plated earrings that resist tarnishing</p>
            </div>
            <Link to="/shop?category=anti-tarnish" className="home-strip__viewall">View All →</Link>
          </div>
          <div className="product-grid">
            {antiTarnish.slice(0, 8).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Wide Banner ═══ */}
      <section className="home-wide-banner">
        <div className="home-wide-banner__grid">
          <div className="home-wide-banner__imgwrap">
            <img src="/images/products/anti-tarnish/at-11.png" alt="Butterfly Studs" />
          </div>
          <div className="home-wide-banner__content">
            <span className="home-wide-banner__tag">Featured</span>
            <h2>Golden Double Butterfly Studs</h2>
            <p>Our most-loved design — two butterflies stacked with detailed ribbed wing texture. A symbol of transformation and beauty.</p>
            <Link to="/product/at-11" className="btn btn-primary btn-lg">Shop This Look →</Link>
          </div>
          <div className="home-wide-banner__imgwrap">
            <img src="/images/products/anti-tarnish/at-16.png" alt="Double Star Dangles" />
          </div>
        </div>
      </section>

      {/* ═══ New Arrivals ═══ */}
      <section className="home-strip">
        <div className="container">
          <div className="home-strip__header">
            <h2>New Arrivals</h2>
            <Link to="/shop" className="home-strip__viewall">View All →</Link>
          </div>
          <div className="home-scroll">
            {newArrivals.map(product => (
              <div className="home-scroll__item" key={product.id}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Korean Collection Full Grid ═══ */}
      <section className="home-collection" style={{ background: 'var(--color-bg-warm)' }}>
        <div className="container">
          <div className="home-strip__header">
            <div>
              <h2>Korean Collection</h2>
              <p className="home-collection__sub">Delicate, trend-forward designs with crystals & pearls</p>
            </div>
            <Link to="/shop?category=korean" className="home-strip__viewall">View All →</Link>
          </div>
          <div className="product-grid">
            {korean.slice(0, 8).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Product Mosaic ═══ */}
      <section className="home-mosaic">
        <Link to="/product/at-01" className="home-mosaic__item home-mosaic__item--tall">
          <img src="/images/products/anti-tarnish/at-01.png" alt={products[0].name} />
          <div className="home-mosaic__overlay">
            <span>{products[0].name}</span>
            <span>₹{products[0].price}</span>
          </div>
        </Link>
        <Link to="/product/at-03" className="home-mosaic__item">
          <img src="/images/products/anti-tarnish/at-03.png" alt={products[2].name} />
          <div className="home-mosaic__overlay">
            <span>{products[2].name}</span>
            <span>₹{products[2].price}</span>
          </div>
        </Link>
        <Link to="/product/at-09" className="home-mosaic__item">
          <img src="/images/products/anti-tarnish/at-09.png" alt={products[8].name} />
          <div className="home-mosaic__overlay">
            <span>{products[8].name}</span>
            <span>₹{products[8].price}</span>
          </div>
        </Link>
        <Link to="/product/at-15" className="home-mosaic__item home-mosaic__item--tall">
          <img src="/images/products/anti-tarnish/at-15.png" alt={products[14].name} />
          <div className="home-mosaic__overlay">
            <span>{products[14].name}</span>
            <span>₹{products[14].price}</span>
          </div>
        </Link>
        <Link to="/product/at-14" className="home-mosaic__item">
          <img src="/images/products/anti-tarnish/at-14.png" alt={products[13].name} />
          <div className="home-mosaic__overlay">
            <span>{products[13].name}</span>
            <span>₹{products[13].price}</span>
          </div>
        </Link>
        <Link to="/product/at-07" className="home-mosaic__item">
          <img src="/images/products/anti-tarnish/at-07.png" alt={products[6].name} />
          <div className="home-mosaic__overlay">
            <span>{products[6].name}</span>
            <span>₹{products[6].price}</span>
          </div>
        </Link>
      </section>

      {/* ═══ Browse All CTA ═══ */}
      <section className="home-browse-cta">
        <h2>Explore the Full Collection</h2>
        <p>28 exquisite designs crafted for every occasion</p>
        <Link to="/shop" className="btn btn-primary btn-lg">Shop All Earrings →</Link>
      </section>
    </>
  );
}
