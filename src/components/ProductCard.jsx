import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import ProductImage from './ProductImage';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();

  const categoryLabel = product.category === 'anti-tarnish' ? 'Anti-Tarnish' : 'Korean';

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="product-card"
      id={`product-card-${product.id}`}
    >
      <div className="product-card__image-wrapper">
        <ProductImage
          src={product.image}
          alt={product.name}
          size="sm"
          className="product-card__image"
        />
        {product.badge && (
          <span className={`product-card__badge product-card__badge--${product.badge.toLowerCase()}`}>
            {product.badge}
          </span>
        )}
        <button
          className="product-card__quick-add btn btn-primary btn-sm"
          onClick={handleQuickAdd}
          id={`quick-add-${product.id}`}
        >
          🛒 Add to Cart
        </button>
      </div>
      <div className="product-card__info">
        <p className="product-card__category">{categoryLabel}</p>
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__price">
          ₹{product.price}
          <span>MRP incl. taxes</span>
        </p>
      </div>
    </Link>
  );
}
