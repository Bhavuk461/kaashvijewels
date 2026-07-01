import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAllProducts } from '../hooks/useAllProducts';
import ProductCard from '../components/ProductCard';
import { getEffectiveCategory } from '../utils/category';

export default function Shop() {
  const [searchParams] = useSearchParams();
  const products = useAllProducts();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');

  // Read category from URL query string on mount and when params change
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam && ['anti-tarnish', 'korean', 'kashmiri', 'bracelet', 'tulip-bracelet'].includes(categoryParam)) {
      setSelectedCategory(categoryParam);
    }
  }, [searchParams]);

  // ── Filter products by category ──
  const filteredProducts = products.filter((product) => {
    if (selectedCategory === 'all') return true;
    return getEffectiveCategory(product) === selectedCategory;
  });

  // ── Sort filtered products ──
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'newest':
        return -1; // reverse original order (newest added last in array → show first)
      case 'featured':
      default:
        return 0; // maintain original order
    }
  });

  // If "newest", reverse the stable-sorted array for proper newest-first order
  const displayProducts =
    sortBy === 'newest' ? [...filteredProducts].reverse() : sortedProducts;

  return (
    <>
      {/* ── Shop Header ── */}
      <div className="shop-header">
        <div className="container">
          <span className="section-subtitle">✨ Our Collection</span>
          <h1>Shop All Jewellery</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-sm)' }}>
            {displayProducts.length} {displayProducts.length === 1 ? 'product' : 'products'} available
          </p>
        </div>
      </div>

      {/* ── Shop Body ── */}
      <div className="container">
        <div className="shop-layout">
          {/* ── Sidebar Filters ── */}
          <aside className="shop-filters">
            {/* Category Filter */}
            <div className="filter-group">
              <h4 className="filter-group__title">Category</h4>
              <label
                className={`filter-group__option ${selectedCategory === 'all' ? 'filter-group__option--active' : ''}`}
              >
                <input
                  type="radio"
                  name="category"
                  value="all"
                  checked={selectedCategory === 'all'}
                  onChange={() => setSelectedCategory('all')}
                />
                All
              </label>
              <label
                className={`filter-group__option ${selectedCategory === 'anti-tarnish' ? 'filter-group__option--active' : ''}`}
              >
                <input
                  type="radio"
                  name="category"
                  value="anti-tarnish"
                  checked={selectedCategory === 'anti-tarnish'}
                  onChange={() => setSelectedCategory('anti-tarnish')}
                />
                Anti-Tarnish Earrings
              </label>
              <label
                className={`filter-group__option ${selectedCategory === 'korean' ? 'filter-group__option--active' : ''}`}
              >
                <input
                  type="radio"
                  name="category"
                  value="korean"
                  checked={selectedCategory === 'korean'}
                  onChange={() => setSelectedCategory('korean')}
                />
                Korean Earrings
              </label>
              <label
                className={`filter-group__option ${selectedCategory === 'kashmiri' ? 'filter-group__option--active' : ''}`}
              >
                <input
                  type="radio"
                  name="category"
                  value="kashmiri"
                  checked={selectedCategory === 'kashmiri'}
                  onChange={() => setSelectedCategory('kashmiri')}
                />
                Kashmiri Earrings
              </label>
              <label
                className={`filter-group__option ${selectedCategory === 'bracelet' ? 'filter-group__option--active' : ''}`}
              >
                <input
                  type="radio"
                  name="category"
                  value="bracelet"
                  checked={selectedCategory === 'bracelet'}
                  onChange={() => setSelectedCategory('bracelet')}
                />
                Anti Tarnish Bracelet
              </label>
              <label
                className={`filter-group__option ${selectedCategory === 'tulip-bracelet' ? 'filter-group__option--active' : ''}`}
              >
                <input
                  type="radio"
                  name="category"
                  value="tulip-bracelet"
                  checked={selectedCategory === 'tulip-bracelet'}
                  onChange={() => setSelectedCategory('tulip-bracelet')}
                />
                Tulip Bracelets
              </label>
            </div>

            {/* Sort By Filter */}
            <div className="filter-group">
              <h4 className="filter-group__title">Sort By</h4>
              <label
                className={`filter-group__option ${sortBy === 'featured' ? 'filter-group__option--active' : ''}`}
              >
                <input
                  type="radio"
                  name="sortBy"
                  value="featured"
                  checked={sortBy === 'featured'}
                  onChange={() => setSortBy('featured')}
                />
                Featured
              </label>
              <label
                className={`filter-group__option ${sortBy === 'price-low' ? 'filter-group__option--active' : ''}`}
              >
                <input
                  type="radio"
                  name="sortBy"
                  value="price-low"
                  checked={sortBy === 'price-low'}
                  onChange={() => setSortBy('price-low')}
                />
                Price: Low to High
              </label>
              <label
                className={`filter-group__option ${sortBy === 'price-high' ? 'filter-group__option--active' : ''}`}
              >
                <input
                  type="radio"
                  name="sortBy"
                  value="price-high"
                  checked={sortBy === 'price-high'}
                  onChange={() => setSortBy('price-high')}
                />
                Price: High to Low
              </label>
              <label
                className={`filter-group__option ${sortBy === 'newest' ? 'filter-group__option--active' : ''}`}
              >
                <input
                  type="radio"
                  name="sortBy"
                  value="newest"
                  checked={sortBy === 'newest'}
                  onChange={() => setSortBy('newest')}
                />
                Newest First
              </label>
            </div>
          </aside>

          {/* ── Product Grid ── */}
          <div>
            {displayProducts.length > 0 ? (
              <div className="product-grid">
                {displayProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="cart-empty">
                <div className="cart-empty__icon">💎</div>
                <h3 className="cart-empty__title">No products found</h3>
                <p className="cart-empty__text">
                  Try adjusting your filters to discover our beautiful collection.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSortBy('featured');
                  }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
