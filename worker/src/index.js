/**
 * Cloudflare Worker for The Kaashvi Jewels payments.
 *
 * Routes:
 *   POST /create-order  -> creates a Razorpay order (server-side, uses secret)
 *   POST /verify        -> verifies payment signature, then forwards to Apps Script
 *   POST /webhook       -> Razorpay webhook backup (verifies webhook signature)
 *
 * Secrets (set via `wrangler secret put`):
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET,
 *   APPS_SCRIPT_URL, APPS_SCRIPT_TOKEN
 * Vars (wrangler.toml):
 *   ALLOWED_ORIGIN
 */

const encoder = new TextEncoder();

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}

/** HMAC-SHA256 -> hex string */
async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string compare */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Re-validate totals server-side so the client cannot tamper the amount. */
function computeTotals(items) {
  const subtotal = items.reduce((sum, it) => sum + Number(it.price) * Number(it.quantity), 0);
  const gst = Math.round(subtotal * 0.18);
  const shipping = subtotal > 499 ? 0 : 49;
  const total = subtotal + gst + shipping;
  return { subtotal, gst, shipping, total };
}

async function forwardToAppsScript(env, payload) {
  const res = await fetch(env.APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: env.APPS_SCRIPT_TOKEN, ...payload }),
  });
  return res.ok;
}

async function createOrder(request, env) {
  const body = await request.json();
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return json({ error: 'Empty cart' }, env, 400);

  const { total } = computeTotals(items);
  const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: total * 100, // paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { source: 'kaashvi-web' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return json({ error: 'Failed to create order', detail: errText }, env, 502);
  }
  const order = await res.json();
  return json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: env.RAZORPAY_KEY_ID }, env);
}

async function verify(request, env) {
  const body = await request.json();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, customer, items } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return json({ error: 'Missing payment fields' }, env, 400);
  }

  const expected = await hmacHex(env.RAZORPAY_KEY_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
  if (!safeEqual(expected, razorpay_signature)) {
    return json({ error: 'Invalid signature' }, env, 400);
  }

  const totals = computeTotals(Array.isArray(items) ? items : []);
  await forwardToAppsScript(env, {
    event: 'payment.verified',
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    customer: customer || {},
    items: items || [],
    totals,
    status: 'PAID',
  });

  return json({ ok: true }, env);
}

async function webhook(request, env) {
  const raw = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';
  const expected = await hmacHex(env.RAZORPAY_WEBHOOK_SECRET, raw);
  if (!safeEqual(expected, signature)) {
    return new Response('Invalid signature', { status: 400 });
  }

  const evt = JSON.parse(raw);
  if (evt.event === 'payment.captured') {
    const p = evt.payload.payment.entity;
    await forwardToAppsScript(env, {
      event: 'payment.captured.webhook',
      orderId: p.order_id,
      paymentId: p.id,
      customer: { email: p.email, phone: p.contact },
      items: [],
      totals: { total: p.amount / 100 },
      status: 'PAID',
    });
  }
  return new Response('ok', { status: 200 });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }
    const url = new URL(request.url);
    try {
      if (request.method === 'POST' && url.pathname === '/create-order') return await createOrder(request, env);
      if (request.method === 'POST' && url.pathname === '/verify') return await verify(request, env);
      if (request.method === 'POST' && url.pathname === '/webhook') return await webhook(request, env);
      return json({ error: 'Not found' }, env, 404);
    } catch (err) {
      return json({ error: 'Server error', detail: String(err) }, env, 500);
    }
  },
};
