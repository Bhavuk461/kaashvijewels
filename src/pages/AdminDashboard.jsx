import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductOverrides } from '../context/ProductOverridesContext';
import { useAllProducts } from '../hooks/useAllProducts';
import ProductImage from '../components/ProductImage';
import './Admin.css';

const WORKER_URL = 'https://kaashvi-admin-api.greatgatch1.workers.dev';

const CATEGORY_OPTIONS = [
  { value: 'anti-tarnish', label: 'Anti-Tarnish' },
  { value: 'bracelet', label: 'Bracelet' },
  { value: 'korean', label: 'Korean' },
];
const BADGE_OPTIONS = ['', 'Bestseller', 'New'];

const EMPTY_FORM = {
  name: '',
  category: 'anti-tarnish',
  type: '',
  price: '',
  material: '',
  weight: '',
  badge: '',
  description: '',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { overrides, loading, isOutOfStock, getProductImages, refreshOverrides } =
    useProductOverrides();
  const products = useAllProducts();

  const [search, setSearch] = useState('');
  const [prices, setPrices] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [toasts, setToasts] = useState([]);

  // ── Product modal state ──
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [images, setImages] = useState([]); // [{ url, uploading, error }]
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const dragIndex = useRef(null);

  // ── Image Manager modal state (for changing images on any product) ──
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalProduct, setImageModalProduct] = useState(null);
  const [imgImages, setImgImages] = useState([]);
  const [imgDragOver, setImgDragOver] = useState(false);
  const [imgSubmitting, setImgSubmitting] = useState(false);
  const [imgError, setImgError] = useState('');
  const imgFileInputRef = useRef(null);
  const imgDragIndex = useRef(null);

  // ── Auth guard ──
  useEffect(() => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) navigate('/admin/login', { replace: true });
  }, [navigate]);

  // ── Initialize local price inputs when overrides/products load ──
  useEffect(() => {
    const initial = {};
    products.forEach((p) => {
      const override = overrides[p.id];
      initial[p.id] = override?.price != null ? override.price : p.price;
    });
    setPrices(initial);
  }, [overrides, products]);

  // ── Toast helper ──
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
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

  const getToken = () => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) navigate('/admin/login', { replace: true });
    return token;
  };

  // ── Save price ──
  const handleSavePrice = async (productId) => {
    const token = getToken();
    if (!token) return;

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

  // ── Toggle stock ──
  const handleToggleStock = async (productId) => {
    const token = getToken();
    if (!token) return;

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

  // ── Logout ──
  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    navigate('/admin/login', { replace: true });
  };

  // ── Modal open/close ──
  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImages([]);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || '',
      category: product.category || 'anti-tarnish',
      type: product.type || '',
      price: product.price != null ? String(product.price) : '',
      material: product.material || '',
      weight: product.weight || '',
      badge: product.badge || '',
      description: product.description || '',
    });
    const imgs = product.images && product.images.length > 0
      ? product.images
      : product.image
        ? [product.image]
        : [];
    setImages(imgs.map((url) => ({ url, uploading: false })));
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  // ── Image upload ──
  const uploadFile = async (file) => {
    const token = getToken();
    if (!token) return;

    const placeholder = {
      url: '',
      uploading: true,
      error: '',
      localName: file.name,
      tempId: Date.now() + Math.random(),
    };
    setImages((prev) => [...prev, placeholder]);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${WORKER_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setImages((prev) =>
          prev.map((img) =>
            img.tempId === placeholder.tempId
              ? { url: data.url, uploading: false }
              : img
          )
        );
      } else {
        setImages((prev) =>
          prev.map((img) =>
            img.tempId === placeholder.tempId
              ? { ...img, uploading: false, error: data.error || 'Upload failed' }
              : img
          )
        );
        showToast(data.error || 'Image upload failed', 'error');
      }
    } catch {
      setImages((prev) =>
        prev.map((img) =>
          img.tempId === placeholder.tempId
            ? { ...img, uploading: false, error: 'Network error' }
            : img
        )
      );
      showToast('Network error during upload', 'error');
    }
  };

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    files.forEach((file) => {
      if (!/^image\//.test(file.type)) {
        showToast(`${file.name} is not an image`, 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast(`${file.name} is larger than 5 MB`, 'error');
        return;
      }
      uploadFile(file);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Thumbnail reordering (drag to reorder) ──
  const handleThumbDragStart = (index) => {
    dragIndex.current = index;
  };
  const handleThumbDrop = (index) => {
    const from = dragIndex.current;
    if (from == null || from === index) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndex.current = null;
  };
  const makeCover = (index) => {
    if (index === 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.unshift(moved);
      return next;
    });
  };

  // ── Image Manager (for any product) ──
  const openImageManager = (product) => {
    setImageModalProduct(product);
    const imgs = getProductImages(product);
    setImgImages(imgs.map((url) => ({ url, uploading: false })));
    setImgError('');
    setImageModalOpen(true);
  };

  const closeImageManager = () => {
    if (imgSubmitting) return;
    setImageModalOpen(false);
    setImageModalProduct(null);
  };

  const imgUploadFile = async (file) => {
    const token = getToken();
    if (!token) return;
    const placeholder = {
      url: '',
      uploading: true,
      error: '',
      localName: file.name,
      tempId: Date.now() + Math.random(),
    };
    setImgImages((prev) => [...prev, placeholder]);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${WORKER_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setImgImages((prev) =>
          prev.map((img) =>
            img.tempId === placeholder.tempId
              ? { url: data.url, uploading: false }
              : img
          )
        );
      } else {
        setImgImages((prev) =>
          prev.map((img) =>
            img.tempId === placeholder.tempId
              ? { ...img, uploading: false, error: data.error || 'Upload failed' }
              : img
          )
        );
        showToast(data.error || 'Image upload failed', 'error');
      }
    } catch {
      setImgImages((prev) =>
        prev.map((img) =>
          img.tempId === placeholder.tempId
            ? { ...img, uploading: false, error: 'Network error' }
            : img
        )
      );
      showToast('Network error during upload', 'error');
    }
  };

  const imgHandleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    files.forEach((file) => {
      if (!/^image\//.test(file.type)) {
        showToast(`${file.name} is not an image`, 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast(`${file.name} is larger than 5 MB`, 'error');
        return;
      }
      imgUploadFile(file);
    });
  };

  const imgHandleDrop = (e) => {
    e.preventDefault();
    setImgDragOver(false);
    imgHandleFiles(e.dataTransfer.files);
  };

  const imgRemoveImage = (index) => {
    setImgImages((prev) => prev.filter((_, i) => i !== index));
  };

  const imgHandleThumbDragStart = (index) => {
    imgDragIndex.current = index;
  };
  const imgHandleThumbDrop = (index) => {
    const from = imgDragIndex.current;
    if (from == null || from === index) return;
    setImgImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    imgDragIndex.current = null;
  };
  const imgMakeCover = (index) => {
    if (index === 0) return;
    setImgImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.unshift(moved);
      return next;
    });
  };

  const handleSaveImages = async () => {
    setImgError('');
    const token = getToken();
    if (!token) return;

    if (imgImages.some((i) => i.uploading))
      return setImgError('Please wait for all images to finish uploading.');

    const readyImages = imgImages.filter((i) => i.url && !i.uploading && !i.error);
    if (readyImages.length === 0)
      return setImgError('Please add at least one product image.');

    setImgSubmitting(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: imageModalProduct.id,
          images: readyImages.map((i) => i.url),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('Images updated successfully');
        setImageModalOpen(false);
        setImageModalProduct(null);
        await refreshOverrides();
      } else {
        setImgError(data.error || 'Failed to save images.');
      }
    } catch {
      setImgError('Network error. Please try again.');
    } finally {
      setImgSubmitting(false);
    }
  };

  // ── Submit (create or edit) ──
  const handleSubmit = async () => {
    setFormError('');
    const token = getToken();
    if (!token) return;

    if (!form.name.trim()) return setFormError('Please enter a product name.');
    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum < 0)
      return setFormError('Please enter a valid price.');

    const readyImages = images.filter((i) => i.url && !i.uploading && !i.error);
    if (images.some((i) => i.uploading))
      return setFormError('Please wait for all images to finish uploading.');
    if (readyImages.length === 0)
      return setFormError('Please add at least one product image.');

    const payload = {
      name: form.name.trim(),
      category: form.category,
      type: form.type.trim(),
      price: priceNum,
      material: form.material.trim(),
      weight: form.weight.trim(),
      badge: form.badge,
      description: form.description.trim(),
      images: readyImages.map((i) => i.url),
    };

    setSubmitting(true);
    try {
      const url = editingId
        ? `${WORKER_URL}/api/products/${editingId}`
        : `${WORKER_URL}/api/products`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(editingId ? 'Product updated' : 'Product added');
        setModalOpen(false);
        await refreshOverrides();
      } else {
        setFormError(data.error || 'Failed to save product.');
      }
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete custom product ──
  const handleDelete = async (product) => {
    const token = getToken();
    if (!token) return;
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`))
      return;

    setSavingId(product.id);
    try {
      const res = await fetch(`${WORKER_URL}/api/products/${product.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('Product deleted');
        await refreshOverrides();
      } else {
        showToast(data.error || 'Failed to delete product', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  // ── Filter products ──
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  // ── Stats ──
  const outOfStockCount = products.filter((p) => isOutOfStock(p.id)).length;
  const customCount = products.filter((p) => p.custom).length;

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
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>Admin Dashboard</h1>
          <p>Manage products, pricing &amp; inventory</p>
        </div>
        <button className="admin-btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="admin-content">
        <div className="admin-stats-bar">
          <div className="admin-stat-card">
            <div className="admin-stat-label">Total Products</div>
            <div className="admin-stat-value">{products.length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Added by You</div>
            <div className="admin-stat-value">{customCount}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Out of Stock</div>
            <div className="admin-stat-value">{outOfStockCount}</div>
          </div>
        </div>

        <div className="admin-table-wrapper">
          <div className="admin-table-header">
            <h2>All Products ({filtered.length})</h2>
            <div className="admin-table-header-actions">
              <input
                className="admin-search-input"
                type="text"
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="admin-btn-add" onClick={openCreateModal}>
                <span className="admin-btn-add-icon">+</span> Add New Product
              </button>
            </div>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price (₹)</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const oos = isOutOfStock(product.id);
                const isSaving = savingId === product.id;
                return (
                  <tr key={product.id}>
                    <td data-label="Product">
                      <div className="admin-product-cell">
                        <img
                          className="admin-product-thumb"
                          src={getProductImages(product)[0] || product.image}
                          alt={product.name}
                          loading="lazy"
                        />
                        <div>
                          <div className="admin-product-name">
                            {product.name}
                            {product.custom && (
                              <span className="admin-custom-tag">Custom</span>
                            )}
                          </div>
                          <div className="admin-product-id">{product.id}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Category">
                      <span className="admin-category-badge">
                        {product.category}
                      </span>
                    </td>
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
                    <td data-label="Actions">
                      <div className="admin-row-actions">
                        <button
                          className="admin-btn-images"
                          disabled={isSaving}
                          onClick={() => openImageManager(product)}
                          title="Manage images"
                        >
                          📷
                        </button>
                        {product.custom && (
                          <>
                            <button
                              className="admin-btn-edit"
                              disabled={isSaving}
                              onClick={() => openEditModal(product)}
                            >
                              Edit
                            </button>
                            <button
                              className="admin-btn-delete"
                              disabled={isSaving}
                              onClick={() => handleDelete(product)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Product Modal ── */}
      {modalOpen && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-modal-header">
              <h3>{editingId ? 'Edit Product' : 'Add New Product'}</h3>
              <button
                className="admin-modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="admin-modal-body">
              {/* Images */}
              <div className="admin-field">
                <label className="admin-field-label">Product Photos</label>
                <div
                  className={`admin-dropzone${dragOver ? ' admin-dropzone-over' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="admin-dropzone-icon">📷</div>
                  <p className="admin-dropzone-text">
                    <strong>Click to upload</strong> or drag &amp; drop
                  </p>
                  <p className="admin-dropzone-hint">
                    JPG, PNG or WebP — up to 5 MB each. The first photo is the
                    cover.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    onChange={(e) => {
                      handleFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </div>

                {images.length > 0 && (
                  <div className="admin-thumb-grid">
                    {images.map((img, idx) => (
                      <div
                        key={img.tempId || img.url || idx}
                        className={`admin-thumb${idx === 0 ? ' admin-thumb-cover' : ''}`}
                        draggable={!img.uploading}
                        onDragStart={() => handleThumbDragStart(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleThumbDrop(idx)}
                      >
                        {img.uploading ? (
                          <div className="admin-thumb-loading">
                            <div className="admin-spinner admin-spinner-sm" />
                          </div>
                        ) : img.error ? (
                          <div className="admin-thumb-error">!</div>
                        ) : (
                          <img src={img.url} alt="" />
                        )}
                        {idx === 0 && !img.uploading && !img.error && (
                          <span className="admin-thumb-badge">Cover</span>
                        )}
                        {!img.uploading && (
                          <div className="admin-thumb-actions">
                            {idx !== 0 && !img.error && (
                              <button
                                type="button"
                                title="Set as cover"
                                onClick={() => makeCover(idx)}
                              >
                                ★
                              </button>
                            )}
                            <button
                              type="button"
                              title="Remove"
                              onClick={() => removeImage(idx)}
                            >
                              🗑
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fields */}
              <div className="admin-field">
                <label className="admin-field-label">Product Name *</label>
                <input
                  className="admin-input"
                  type="text"
                  placeholder="e.g. Golden Petal Cluster Studs"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="admin-field-row">
                <div className="admin-field">
                  <label className="admin-field-label">Category *</label>
                  <select
                    className="admin-input"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label className="admin-field-label">Type</label>
                  <input
                    className="admin-input"
                    type="text"
                    placeholder="e.g. Earrings"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-field-row">
                <div className="admin-field">
                  <label className="admin-field-label">Price (₹) *</label>
                  <input
                    className="admin-input"
                    type="number"
                    min="0"
                    placeholder="349"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-field-label">Badge</label>
                  <select
                    className="admin-input"
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  >
                    {BADGE_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b === '' ? 'None' : b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="admin-field-row">
                <div className="admin-field">
                  <label className="admin-field-label">Material</label>
                  <input
                    className="admin-input"
                    type="text"
                    placeholder="e.g. Anti-Tarnish Gold Plated"
                    value={form.material}
                    onChange={(e) =>
                      setForm({ ...form, material: e.target.value })
                    }
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-field-label">Weight</label>
                  <input
                    className="admin-input"
                    type="text"
                    placeholder="e.g. 5g"
                    value={form.weight}
                    onChange={(e) =>
                      setForm({ ...form, weight: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="admin-field">
                <label className="admin-field-label">Description</label>
                <textarea
                  className="admin-input admin-textarea"
                  rows={4}
                  placeholder="Describe the product…"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              {formError && <div className="admin-form-error">{formError}</div>}
            </div>

            <div className="admin-modal-footer">
              <button
                className="admin-btn-ghost"
                onClick={closeModal}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="admin-btn-add"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? 'Saving…'
                  : editingId
                    ? 'Save Changes'
                    : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Manager Modal ── */}
      {imageModalOpen && imageModalProduct && (
        <div className="admin-modal-overlay" onClick={closeImageManager}>
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-modal-header">
              <h3>📷 Manage Images — {imageModalProduct.name}</h3>
              <button
                className="admin-modal-close"
                onClick={closeImageManager}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-field">
                <label className="admin-field-label">Product Photos</label>
                <div
                  className={`admin-dropzone${imgDragOver ? ' admin-dropzone-over' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setImgDragOver(true);
                  }}
                  onDragLeave={() => setImgDragOver(false)}
                  onDrop={imgHandleDrop}
                  onClick={() => imgFileInputRef.current?.click()}
                >
                  <div className="admin-dropzone-icon">📷</div>
                  <p className="admin-dropzone-text">
                    <strong>Click to upload</strong> or drag &amp; drop
                  </p>
                  <p className="admin-dropzone-hint">
                    JPG, PNG or WebP — up to 5 MB each. The first photo is the
                    cover.
                  </p>
                  <input
                    ref={imgFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    onChange={(e) => {
                      imgHandleFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </div>

                {imgImages.length > 0 && (
                  <div className="admin-thumb-grid">
                    {imgImages.map((img, idx) => (
                      <div
                        key={img.tempId || img.url || idx}
                        className={`admin-thumb${idx === 0 ? ' admin-thumb-cover' : ''}`}
                        draggable={!img.uploading}
                        onDragStart={() => imgHandleThumbDragStart(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => imgHandleThumbDrop(idx)}
                      >
                        {img.uploading ? (
                          <div className="admin-thumb-loading">
                            <div className="admin-spinner admin-spinner-sm" />
                          </div>
                        ) : img.error ? (
                          <div className="admin-thumb-error">!</div>
                        ) : (
                          <img src={img.url} alt="" />
                        )}
                        {idx === 0 && !img.uploading && !img.error && (
                          <span className="admin-thumb-badge">Cover</span>
                        )}
                        {!img.uploading && (
                          <div className="admin-thumb-actions">
                            {idx !== 0 && !img.error && (
                              <button
                                type="button"
                                title="Set as cover"
                                onClick={() => imgMakeCover(idx)}
                              >
                                ★
                              </button>
                            )}
                            <button
                              type="button"
                              title="Remove"
                              onClick={() => imgRemoveImage(idx)}
                            >
                              🗑
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {imgError && <div className="admin-form-error">{imgError}</div>}
            </div>

            <div className="admin-modal-footer">
              <button
                className="admin-btn-ghost"
                onClick={closeImageManager}
                disabled={imgSubmitting}
              >
                Cancel
              </button>
              <button
                className="admin-btn-add"
                onClick={handleSaveImages}
                disabled={imgSubmitting}
              >
                {imgSubmitting ? 'Saving…' : 'Save Images'}
              </button>
            </div>
          </div>
        </div>
      )}

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
