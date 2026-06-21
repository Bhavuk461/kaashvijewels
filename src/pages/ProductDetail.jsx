import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useProductOverrides } from '../context/ProductOverridesContext';
import { useAllProducts } from '../hooks/useAllProducts';
import ProductCard from '../components/ProductCard';
import ProductImage from '../components/ProductImage';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const products = useAllProducts();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { getProductPrice, isOutOfStock } = useProductOverrides();

  // Find product by id
  const product = products.find((p) => p.id === id);

  // ── 404 state ──
  if (!product) {
    return (
      <div className="product-detail">
        <div className="container">
          <div className="cart-empty" style={{ paddingTop: 'var(--space-4xl)' }}>
            <div className="cart-empty__icon">😕</div>
            <h2 className="cart-empty__title">Product Not Found</h2>
            <p className="cart-empty__text">
              Sorry, the product you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/shop" className="btn btn-primary">
              ← Back to Shop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const categoryLabel =
    product.category === 'anti-tarnish'
      ? 'Anti-Tarnish'
      : product.category === 'bracelet'
        ? 'Bracelet'
        : 'Korean';

  // Build the list of images for the gallery
  const allImages = product.images && product.images.length > 0
    ? product.images
    : [product.image];

  // ── Quantity handlers ──
  const decreaseQuantity = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const increaseQuantity = () => {
    setQuantity((prev) => (prev < 10 ? prev + 1 : 10));
  };

  const displayPrice = getProductPrice(product);
  const outOfStock = isOutOfStock(product.id);

  // ── Add to cart ──
  const handleAddToCart = () => {
    if (outOfStock) return;
    addToCart({ ...product, price: displayPrice }, quantity);
  };

  // ── Buy now → add to cart + navigate to checkout ──
  const handleBuyNow = () => {
    if (outOfStock) return;
    addToCart({ ...product, price: displayPrice }, quantity);
    navigate('/checkout');
  };

  // ── Related products: same category, exclude current, limit to 4 ──
  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="product-detail">
      <div className="container">
        {/* ── Breadcrumb ── */}
        <nav className="breadcrumb">
          <Link to="/">Home</Link>
          <span>›</span>
          <Link to="/shop">Shop</Link>
          <span>›</span>
          <span>{product.name}</span>
        </nav>

        {/* ── Product Grid ── */}
        <div className="product-detail__grid">
          {/* Left: Image Gallery */}
          <div className="product-detail__image-wrapper">
            <ProductImage
              src={allImages[selectedImage]}
              alt={product.name}
              priority
              className="product-detail__image"
            />
            {allImages.length > 1 && (
              <div className="product-detail__thumbnails">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    className={`product-detail__thumb${idx === selectedImage ? ' product-detail__thumb--active' : ''}`}
                    onClick={() => setSelectedImage(idx)}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <ProductImage src={img} alt={`${product.name} view ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div className="product-detail__info">
            <p className="product-detail__category">{categoryLabel} Collection</p>
            <h1 className="product-detail__name">{product.name}</h1>
            <p className="product-detail__price">
              {outOfStock ? (
                <span style={{ color: '#c0392b', fontWeight: 700 }}>Out of Stock</span>
              ) : (
                <>₹{displayPrice}</>
              )}
            </p>
            <p className="product-detail__description">{product.description}</p>

            {/* Meta Info */}
            <div className="product-detail__meta">
              <div className="product-detail__meta-item">
                <strong>Material</strong>
                <span>{product.material}</span>
              </div>
              <div className="product-detail__meta-item">
                <strong>Weight</strong>
                <span>{product.weight}</span>
              </div>
              <div className="product-detail__meta-item">
                <strong>Type</strong>
                <span>{product.type}</span>
              </div>
            </div>

            {/* Quantity Selector */}
            {!outOfStock && (
              <div className="product-detail__quantity">
                <span className="product-detail__quantity-label">Quantity:</span>
                <div className="quantity-controls">
                  <button onClick={decreaseQuantity} aria-label="Decrease quantity">
                    −
                  </button>
                  <span>{quantity}</span>
                  <button onClick={increaseQuantity} aria-label="Increase quantity">
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="product-detail__actions">
              {outOfStock ? (
                <button className="btn btn-lg" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                  🚫 Out of Stock
                </button>
              ) : (
                <>
                  <button className="btn btn-primary btn-lg" onClick={handleAddToCart}>
                    🛒 Add to Cart
                  </button>
                  <button className="btn btn-gold btn-lg" onClick={handleBuyNow}>
                    ⚡ Buy Now
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Related Products ── */}
        {relatedProducts.length > 0 && (
          <section className="section">
            <div className="section-header">
              <span className="section-subtitle">✨ More to Love</span>
              <h2>You May Also Like</h2>
              <div className="divider"></div>
            </div>
            <div className="product-grid">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
