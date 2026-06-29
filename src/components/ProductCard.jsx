import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useProductOverrides } from '../context/ProductOverridesContext';
import ProductImage from './ProductImage';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { getProductPrice, isOutOfStock, getProductImages } = useProductOverrides();
  const productImages = getProductImages(product);

  const categoryLabel =
    product.category === 'anti-tarnish'
      ? 'Anti-Tarnish'
      : product.category === 'bracelet'
        ? 'Bracelet'
        : 'Korean';

  const displayPrice = getProductPrice(product);
  const outOfStock = isOutOfStock(product.id);

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addToCart({ ...product, price: displayPrice }, 1);
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className={`product-card${outOfStock ? ' product-card--out-of-stock' : ''}`}
      id={`product-card-${product.id}`}
    >
      <div className="product-card__image-wrapper">
        <ProductImage
          src={productImages[0] || product.image}
          alt={product.name}
          size="sm"
          className="product-card__image"
        />
        {outOfStock && (
          <span className="product-card__badge product-card__badge--out-of-stock">
            Out of Stock
          </span>
        )}
        {!outOfStock && product.badge && (
          <span className={`product-card__badge product-card__badge--${product.badge.toLowerCase()}`}>
            {product.badge}
          </span>
        )}
        {!outOfStock && (
          <button
            className="product-card__quick-add btn btn-primary btn-sm"
            onClick={handleQuickAdd}
            id={`quick-add-${product.id}`}
          >
            🛒 Add to Cart
          </button>
        )}
      </div>
      <div className="product-card__info">
        <p className="product-card__category">{categoryLabel}</p>
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__price">
          {outOfStock ? (
            <span className="product-card__sold-out">Sold Out</span>
          ) : (
            <>
              <span className="product-card__price-original">₹{Math.round(displayPrice * 1.3)}</span>
              <span className="product-card__price-current">₹{displayPrice}</span>
              <span>MRP incl. taxes</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}
