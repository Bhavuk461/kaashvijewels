import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { products } from '../data/products';
import { useProductOverrides } from '../context/ProductOverridesContext';
import './Admin.css';

const WORKER_URL = 'https://kaashvi-admin-api.greatgatch1.workers.dev';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { overrides, loading, getProductPrice, isOutOfStock, refreshOverrides } =
    useProductOverrides();

  const [search, setSearch] = useState('');
  const [prices, setPrices] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [toasts, setToasts] = useState([]);

  // ── Auth guard ──────────────────────────────────────────────
  useEffect(() => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login', { replace: true });
    }
  }, [navigate]);

  // ── Initialize local price inputs when overrides load ──────
  useEffect(() => {
    const initial = {};
    products.forEach((p) => {
      const override = overrides[p.id];
      initial[p.id] = override?.price != null ? override.price : p.price;
    });
    setPrices(initial);
  }, [overrides]);

  // ── Toast helper ───────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3000);
  }, []);

  // ── Save price ─────────────────────────────────────────────
  const handleSavePrice = async (productId) => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) return navigate('/admin/login', { replace: true });

    const newPrice = parseFloat(prices[productId]);
    if (isNaN(newPrice) || newPrice < 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }

    setSavingId(productId);
    try {
      const res = await fetch(`${WORKER_URL}/api/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, price: newPrice }),
      });

      if (res.ok) {
        showToast(`Price updated for ${productId}`);
        await refreshOverrides();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to update price', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  // ── Toggle stock ───────────────────────────────────────────
  const handleToggleStock = async (productId) => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) return navigate('/admin/login', { replace: true });

    const currentlyOut = isOutOfStock(productId);

    setSavingId(productId);
    try {
      const res = await fetch(`${WORKER_URL}/api/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, outOfStock: !currentlyOut }),
      });

      if (res.ok) {
        showToast(
          `${productId} marked as ${!currentlyOut ? 'out of stock' : 'in stock'}`
        );
        await refreshOverrides();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to update stock', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  // ── Logout ─────────────────────────────────────────────────
  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    navigate('/admin/login', { replace: true });
  };

  // ── Filter products ────────────────────────────────────────
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  // ── Stats ──────────────────────────────────────────────────
  const outOfStockCount = products.filter((p) => isOutOfStock(p.id)).length;
  const overriddenCount = Object.keys(overrides).filter(
    (id) => overrides[id]?.price != null
  ).length;

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <div className="admin-spinner" />
          <span className="admin-loading-text">Loading dashboard…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* ── Header ── */}
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>Admin Dashboard</h1>
          <p>Manage products, pricing & inventory</p>
        </div>
        <button className="admin-btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </header>

      {/* ── Content ── */}
      <div className="admin-content">
        {/* Stats */}
        <div className="admin-stats-bar">
          <div className="admin-stat-card">
            <div className="admin-stat-label">Total Products</div>
            <div className="admin-stat-value">{products.length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Price Overrides</div>
            <div className="admin-stat-value">{overriddenCount}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Out of Stock</div>
            <div className="admin-stat-value">{outOfStockCount}</div>
          </div>
        </div>

        {/* Product table */}
        <div className="admin-table-wrapper">
          <div className="admin-table-header">
            <h2>All Products ({filtered.length})</h2>
            <input
              className="admin-search-input"
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price (₹)</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const oos = isOutOfStock(product.id);
                const isSaving = savingId === product.id;

                return (
                  <tr key={product.id}>
                    {/* Product info */}
                    <td data-label="Product">
                      <div className="admin-product-cell">
                        <img
                          className="admin-product-thumb"
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                        />
                        <div>
                          <div className="admin-product-name">
                            {product.name}
                          </div>
                          <div className="admin-product-id">{product.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td data-label="Category">
                      <span className="admin-category-badge">
                        {product.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td data-label="Price">
                      <div className="admin-price-cell">
                        <div className="admin-price-input-wrapper">
                          <span className="admin-price-symbol">₹</span>
                          <input
                            className="admin-price-input"
                            type="number"
                            min="0"
                            value={prices[product.id] ?? ''}
                            onChange={(e) =>
                              setPrices((prev) => ({
                                ...prev,
                                [product.id]: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <button
                          className="admin-btn-save"
                          disabled={isSaving}
                          onClick={() => handleSavePrice(product.id)}
                        >
                          {isSaving ? '…' : 'Save'}
                        </button>
                      </div>
                    </td>

                    {/* Stock toggle */}
                    <td data-label="Stock">
                      <button
                        className={`admin-stock-toggle ${
                          oos ? 'admin-out-of-stock' : 'admin-in-stock'
                        }`}
                        disabled={isSaving}
                        onClick={() => handleToggleStock(product.id)}
                      >
                        <span className="admin-stock-dot" />
                        {oos ? 'Out of Stock' : 'In Stock'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Toasts ── */}
      <div className="admin-toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`admin-toast admin-toast-${t.type}${
              t.exiting ? ' admin-toast-exit' : ''
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
