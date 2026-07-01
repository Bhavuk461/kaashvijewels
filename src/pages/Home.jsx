import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { products } from '../data/products';
import ProductCard from '../components/ProductCard';
import ProductImage from '../components/ProductImage';
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
  const bracelets = products.filter((p) => p.category === 'bracelet');
  const bestsellers = products.filter((p) => p.badge === 'Bestseller');
  const newArrivals = products.filter((p) => p.badge === 'New');

  // Pick a featured pair for the wide banner — prefer a Bestseller anti-tarnish
  // with a complementary second piece. Falls back gracefully if either is missing.
  const wideBannerLeft =
    antiTarnish.find((p) => p.badge === 'Bestseller') || antiTarnish[0] || null;
  const wideBannerRight =
    antiTarnish
      .filter((p) => p !== wideBannerLeft)
      .find((p) => p.badge === 'Bestseller') ||
    antiTarnish.find((p) => p !== wideBannerLeft) ||
    null;
  const wideBanner = { left: wideBannerLeft, right: wideBannerRight };

  // Six-card mosaic — alternates anti-tarnish picks for visual variety,
  // skipping any indexes that do not exist in the catalogue.
  const mosaicProducts = [
    antiTarnish[0],
    antiTarnish[2],
    antiTarnish[5],
    antiTarnish[7],
    antiTarnish[9],
    antiTarnish[11],
  ].filter(Boolean);

  return (
    <>
      {/* ═══ Marquee Trust Banner — right below navbar ═══ */}
      <div className="home-marquee">
        <div className="home-marquee__track">
          {[...Array(3)].map((_, i) => (
            <span key={i} className="home-marquee__content">
              <span>💧 100% WATERPROOF</span>
              <span className="home-marquee__dot">·</span>
              <span>🌟 WEAR IT ANYTIME, ANYWHERE</span>
              <span className="home-marquee__dot">·</span>
              <span>✨ ANTI-TARNISH GUARANTEED</span>
              <span className="home-marquee__dot">·</span>
              <span>🔒 SECURE PAYMENTS</span>
              <span className="home-marquee__dot">·</span>
              <span>📦 FREE SHIPPING ON ALL ORDERS</span>
              <span className="home-marquee__dot">·</span>
              <span>↩️ 10-DAY EASY RETURNS</span>
              <span className="home-marquee__dot">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ═══ Editorial Hero ═══ */}
      <HeroEditorialSection products={products} />

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
      {wideBanner.left && wideBanner.right && (
        <RevealSection className="home-wide-banner">
          <div className="home-wide-banner__grid">
            <div className="home-wide-banner__imgwrap">
              <ProductImage
                src={wideBanner.left.image}
                alt={wideBanner.left.name}
              />
            </div>
            <div className="home-wide-banner__content">
              <span className="home-wide-banner__tag">Featured</span>
              <h2>{wideBanner.left.name}</h2>
              <p>
                Our most-loved design — sculpted with detailed texture and a
                lustrous gold-plated finish that resists tarnishing.
              </p>
              <Link
                to={`/product/${wideBanner.left.id}`}
                className="btn btn-primary btn-lg"
              >
                Shop This Look →
              </Link>
            </div>
            <div className="home-wide-banner__imgwrap">
              <ProductImage
                src={wideBanner.right.image}
                alt={wideBanner.right.name}
              />
            </div>
          </div>
        </RevealSection>
      )}

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

      {/* ═══ Bracelet Collection Full Grid ═══ */}
      <RevealSection className="home-collection">
        <div className="container">
          <div className="home-strip__header">
            <div>
              <h2>Bracelet Collection</h2>
              <p className="home-collection__sub">
                Stunning gold bangles & chain bracelets with clovers, butterflies & crystals
              </p>
            </div>
            <Link to="/shop?category=bracelet" className="home-strip__viewall">
              View All →
            </Link>
          </div>
          <div className="product-grid">
            {bracelets.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ═══ Product Mosaic ═══ */}
      {mosaicProducts.length >= 6 && (
        <RevealSection className="home-mosaic">
          {mosaicProducts.map((p, idx) => (
            <Link
              key={p.id}
              to={`/product/${p.id}`}
              className={`home-mosaic__item${
                idx === 0 || idx === 3 ? ' home-mosaic__item--tall' : ''
              }`}
            >
              <ProductImage src={p.image} alt={p.name} size="sm" />
              <div className="home-mosaic__overlay">
                <span>{p.name}</span>
              </div>
            </Link>
          ))}
        </RevealSection>
      )}

      {/* ═══ Browse All CTA ═══ */}
      <RevealSection className="home-browse-cta">
        <h2>Explore the Full Collection</h2>
        <p>{products.length} exquisite designs crafted for every occasion</p>
        <Link to="/shop" className="btn btn-primary btn-lg">
          Shop All Jewellery →
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
