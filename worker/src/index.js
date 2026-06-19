// ============================================================
// Kaashvi Admin API — Cloudflare Worker
// Manages product-override data stored in Workers KV.
// ============================================================

// --------------- CORS configuration ---------------

const ALLOWED_ORIGINS = [
  'https://thekaashvijewels.com',
  'https://bhavuk461.github.io',
  'http://localhost:5173',
];

/**
 * Build CORS headers for a given request origin.
 * Returns null if the origin is not allowed.
 */
function corsHeaders(origin) {
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
  // Restore standard base64 characters and padding
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
  // Convert ArrayBuffer → base64url
  const bytes = Array.from(new Uint8Array(sig));
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Verify an HMAC-SHA256 signature. Returns true/false. */
async function hmacVerify(data, signature, secret) {
  const key = await getHmacKey(secret);
  // Decode the base64url signature back to an ArrayBuffer
  let base64 = signature.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  const sigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
}

// --------------- JWT helpers ---------------

/**
 * Create a signed JWT token.
 * Format: header.payload.signature  (all base64url-encoded)
 */
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

/**
 * Verify and decode a JWT token.
 * Returns the payload object on success, or null on failure.
 */
async function verifyToken(token, jwtSecret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Verify HMAC signature
  const valid = await hmacVerify(signingInput, signature, jwtSecret);
  if (!valid) return null;

  // Decode and check expiry
  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload));
    if (!payload.exp || payload.exp < Date.now()) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

// --------------- Route handlers ---------------

/**
 * POST /api/login
 * Authenticate with username + password, receive a JWT.
 */
async function handleLogin(request, env, origin) {
  // Parse request body
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

  // Check username (case-sensitive)
  if (username !== 'Admin') {
    return jsonResponse({ error: 'Invalid credentials' }, 401, origin);
  }

  // Hash the provided password and compare with stored hash
  const passwordHash = await sha256Hex(password);
  if (passwordHash !== env.ADMIN_PASSWORD_HASH) {
    return jsonResponse({ error: 'Invalid credentials' }, 401, origin);
  }

  // Issue a JWT
  const token = await createToken(env.JWT_SECRET);
  return jsonResponse({ token }, 200, origin);
}

/**
 * GET /api/overrides
 * Public endpoint — returns all product overrides from KV.
 */
async function handleGetOverrides(env, origin) {
  const overrides = {};

  // KV list returns keys in pages; iterate through all of them.
  let cursor = null;
  do {
    const listResult = await env.PRODUCT_OVERRIDES.list({ cursor });
    for (const key of listResult.keys) {
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

/**
 * POST /api/update
 * Protected endpoint — update a single product override in KV.
 */
async function handleUpdate(request, env, origin) {
  // ---- Authenticate ----
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing or malformed Authorization header' }, 401, origin);
  }

  const token = authHeader.slice(7); // strip "Bearer "
  const payload = await verifyToken(token, env.JWT_SECRET);
  if (!payload) {
    return jsonResponse({ error: 'Invalid or expired token' }, 401, origin);
  }

  // ---- Parse body ----
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
  }

  const { productId, price, outOfStock } = body || {};

  if (!productId || typeof productId !== 'string') {
    return jsonResponse({ error: 'Missing or invalid productId' }, 400, origin);
  }

  // Build the override value (only include provided fields)
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

  if (Object.keys(override).length === 0) {
    return jsonResponse({ error: 'No fields to update (provide price and/or outOfStock)' }, 400, origin);
  }

  // ---- Read existing data and merge ----
  const existing = await env.PRODUCT_OVERRIDES.get(productId, { type: 'json' });
  const merged = { ...(existing || {}), ...override };

  // ---- Write to KV ----
  await env.PRODUCT_OVERRIDES.put(productId, JSON.stringify(merged));

  return jsonResponse({ success: true }, 200, origin);
}

// --------------- Main router ---------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;
    const origin = request.headers.get('Origin');

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return handleOptions(request);
    }

    // Route dispatch
    if (pathname === '/api/login' && method === 'POST') {
      return handleLogin(request, env, origin);
    }

    if (pathname === '/api/overrides' && method === 'GET') {
      return handleGetOverrides(env, origin);
    }

    if (pathname === '/api/update' && method === 'POST') {
      return handleUpdate(request, env, origin);
    }

    // Fallback — 404
    return jsonResponse({ error: 'Not found' }, 404, origin);
  },
};
