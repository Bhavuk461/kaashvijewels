import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { products } from '../data/products';
import ProductCard from '../components/ProductCard';
import ParallaxProvider from '../hooks/ParallaxProvider';
import useReveal from '../hooks/useReveal';
import HeroEditorialSection from './HeroEditorialSection';
import { asset } from '../utils/assetPath';
import './Home.css';

/* ─── RevealSection ─────────────────────────────────────────────
 * Wraps a preserved homepage section in a single shared `useReveal`
 * registration so the whole section fades in on first intersection.
 * Per the design (R10.2 / R10.3), each top-level section gets ONE
 * observer registration — never one per card.
 * ──────────────────────────────────────────────────────────────── */
function RevealSection({ as: Tag = 'section', className, style, children }) {
  const { ref, isVisible } = useReveal();
  const composed = `${className ? className + ' ' : ''}reveal${
    isVisible ? ' is-visible' : ''
  }`.trim();
  return (
    <Tag ref={ref} className={composed} style={style}>
      {children}
    </Tag>
  );
}

/* ─── Strip ─────────────────────────────────────────────────────
 * Horizontal-scroll product strip. Rendered conditionally by
 * HomeContent only when `items.length > 0` (R9.5 / R9.6).
 * ──────────────────────────────────────────────────────────────── */
function Strip({ title, items }) {
  return (
    <RevealSection className="home-strip">
      <div className="container">
        <div className="home-strip__header">
          <h2>{title}</h2>
          <Link to="/shop" className="home-strip__viewall">
            View All →
          </Link>
        </div>
        <div className="home-scroll">
          {items.map((product) => (
            <div className="home-scroll__item" key={product.id}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}

/* ─── HomeContent ───────────────────────────────────────────────
 * Inner component rendered as a child of <ParallaxProvider>. Adds
 * `parallax-ready` to <body> on mount and removes it on unmount —
 * this gates the reveal-on-scroll initial state per the design's
 * static-fallback strategy (Home.css `.parallax-ready .reveal`).
 *
 * Must live INSIDE the provider so consumer hooks (useReveal etc.)
 * resolve the engine context.
 * ──────────────────────────────────────────────────────────────── */
function HomeContent() {
  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) return undefined;
    document.body.classList.add('parallax-ready');
    return () => {
      document.body.classList.remove('parallax-ready');
    };
  }, []);

  const antiTarnish = products.filter((p) => p.category === 'anti-tarnish');
  const korean = products.filter((p) => p.category === 'korean');
  const bestsellers = products.filter((p) => p.badge === 'Bestseller');
  const newArrivals = products.filter((p) => p.badge === 'New');

  return (
    <>
      {/* ═══ Editorial Hero (replaces the legacy two-panel banner) ═══ */}
      <HeroEditorialSection products={products} />

      {/* ═══ Marquee Trust Banner ═══ */}
      <RevealSection as="div" className="home-marquee">
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
      </RevealSection>

      {/* ═══ Anti-Tarnish Collection Full Grid ═══ */}
      <RevealSection className="home-collection">
        <div className="container">
          <div className="home-strip__header">
            <div>
              <h2>Anti-Tarnish Collection</h2>
              <p className="home-collection__sub">
                Premium gold-plated earrings that resist tarnishing
              </p>
            </div>
            <Link to="/shop?category=anti-tarnish" className="home-strip__viewall">
              View All →
            </Link>
          </div>
          <div className="product-grid">
            {antiTarnish.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ═══ Wide Banner ═══ */}
      <RevealSection className="home-wide-banner">
        <div className="home-wide-banner__grid">
          <div className="home-wide-banner__imgwrap">
            <img
              src={asset('/images/products/anti-tarnish/at-11.png')}
              alt="Butterfly Studs"
              loading="lazy"
            />
          </div>
          <div className="home-wide-banner__content">
            <span className="home-wide-banner__tag">Featured</span>
            <h2>Golden Double Butterfly Studs</h2>
            <p>
              Our most-loved design — two butterflies stacked with detailed
              ribbed wing texture. A symbol of transformation and beauty.
            </p>
            <Link to="/product/at-11" className="btn btn-primary btn-lg">
              Shop This Look →
            </Link>
          </div>
          <div className="home-wide-banner__imgwrap">
            <img
              src={asset('/images/products/anti-tarnish/at-16.png')}
              alt="Double Star Dangles"
              loading="lazy"
            />
          </div>
        </div>
      </RevealSection>

      {/* ═══ Bestsellers Strip (conditional) ═══ */}
      {bestsellers.length > 0 && <Strip title="Bestsellers" items={bestsellers} />}

      {/* ═══ New Arrivals Strip (conditional) ═══ */}
      {newArrivals.length > 0 && <Strip title="New Arrivals" items={newArrivals} />}

      {/* ═══ Korean Collection Full Grid ═══ */}
      <RevealSection
        className="home-collection"
        style={{ background: 'var(--color-bg-warm)' }}
      >
        <div className="container">
          <div className="home-strip__header">
            <div>
              <h2>Korean Collection</h2>
              <p className="home-collection__sub">
                Delicate, trend-forward designs with crystals & pearls
              </p>
            </div>
            <Link to="/shop?category=korean" className="home-strip__viewall">
              View All →
            </Link>
          </div>
          <div className="product-grid">
            {korean.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ═══ Product Mosaic ═══ */}
      <RevealSection className="home-mosaic">
        <Link to="/product/at-01" className="home-mosaic__item home-mosaic__item--tall">
          <img
            src={asset('/images/products/anti-tarnish/at-01.png')}
            alt={products[0].name}
            loading="lazy"
          />
          <div className="home-mosaic__overlay">
            <span>{products[0].name}</span>
            <span>₹{products[0].price}</span>
          </div>
        </Link>
        <Link to="/product/at-03" className="home-mosaic__item">
          <img
            src={asset('/images/products/anti-tarnish/at-03.png')}
            alt={products[2].name}
            loading="lazy"
          />
          <div className="home-mosaic__overlay">
            <span>{products[2].name}</span>
            <span>₹{products[2].price}</span>
          </div>
        </Link>
        <Link to="/product/at-09" className="home-mosaic__item">
          <img
            src={asset('/images/products/anti-tarnish/at-09.png')}
            alt={products[8].name}
            loading="lazy"
          />
          <div className="home-mosaic__overlay">
            <span>{products[8].name}</span>
            <span>₹{products[8].price}</span>
          </div>
        </Link>
        <Link to="/product/at-15" className="home-mosaic__item home-mosaic__item--tall">
          <img
            src={asset('/images/products/anti-tarnish/at-15.png')}
            alt={products[14].name}
            loading="lazy"
          />
          <div className="home-mosaic__overlay">
            <span>{products[14].name}</span>
            <span>₹{products[14].price}</span>
          </div>
        </Link>
        <Link to="/product/at-14" className="home-mosaic__item">
          <img
            src={asset('/images/products/anti-tarnish/at-14.png')}
            alt={products[13].name}
            loading="lazy"
          />
          <div className="home-mosaic__overlay">
            <span>{products[13].name}</span>
            <span>₹{products[13].price}</span>
          </div>
        </Link>
        <Link to="/product/at-07" className="home-mosaic__item">
          <img
            src={asset('/images/products/anti-tarnish/at-07.png')}
            alt={products[6].name}
            loading="lazy"
          />
          <div className="home-mosaic__overlay">
            <span>{products[6].name}</span>
            <span>₹{products[6].price}</span>
          </div>
        </Link>
      </RevealSection>

      {/* ═══ Browse All CTA ═══ */}
      <RevealSection className="home-browse-cta">
        <h2>Explore the Full Collection</h2>
        <p>28 exquisite designs crafted for every occasion</p>
        <Link to="/shop" className="btn btn-primary btn-lg">
          Shop All Earrings →
        </Link>
      </RevealSection>
    </>
  );
}

/* ─── Home (default export) ─────────────────────────────────────
 * Top-level wrapper. Mounts the single shared `<ParallaxProvider>`
 * that owns the lone passive scroll listener and the lone
 * IntersectionObserver for every parallax/reveal module on the
 * homepage (design § Architecture, R10.2 / R10.3).
 * ──────────────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <ParallaxProvider>
      <HomeContent />
    </ParallaxProvider>
  );
}
