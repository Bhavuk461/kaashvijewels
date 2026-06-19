import { Link } from 'react-router-dom';
import useParallax from '../hooks/useParallax';
import useReveal from '../hooks/useReveal';
import ProductImage from '../components/ProductImage';
import { selectHeroProducts } from './heroProductSelection';

/* ──────────────────────────────────────────────────────────────────
 * Module sub-components
 *
 * Each module follows the same composition pattern recommended by the
 * design:
 *
 *   <div className="reveal[is-visible]" ref={revealRef}>
 *     <Card className="…" ref={parallaxRef}>
 *       <div className="editorial-card__media" ref={pointerRef} style={pointerStyle}>
 *         <img … />
 *       </div>
 *       …caption / overlay…
 *     </Card>
 *   </div>
 *
 * — reveal ref on the OUTER `.reveal` wrapper (so the engine can fade it
 *   in once),
 * — parallax ref on the card element (so the engine drifts the whole
 *   card with `style.transform = translate3d(0, …, 0)`),
 * — pointer ref/style on the inner `.editorial-card__media` (so the
 *   image inside the arched/oval frame translates by a few pixels
 *   under the cursor without moving the card itself).
 *
 * The avatar and dome modules omit the pointer tracker per the design
 * spec; everything else uses all three hooks.
 * ────────────────────────────────────────────────────────────────── */

function revealClass(isVisible) {
  return isVisible ? 'reveal is-visible' : 'reveal';
}

/**
 * Circular avatar at the top of the left column.
 * Speed factor: -0.15. No pointer tracker.
 */
function AvatarCard({ product }) {
  const { ref: revealRef, isVisible } = useReveal();
  const { ref: parallaxRef } = useParallax(-0.15);

  if (!product) return null;

  return (
    <div className={revealClass(isVisible)} ref={revealRef}>
      <Link
        to={`/product/${product.id}`}
        className="avatar-card"
        ref={parallaxRef}
        aria-label={product.name}
      >
        <div className="editorial-card__media">
          <ProductImage
            src={product.image}
            alt={product.name}
            size="sm"
            className="editorial-card__image"
          />
        </div>
      </Link>
    </div>
  );
}

/**
 * Decorative editorial date stamp under the avatar.
 * Static markup — no parallax, no reveal, no pointer.
 */
function DateStamp() {
  return (
    <div className="date-stamp">
      <span className="date-stamp__num">12.01</span>
      <span className="date-stamp__divider" aria-hidden="true"></span>
      <span className="date-stamp__name">KAASHVI · ISSUE 01</span>
    </div>
  );
}

/**
 * Shared oval product card. Used on both the left and right columns.
 * Speed factor is supplied by the caller; pointer tracker is always on.
 */
function OvalProductCard({ product, speed, caption }) {
  const { ref: revealRef, isVisible } = useReveal();
  const { ref: parallaxRef } = useParallax(speed);

  if (!product) return null;

  return (
    <div className={revealClass(isVisible)} ref={revealRef}>
      <Link
        to={`/product/${product.id}`}
        className="oval-card"
        ref={parallaxRef}
      >
        <div className="editorial-card__media">
          <ProductImage
            src={product.image}
            alt={product.name}
            size="sm"
            className="editorial-card__image"
          />
        </div>
        <div className="editorial-card__caption">
          <h3 className="editorial-card__name">{product.name}</h3>
        </div>
      </Link>
      {caption ? <p className="editorial-caption">{caption}</p> : null}
    </div>
  );
}

/**
 * Headline dome — the editorial centerpiece of the center column.
 * Speed factor: -0.05. No pointer tracker, no link.
 */
function ArchedDomePanel() {
  const { ref: revealRef, isVisible } = useReveal();
  const { ref: parallaxRef } = useParallax(-0.05);

  return (
    <div className={revealClass(isVisible)} ref={revealRef}>
      <div className="dome" ref={parallaxRef}>
        <span className="dome__tagline">PRECIOUS · SS25</span>
        <h1 className="dome__headline">
          Jewelry <em className="font-accent">Reimagined</em>
        </h1>
        <span className="dome__divider" aria-hidden="true"></span>
      </div>
    </div>
  );
}

/**
 * Tall arched portrait panel — the flagship hero product.
 * Speed factor: +0.10. Pointer tracker on. The first hero image
 * (centerHero) is the only one rendered with eager loading so the
 * largest contentful paint is not delayed by `loading="lazy"`.
 */
function ArchedPortraitPanel({ product }) {
  const { ref: revealRef, isVisible } = useReveal();
  const { ref: parallaxRef } = useParallax(0.06);

  if (!product) return null;

  return (
    <div className={revealClass(isVisible)} ref={revealRef}>
      <Link
        to={`/product/${product.id}`}
        className="portrait-panel"
        ref={parallaxRef}
      >
        <span className="editorial-card__tag">Featured Edit</span>
        <div className="editorial-card__media">
          <ProductImage
            src={product.image}
            alt={product.name}
            priority
            className="editorial-card__image"
          />
        </div>
        <div className="editorial-card__caption">
          <h3 className="editorial-card__name">
            Trace your favourite Kaashvi pieces from conception to completion.
          </h3>
        </div>
      </Link>
    </div>
  );
}

/**
 * Small decorative diamond used on the right-column branded card.
 * Inline SVG with `aria-hidden="true"` (Property 23 / R12.3).
 */
function DecorativeDiamond() {
  return (
    <svg
      className="branded-card__diamond"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 2 L22 9 L12 22 L2 9 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M2 9 L22 9"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Arched branded card at the top of the right column.
 * Speed factor: -0.20. Pointer tracker on. Carries the BESTSELLER label.
 */
function ArchedBrandedCard({ product }) {
  const { ref: revealRef, isVisible } = useReveal();
  const { ref: parallaxRef } = useParallax(-0.2);

  if (!product) return null;

  return (
    <div className={revealClass(isVisible)} ref={revealRef}>
      <Link
        to={`/product/${product.id}`}
        className="branded-card"
        ref={parallaxRef}
      >
        <div className="editorial-card__media">
          <ProductImage
            src={product.image}
            alt={product.name}
            size="sm"
            className="editorial-card__image"
          />
        </div>
        <div className="editorial-card__caption">
          <span className="editorial-label">
            <DecorativeDiamond />
            BESTSELLER
          </span>
          <h3 className="editorial-card__name">{product.name}</h3>
        </div>
      </Link>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
 * HeroEditorialSection
 *
 * Three-column editorial composition. Selection of the five hero
 * products is delegated to `selectHeroProducts` so this component is
 * a pure layout shell — it never touches `products.js` directly.
 *
 * If a slot resolves to `null` (e.g. an entire category has no
 * products) the corresponding module is skipped gracefully.
 * ────────────────────────────────────────────────────────────────── */
export default function HeroEditorialSection({ products }) {
  const { leftAvatar, leftOval, centerHero, rightCard, rightOval } =
    selectHeroProducts(products);

  return (
    <section className="hero-editorial">
      <div className="hero-editorial__column hero-editorial__column--left">
        <AvatarCard product={leftAvatar} />
        <DateStamp />
        <OvalProductCard product={leftOval} speed={0.12} />
      </div>

      <div className="hero-editorial__column hero-editorial__column--center">
        <ArchedDomePanel />
        <ArchedPortraitPanel product={centerHero} />
      </div>

      <div className="hero-editorial__column hero-editorial__column--right">
        <ArchedBrandedCard product={rightCard} />
        <OvalProductCard
          product={rightOval}
          speed={0.16}
          caption="Time to make somebody happy."
        />
      </div>
    </section>
  );
}
