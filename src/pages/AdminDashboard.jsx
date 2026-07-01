import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductOverrides } from '../context/ProductOverridesContext';
import { useAllProducts } from '../hooks/useAllProducts';
import ProductImage from '../components/ProductImage';
import { getCategoryLabel, getEffectiveCategory } from '../utils/category';
import './Admin.css';

const WORKER_URL = 'https://kaashvi-admin-api.greatgatch1.workers.dev';

const CATEGORY_OPTIONS = [
  { value: 'anti-tarnish', label: 'Anti-Tarnish Earrings' },
  { value: 'korean', label: 'Korean Earrings' },
  { value: 'kashmiri', label: 'Kashmiri Earrings' },
  { value: 'bracelet', label: 'Anti Tarnish Bracelet' },
  { value: 'tulip-bracelet', label: 'Tulip Bracelets' },
];
const BADGE_OPTIONS = ['', 'Bestseller', 'New'];

const COLOR_OPTIONS = [
  'Gold', 'Silver', 'Rose Gold', 'Black', 'White',
  'Red', 'Blue', 'Green', 'Pink', 'Purple', 'Multi-Color',
];

const COLOR_HEX_MAP = {
  Gold: '#c9a96e', Silver: '#c0c0c0', 'Rose Gold': '#d4a08f',
  Black: '#222222', White: '#f0f0f0', Red: '#e74c3c',
  Blue: '#3498db', Green: '#2ecc71', Pink: '#e98db2',
  Purple: '#9b59b6', 'Multi-Color': 'conic-gradient(red, orange, yellow, green, blue, violet, red)',
};

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
  const { overrides, loading, isOutOfStock, getProductImages, getProductColors, refreshOverrides } =
    useProductOverrides();
  const products = useAllProducts();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [prices, setPrices] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [toasts, setToasts] = useState([]);

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'orders'
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

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

  // ── Color dropdown state ──
  const [colorSelections, setColorSelections] = useState({});
  const [colorPanelOpen, setColorPanelOpen] = useState(null); // productId or null
  const colorPanelRef = useRef(null);

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

    // Also initialize color selections from overrides
    const initialColors = {};
    products.forEach((p) => {
      const override = overrides[p.id];
      initialColors[p.id] = override?.colors && Array.isArray(override.colors) ? override.colors : [];
    });
    setColorSelections(initialColors);
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

  // ── Save colors ──
  const handleSaveColors = async (productId, colors) => {
    const token = getToken();
    if (!token) return;

    setSavingId(productId);
    try {
      const res = await fetch(`${WORKER_URL}/api/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, colors }),
      });
      if (res.ok) {
        showToast(`Colors updated for ${productId}`);
        await refreshOverrides();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to update colors', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const toggleColor = (productId, color) => {
    setColorSelections((prev) => {
      const current = prev[productId] || [];
      let next;
      if (current.includes(color)) {
        next = current.filter((c) => c !== color);
      } else {
        next = [...current, color];
      }
      // Auto-save
      handleSaveColors(productId, next);
      return { ...prev, [productId]: next };
    });
  };

  const clearColors = (productId) => {
    setColorSelections((prev) => ({ ...prev, [productId]: [] }));
    handleSaveColors(productId, []);
    setColorPanelOpen(null);
  };

  // ── Fetch orders list ──
  const fetchOrdersList = useCallback(async () => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) return;
    setOrdersLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        showToast('Failed to load orders', 'error');
      }
    } catch {
      showToast('Network error while loading orders', 'error');
    } finally {
      setOrdersLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrdersList();
    }
  }, [activeTab, fetchOrdersList]);

  // ── Update order status ──
  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    const token = getToken();
    if (!token) return;

    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`${WORKER_URL}/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        showToast(`Order ${orderId} marked as ${nextStatus}`);
        fetchOrdersList();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to update order status', 'error');
      }
    } catch {
      showToast('Network error updating status', 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Close color panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colorPanelRef.current && !colorPanelRef.current.contains(e.target)) {
        setColorPanelOpen(null);
      }
    };
    if (colorPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [colorPanelOpen]);

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
  const filtered = products.filter((p) => {
    if (categoryFilter !== 'all') {
      if (getEffectiveCategory(p) !== categoryFilter) {
        return false;
      }
    }
    const searchLower = search.toLowerCase();
    const effectiveCategoryLabel = getCategoryLabel(getEffectiveCategory(p)).toLowerCase();
    return (
      p.name.toLowerCase().includes(searchLower) ||
      p.id.toLowerCase().includes(searchLower) ||
      effectiveCategoryLabel.includes(searchLower)
    );
  });

  // ── Stats ──
  const outOfStockCount = products.filter((p) => isOutOfStock(p.id)).length;
  const customCount = products.filter((p) => p.custom).length;

  const activeOrders = orders.filter(o => o.status === 'preparing' || o.status === 'shipping');
  const processedOrders = orders.filter(o => o.status === 'reached');

  const renderOrderCard = (order, isProcessed = false) => {
    const steps = ['preparing', 'shipping', 'reached'];
    const currentStepIndex = steps.indexOf(order.status);
    const isUpdating = updatingOrderId === order.orderId;

    return (
      <div key={order.orderId} className={`admin-order-card ${isProcessed ? 'admin-order-card--processed' : ''}`}>
        <div className="admin-order-card-header">
          <div>
            <h4>Order {order.orderId}</h4>
            <span className="admin-order-date">{new Date(order.createdAt).toLocaleString('en-IN')}</span>
          </div>
          <div className="admin-order-total">
            ₹{order.totals?.total}
          </div>
        </div>

        <div className="admin-order-customer-details">
          <p><strong>Customer:</strong> {order.customer?.firstName} {order.customer?.lastName}</p>
          <p><strong>Contact:</strong> {order.customer?.email} | {order.customer?.phone}</p>
          <p><strong>Address:</strong> {order.customer?.address}, {order.customer?.city}, {order.customer?.state} - {order.customer?.pincode}</p>
        </div>

        <div className="admin-order-items">
          <h5>Items:</h5>
          <ul>
            {(order.items || []).map((item, idx) => (
              <li key={idx}>
                {item.name} {item.selectedColor && <span className="admin-order-item-color">({item.selectedColor})</span>} × {item.quantity} - ₹{item.price * item.quantity}
              </li>
            ))}
          </ul>
        </div>

        <div className="admin-order-stepper">
          {steps.map((step, idx) => (
            <div key={step} className={`admin-order-step ${idx <= currentStepIndex ? 'active' : ''} ${order.status === step ? 'current' : ''}`}>
              <div className="admin-order-step-dot">{idx <= currentStepIndex ? '✓' : idx + 1}</div>
              <span className="admin-order-step-label">{step.charAt(0).toUpperCase() + step.slice(1)}</span>
            </div>
          ))}
        </div>

        {!isProcessed && (
          <div className="admin-order-actions">
            {order.status === 'preparing' && (
              <button
                className="admin-btn-primary admin-btn-sm"
                onClick={() => handleUpdateOrderStatus(order.orderId, 'shipping')}
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating...' : '🚚 Mark as Shipping'}
              </button>
            )}
            {order.status === 'shipping' && (
              <button
                className="admin-btn-success admin-btn-sm"
                onClick={() => handleUpdateOrderStatus(order.orderId, 'reached')}
                disabled={isUpdating}
                style={{ background: 'var(--admin-success)', color: '#0f0f0f', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
              >
                {isUpdating ? 'Updating...' : '✓ Mark as Reached'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

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

      <div className="admin-tabs">
        <button
          className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          🏷️ Products
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📦 Orders
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'products' && (
          <>
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
              <select
                className="admin-search-input"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ width: 'auto', paddingRight: '10px' }}
              >
                <option value="all">All Categories</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
                <th>Colors</th>
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
                        {getCategoryLabel(getEffectiveCategory(product))}
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
                    <td data-label="Colors">
                      <div className="admin-color-wrapper" ref={colorPanelOpen === product.id ? colorPanelRef : undefined}>
                        <button
                          className="admin-color-trigger"
                          onClick={() => setColorPanelOpen(colorPanelOpen === product.id ? null : product.id)}
                          disabled={isSaving}
                        >
                          {(colorSelections[product.id] || []).length > 0 ? (
                            <span className="admin-color-chips">
                              {(colorSelections[product.id] || []).slice(0, 3).map((c) => (
                                <span key={c} className="admin-color-chip">
                                  <span
                                    className="admin-color-chip-swatch"
                                    style={{ background: COLOR_HEX_MAP[c] || '#888' }}
                                  />
                                  {c}
                                </span>
                              ))}
                              {(colorSelections[product.id] || []).length > 3 && (
                                <span className="admin-color-chip">+{(colorSelections[product.id] || []).length - 3}</span>
                              )}
                            </span>
                          ) : (
                            'None'
                          )}
                          <span className={`admin-color-trigger-arrow${colorPanelOpen === product.id ? ' open' : ''}`}>▼</span>
                        </button>
                        {colorPanelOpen === product.id && (
                          <div className="admin-color-panel">
                            <button
                              className="admin-color-option admin-color-option--none"
                              onClick={() => clearColors(product.id)}
                            >
                              None (clear all)
                            </button>
                            {COLOR_OPTIONS.map((color) => {
                              const isSelected = (colorSelections[product.id] || []).includes(color);
                              return (
                                <button
                                  key={color}
                                  className="admin-color-option"
                                  onClick={() => toggleColor(product.id, color)}
                                >
                                  <span className={`admin-color-checkbox${isSelected ? ' checked' : ''}`}>
                                    {isSelected ? '✓' : ''}
                                  </span>
                                  <span
                                    className="admin-color-swatch"
                                    style={{ background: COLOR_HEX_MAP[color] || '#888' }}
                                  />
                                  {color}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
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
        </>
        )}

        {activeTab === 'orders' && (
          <div className="admin-orders-tab">
            <div className="admin-stats-bar">
              <div className="admin-stat-card">
                <div className="admin-stat-label">Total Orders</div>
                <div className="admin-stat-value">{orders.length}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Preparing</div>
                <div className="admin-stat-value">
                  {orders.filter(o => o.status === 'preparing').length}
                </div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Shipping</div>
                <div className="admin-stat-value">
                  {orders.filter(o => o.status === 'shipping').length}
                </div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Reached</div>
                <div className="admin-stat-value">
                  {orders.filter(o => o.status === 'reached').length}
                </div>
              </div>
            </div>

            {ordersLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="admin-spinner" style={{ margin: '0 auto 16px auto' }} />
                <span className="admin-loading-text">Loading orders…</span>
              </div>
            ) : (
              <div className="admin-orders-content">
                <div className="admin-orders-section">
                  <h3 className="admin-orders-section-title">Active Orders ({activeOrders.length})</h3>
                  {activeOrders.length === 0 ? (
                    <div className="admin-orders-empty">No active orders found.</div>
                  ) : (
                    <div className="admin-orders-grid">
                      {activeOrders.map(order => renderOrderCard(order))}
                    </div>
                  )}
                </div>

                <div className="admin-orders-section admin-orders-section--processed">
                  <h3 className="admin-orders-section-title">Processed Orders ({processedOrders.length})</h3>
                  {processedOrders.length === 0 ? (
                    <div className="admin-orders-empty">No processed orders found.</div>
                  ) : (
                    <div className="admin-orders-grid">
                      {processedOrders.map(order => renderOrderCard(order, true))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
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
