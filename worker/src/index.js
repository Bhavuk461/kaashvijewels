// ============================================================
// Kaashvi Admin API — Cloudflare Worker
// Manages product-override data + admin-created products.
//   - Overrides (price / out-of-stock) stored in Workers KV.
//   - Custom products stored in KV under the `product:` prefix.
//   - Product images stored in Cloudflare R2 (env.PRODUCT_IMAGES).
// ============================================================

// --------------- CORS configuration ---------------

const ALLOWED_ORIGINS = [
  'https://thekaashvijewels.com',
  'https://bhavuk461.github.io',
  'http://localhost:5173',
];

// Key prefix used to distinguish custom-product records from
// plain override records inside the shared KV namespace.
const PRODUCT_PREFIX = 'product:';

// Allowed image content types and the max upload size (5 MB).
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Build CORS headers for a given request origin.
 * Returns null if the origin is not allowed.
 */
function corsHeaders(origin) {
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/** Respond to an OPTIONS preflight request. */
function handleOptions(request) {
  const origin = request.headers.get('Origin');
  const headers = corsHeaders(origin);
  if (!headers) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers });
}

/** Helper: create a JSON response with optional CORS headers. */
function jsonResponse(body, status, origin) {
  const headers = {
    'Content-Type': 'application/json',
    ...(origin ? corsHeaders(origin) : {}),
  };
  return new Response(JSON.stringify(body), { status, headers });
}

// --------------- Crypto helpers (Web Crypto API) ---------------

/** Compute the SHA-256 hex digest of a string. */
async function sha256Hex(message) {
  const data = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Base64url-encode a string (no padding). */
function base64urlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Base64url-decode a string back to the original. */
function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  return atob(base64);
}

/**
 * Import `secret` as an HMAC-SHA256 CryptoKey.
 * Used for both signing and verifying JWT tokens.
 */
async function getHmacKey(secret) {
  const keyData = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** Sign data with HMAC-SHA256 and return the base64url-encoded signature. */
async function hmacSign(data, secret) {
  const key = await getHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const bytes = Array.from(new Uint8Array(sig));
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Verify an HMAC-SHA256 signature. Returns true/false. */
async function hmacVerify(data, signature, secret) {
  const key = await getHmacKey(secret);
  let base64 = signature.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  const sigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
}

// --------------- JWT helpers ---------------

/** Create a signed JWT token. Format: header.payload.signature */
async function createToken(jwtSecret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: 'admin',
    iat: Date.now(),
    exp: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await hmacSign(signingInput, jwtSecret);

  return `${signingInput}.${signature}`;
}

/** Verify and decode a JWT token. Returns payload object or null. */
async function verifyToken(token, jwtSecret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const valid = await hmacVerify(signingInput, signature, jwtSecret);
  if (!valid) return null;

  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload));
    if (!payload.exp || payload.exp < Date.now()) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

/**
 * Authenticate a request via the Bearer token.
 * Returns { ok: true } or { ok: false, response } so callers can
 * short-circuit with the proper error response.
 */
async function requireAuth(request, env, origin) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      ok: false,
      response: jsonResponse({ error: 'Missing or malformed Authorization header' }, 401, origin),
    };
  }
  const token = authHeader.slice(7);
  const payload = await verifyToken(token, env.JWT_SECRET);
  if (!payload) {
    return { ok: false, response: jsonResponse({ error: 'Invalid or expired token' }, 401, origin) };
  }
  return { ok: true, payload };
}

// --------------- R2 helpers ---------------

/** Normalise the configured public base URL (strip trailing slash). */
function r2PublicBase(env) {
  const base = env.R2_PUBLIC_URL || '';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

/** Extract the R2 object key from a stored public image URL. */
function r2KeyFromUrl(env, url) {
  if (typeof url !== 'string') return null;
  const base = r2PublicBase(env);
  if (base && url.startsWith(base + '/')) {
    return url.slice(base.length + 1);
  }
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, '');
  } catch {
    return null;
  }
}

/** Generate a short unique id. */
function uniqueId() {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 8)
  );
}

// --------------- Route handlers ---------------

/** POST /api/login — authenticate, receive a JWT. */
async function handleLogin(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
  }

  const { username, password } = body || {};
  if (!username || !password) {
    return jsonResponse({ error: 'Missing username or password' }, 400, origin);
  }
  if (username !== 'Admin') {
    return jsonResponse({ error: 'Invalid credentials' }, 401, origin);
  }

  const passwordHash = await sha256Hex(password);
  if (passwordHash !== env.ADMIN_PASSWORD_HASH) {
    return jsonResponse({ error: 'Invalid credentials' }, 401, origin);
  }

  const token = await createToken(env.JWT_SECRET);
  return jsonResponse({ token }, 200, origin);
}

/**
 * GET /api/overrides — public. Returns price/stock overrides from KV.
 * Custom-product records (prefixed with `product:`) are filtered out.
 */
async function handleGetOverrides(env, origin) {
  const overrides = {};

  let cursor = null;
  do {
    const listResult = await env.PRODUCT_OVERRIDES.list({ cursor });
    for (const key of listResult.keys) {
      if (key.name.startsWith(PRODUCT_PREFIX)) continue; // skip custom products
      const value = await env.PRODUCT_OVERRIDES.get(key.name, { type: 'json' });
      if (value !== null) {
        overrides[key.name] = value;
      }
    }
    cursor = listResult.list_complete ? null : listResult.cursor;
  } while (cursor);

  const response = jsonResponse({ overrides }, 200, origin);
  response.headers.set('Cache-Control', 'public, max-age=30');
  return response;
}

/** POST /api/update — protected. Update a single override in KV. */
async function handleUpdate(request, env, origin) {
  const auth = await requireAuth(request, env, origin);
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
  }

  const { productId, price, outOfStock, images, colors } = body || {};
  if (!productId || typeof productId !== 'string') {
    return jsonResponse({ error: 'Missing or invalid productId' }, 400, origin);
  }

  const override = {};
  if (price !== undefined) {
    if (typeof price !== 'number' || price < 0) {
      return jsonResponse({ error: 'price must be a non-negative number' }, 400, origin);
    }
    override.price = price;
  }
  if (outOfStock !== undefined) {
    if (typeof outOfStock !== 'boolean') {
      return jsonResponse({ error: 'outOfStock must be a boolean' }, 400, origin);
    }
    override.outOfStock = outOfStock;
  }
  if (images !== undefined) {
    if (!Array.isArray(images) || images.length === 0) {
      return jsonResponse({ error: 'images must be a non-empty array' }, 400, origin);
    }
    if (!images.every((u) => typeof u === 'string' && u)) {
      return jsonResponse({ error: 'Invalid image URL in images array' }, 400, origin);
    }
    override.images = images;
  }
  if (colors !== undefined) {
    if (!Array.isArray(colors)) {
      return jsonResponse({ error: 'colors must be an array' }, 400, origin);
    }
    if (colors.length > 0 && !colors.every((c) => typeof c === 'string' && c.trim())) {
      return jsonResponse({ error: 'Each color must be a non-empty string' }, 400, origin);
    }
    override.colors = colors;
  }

  if (Object.keys(override).length === 0) {
    return jsonResponse({ error: 'No fields to update (provide price, outOfStock, images, and/or colors)' }, 400, origin);
  }

  const existing = await env.PRODUCT_OVERRIDES.get(productId, { type: 'json' });

  // Clean up old R2 images that are no longer referenced.
  if (override.images && env.PRODUCT_IMAGES && Array.isArray(existing?.images)) {
    const keep = new Set(override.images);
    for (const oldUrl of existing.images) {
      if (!keep.has(oldUrl)) {
        const key = r2KeyFromUrl(env, oldUrl);
        if (key) await env.PRODUCT_IMAGES.delete(key).catch(() => {});
      }
    }
  }

  const merged = { ...(existing || {}), ...override };
  await env.PRODUCT_OVERRIDES.put(productId, JSON.stringify(merged));

  return jsonResponse({ success: true }, 200, origin);
}

/**
 * POST /api/upload — protected. Accepts a single image file as
 * multipart/form-data (field name: `file`). Stores it in R2 and
 * returns { url } pointing at the public bucket URL.
 */
async function handleUpload(request, env, origin) {
  const auth = await requireAuth(request, env, origin);
  if (!auth.ok) return auth.response;

  if (!env.PRODUCT_IMAGES) {
    return jsonResponse({ error: 'Image storage (R2) is not configured' }, 500, origin);
  }
  if (!r2PublicBase(env)) {
    return jsonResponse({ error: 'R2_PUBLIC_URL is not configured' }, 500, origin);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: 'Invalid form data' }, 400, origin);
  }

  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') {
    return jsonResponse({ error: 'No file provided' }, 400, origin);
  }

  const type = file.type;
  const ext = ALLOWED_IMAGE_TYPES[type];
  if (!ext) {
    return jsonResponse({ error: 'Unsupported image type. Use JPG, PNG, or WebP.' }, 400, origin);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return jsonResponse({ error: 'Image is too large (max 5 MB).' }, 400, origin);
  }

  const key = `products/${uniqueId()}.${ext}`;
  const buffer = await file.arrayBuffer();
  await env.PRODUCT_IMAGES.put(key, buffer, {
    httpMetadata: { contentType: type },
  });

  const url = `${r2PublicBase(env)}/${key}`;
  return jsonResponse({ url, key }, 200, origin);
}

/** Validate and normalise a custom-product payload. Returns { product } or { error }. */
function buildProduct(body, id) {
  const allowedCategories = ['anti-tarnish', 'bracelet', 'korean'];
  const {
    name,
    category,
    type,
    price,
    material,
    weight,
    description,
    badge,
    images,
  } = body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return { error: 'Name is required' };
  }
  if (!allowedCategories.includes(category)) {
    return { error: 'Category must be anti-tarnish, bracelet, or korean' };
  }
  if (typeof price !== 'number' || price < 0 || Number.isNaN(price)) {
    return { error: 'Price must be a non-negative number' };
  }
  if (!Array.isArray(images) || images.length === 0) {
    return { error: 'At least one image is required' };
  }
  if (!images.every((u) => typeof u === 'string' && u)) {
    return { error: 'Invalid image URL in images array' };
  }

  return {
    product: {
      id,
      name: name.trim(),
      category,
      type: (type || '').trim(),
      price,
      material: (material || '').trim(),
      weight: (weight || '').trim(),
      description: (description || '').trim(),
      badge: (badge || '').trim(),
      image: images[0],
      images,
      custom: true,
    },
  };
}

/** GET /api/products — public. List all admin-created products. */
async function handleGetProducts(env, origin) {
  const list = [];

  let cursor = null;
  do {
    const listResult = await env.PRODUCT_OVERRIDES.list({ prefix: PRODUCT_PREFIX, cursor });
    for (const key of listResult.keys) {
      const value = await env.PRODUCT_OVERRIDES.get(key.name, { type: 'json' });
      if (value !== null) list.push(value);
    }
    cursor = listResult.list_complete ? null : listResult.cursor;
  } while (cursor);

  const response = jsonResponse({ products: list }, 200, origin);
  response.headers.set('Cache-Control', 'public, max-age=30');
  return response;
}

/** POST /api/products — protected. Create a custom product. */
async function handleCreateProduct(request, env, origin) {
  const auth = await requireAuth(request, env, origin);
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
  }

  const id = `custom-${uniqueId()}`;
  const result = buildProduct(body, id);
  if (result.error) return jsonResponse({ error: result.error }, 400, origin);

  await env.PRODUCT_OVERRIDES.put(PRODUCT_PREFIX + id, JSON.stringify(result.product));
  return jsonResponse({ success: true, product: result.product }, 200, origin);
}

/** PUT /api/products/:id — protected. Update a custom product. */
async function handleUpdateProduct(request, env, origin, id) {
  const auth = await requireAuth(request, env, origin);
  if (!auth.ok) return auth.response;

  const existing = await env.PRODUCT_OVERRIDES.get(PRODUCT_PREFIX + id, { type: 'json' });
  if (!existing) return jsonResponse({ error: 'Product not found' }, 404, origin);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
  }

  const result = buildProduct(body, id);
  if (result.error) return jsonResponse({ error: result.error }, 400, origin);

  // Delete any R2 images that are no longer referenced.
  if (env.PRODUCT_IMAGES && Array.isArray(existing.images)) {
    const keep = new Set(result.product.images);
    for (const oldUrl of existing.images) {
      if (!keep.has(oldUrl)) {
        const key = r2KeyFromUrl(env, oldUrl);
        if (key) await env.PRODUCT_IMAGES.delete(key).catch(() => {});
      }
    }
  }

  await env.PRODUCT_OVERRIDES.put(PRODUCT_PREFIX + id, JSON.stringify(result.product));
  return jsonResponse({ success: true, product: result.product }, 200, origin);
}

/** DELETE /api/products/:id — protected. Delete a custom product + its images. */
async function handleDeleteProduct(request, env, origin, id) {
  const auth = await requireAuth(request, env, origin);
  if (!auth.ok) return auth.response;

  const existing = await env.PRODUCT_OVERRIDES.get(PRODUCT_PREFIX + id, { type: 'json' });
  if (!existing) return jsonResponse({ error: 'Product not found' }, 404, origin);

  if (env.PRODUCT_IMAGES && Array.isArray(existing.images)) {
    for (const url of existing.images) {
      const key = r2KeyFromUrl(env, url);
      if (key) await env.PRODUCT_IMAGES.delete(key).catch(() => {});
    }
  }

  await env.PRODUCT_OVERRIDES.delete(PRODUCT_PREFIX + id);
  return jsonResponse({ success: true }, 200, origin);
}

// --------------- Main router ---------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;
    const origin = request.headers.get('Origin');

    if (method === 'OPTIONS') {
      return handleOptions(request);
    }

    // Static routes
    if (pathname === '/api/login' && method === 'POST') {
      return handleLogin(request, env, origin);
    }
    if (pathname === '/api/overrides' && method === 'GET') {
      return handleGetOverrides(env, origin);
    }
    if (pathname === '/api/update' && method === 'POST') {
      return handleUpdate(request, env, origin);
    }
    if (pathname === '/api/upload' && method === 'POST') {
      return handleUpload(request, env, origin);
    }
    if (pathname === '/api/products' && method === 'GET') {
      return handleGetProducts(env, origin);
    }
    if (pathname === '/api/products' && method === 'POST') {
      return handleCreateProduct(request, env, origin);
    }

    // Dynamic routes: /api/products/:id
    const productMatch = pathname.match(/^\/api\/products\/([^/]+)$/);
    if (productMatch) {
      const id = decodeURIComponent(productMatch[1]);
      if (method === 'PUT') return handleUpdateProduct(request, env, origin, id);
      if (method === 'DELETE') return handleDeleteProduct(request, env, origin, id);
    }

    return jsonResponse({ error: 'Not found' }, 404, origin);
  },
};
