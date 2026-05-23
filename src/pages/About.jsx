import { asset } from '../utils/assetPath';

export default function About() {
  const values = [
    {
      icon: '💎',
      title: 'Premium Quality',
      text: 'Each piece undergoes rigorous quality checks to ensure you receive nothing but the best. We source only from trusted manufacturers.',
    },
    {
      icon: '✨',
      title: 'Anti-Tarnish',
      text: 'Our gold collection features anti-tarnish coating for lasting shine. Wear confidently, day after day, without worrying about discolouration.',
    },
    {
      icon: '🎨',
      title: 'Unique Designs',
      text: 'Curated designs inspired by global fashion trends — from Korean minimalism to bold botanical motifs that make a statement.',
    },
    {
      icon: '💰',
      title: 'Affordable Luxury',
      text: 'Premium look without the premium price tag. We believe every woman deserves to sparkle without breaking the bank.',
    },
    {
      icon: '📦',
      title: 'Secure Packaging',
      text: 'Every order is beautifully packaged with care — perfect for gifting or treating yourself to a little luxury.',
    },
    {
      icon: '❤️',
      title: 'Customer First',
      text: 'Your satisfaction is our top priority. From easy returns to responsive support, we\'re here to make your experience delightful.',
    },
  ];

  return (
    <>
      {/* ═══ Page Header ═══ */}
      <section className="page-header">
        <div className="container">
          <h1>Our Story</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-sm)', fontSize: '1.1rem', maxWidth: '600px', margin: 'var(--space-sm) auto 0' }}>
            The Kaashvi Jewels — Where Elegance Meets Affordability
          </p>
          <div className="divider" />
        </div>
      </section>

      {/* ═══ About Content ═══ */}
      <div className="about-content">
        <div className="container">

          {/* Story Section */}
          <div className="about-grid">
            <div className="about-image">
              <img
                src={asset('/images/products/anti-tarnish/at-05.png')}
                alt="The Kaashvi Jewels — Our Story"
              />
            </div>
            <div className="about-text">
              <h3>The Beginning</h3>
              <p>
                Kaashvi Jewels was born from a passion to make beautiful jewelry accessible
                to every woman. Founded with the belief that elegance shouldn&apos;t come with
                an exorbitant price tag, we set out to create a brand that celebrates
                femininity, craftsmanship, and self-expression.
              </p>
              <p>
                Our journey started with a simple observation — women love jewelry that
                makes them feel confident and beautiful, but premium-looking pieces often
                come at premium prices. We asked ourselves: what if we could change that?
              </p>
              <p>
                Today, Kaashvi Jewels is a trusted name for thousands of women across India
                who want to adorn themselves with stunning pieces without compromise.
                From our Anti-Tarnish Gold collection to our delicate Korean styles,
                every piece tells a story of passion and purpose.
              </p>
            </div>
          </div>

          {/* Craftsmanship Section (Reversed) */}
          <div className="about-grid about-grid--reverse">
            <div className="about-image">
              <img
                src={asset('/images/products/korean/kr-06.png')}
                alt="Craftsmanship at The Kaashvi Jewels"
              />
            </div>
            <div className="about-text">
              <h3>Our Craftsmanship</h3>
              <p>
                Every piece in our collection is carefully selected and curated to ensure
                premium quality, unique designs, and lasting beauty. We work closely with
                skilled artisans who share our vision of accessible luxury.
              </p>
              <p>
                Our Anti-Tarnish collection features a special protective coating that
                preserves the golden lustre, keeping your earrings looking brand-new for
                months. Our Korean collection showcases the finest crystals, pearls, and
                opalescent stones set in delicate, trend-forward designs.
              </p>
              <p>
                From concept to delivery, every step of our process is guided by one
                principle: you deserve jewelry that looks as extraordinary as you feel.
              </p>
            </div>
          </div>

          {/* Values Grid */}
          <div className="section-header" style={{ marginTop: 'var(--space-xl)' }}>
            <span className="section-subtitle">What We Stand For</span>
            <h2>Our Values</h2>
            <div className="divider" />
          </div>

          <div className="values-grid">
            {values.map((value, index) => (
              <div className="value-card" key={index}>
                <div className="value-card__icon">{value.icon}</div>
                <h4 className="value-card__title">{value.title}</h4>
                <p className="value-card__text">{value.text}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
