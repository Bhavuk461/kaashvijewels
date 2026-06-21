var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var encoder = new TextEncoder();
var STATIC_PRICES = {
  "at-01": 349,
  "at-02": 309,
  "at-03": 329,
  "at-04": 379,
  "at-05": 399,
  "at-06": 289,
  "at-07": 269,
  "at-08": 359,
  "at-09": 319,
  "at-10": 309,
  "at-11": 339,
  "at-12": 299,
  "at-13": 329,
  "at-14": 389,
  "at-15": 159,
  "at-16": 159,
  "kr-01": 249,
  "kr-02": 279,
  "kr-03": 289,
  "kr-04": 329,
  "kr-05": 249,
  "kr-06": 299,
  "kr-07": 379,
  "kr-08": 269,
  "kr-09": 289,
  "kr-10": 259,
  "kr-11": 159,
  "kr-12": 159,
  "br-01": 449,
  "br-02": 499,
  "br-03": 529,
  "br-04": 459,
  "br-05": 499,
  "br-06": 549,
  "br-07": 509,
  "br-08": 159
};
var ALLOWED_ORIGINS = [
  "https://thekaashvijewels.com",
  "https://bhavuk461.github.io",
  "http://localhost:5173"
];
function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}
__name(corsHeaders, "corsHeaders");
function json(data, origin, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
  });
}
__name(json, "json");
async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacHex, "hmacHex");
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
__name(safeEqual, "safeEqual");
async function resolvePrice(env, productId) {
  try {
    const custom = await env.PRODUCT_OVERRIDES.get(`product:${productId}`, { type: "json" });
    if (custom && typeof custom.price === "number") {
      return custom.price;
    }
  } catch {
  }
  try {
    const override = await env.PRODUCT_OVERRIDES.get(productId, { type: "json" });
    if (override && typeof override.price === "number") {
      return override.price;
    }
  } catch {
  }
  if (STATIC_PRICES[productId] !== void 0) {
    return STATIC_PRICES[productId];
  }
  return null;
}
__name(resolvePrice, "resolvePrice");
async function computeTotals(items, env) {
  let subtotal = 0;
  for (const item of items) {
    const id = item.id || item.productId;
    const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
    const price = await resolvePrice(env, id);
    if (price === null) {
      return { error: `Unknown product: ${id}` };
    }
    subtotal += price * qty;
  }
  const gst = Math.round(subtotal * 0.18);
  const shipping = 0;
  const total = subtotal + gst + shipping;
  return { subtotal, gst, shipping, total };
}
__name(computeTotals, "computeTotals");
async function forwardToAppsScript(env, payload) {
  const res = await fetch(env.APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: env.APPS_SCRIPT_TOKEN, ...payload })
  });
  return res.ok;
}
__name(forwardToAppsScript, "forwardToAppsScript");
async function createOrder(request, env, origin) {
  const body = await request.json();
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return json({ error: "Empty cart" }, origin, 400);
  const totals = await computeTotals(items, env);
  if (totals.error) return json({ error: totals.error }, origin, 400);
  const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: totals.total * 100,
      // paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { source: "kaashvi-web" }
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    return json({ error: "Failed to create order", detail: errText }, origin, 502);
  }
  const order = await res.json();
  return json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID
  }, origin);
}
__name(createOrder, "createOrder");
async function verify(request, env, origin) {
  const body = await request.json();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, customer, items } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return json({ error: "Missing payment fields" }, origin, 400);
  }
  const expected = await hmacHex(env.RAZORPAY_KEY_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
  if (!safeEqual(expected, razorpay_signature)) {
    return json({ error: "Invalid signature" }, origin, 400);
  }
  const totals = await computeTotals(Array.isArray(items) ? items : [], env);
  await forwardToAppsScript(env, {
    event: "payment.verified",
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    customer: customer || {},
    items: items || [],
    totals: totals.error ? {} : totals,
    status: "PAID"
  });
  return json({ ok: true }, origin);
}
__name(verify, "verify");
async function webhook(request, env, origin) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";
  const expected = await hmacHex(env.RAZORPAY_WEBHOOK_SECRET, raw);
  if (!safeEqual(expected, signature)) {
    return new Response("Invalid signature", { status: 400 });
  }
  const evt = JSON.parse(raw);
  if (evt.event === "payment.captured") {
    const p = evt.payload.payment.entity;
    await forwardToAppsScript(env, {
      event: "payment.captured.webhook",
      orderId: p.order_id,
      paymentId: p.id,
      customer: { email: p.email, phone: p.contact },
      items: [],
      totals: { total: p.amount / 100 },
      status: "PAID"
    });
  }
  return new Response("ok", { status: 200 });
}
__name(webhook, "webhook");
var index_default = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    const url = new URL(request.url);
    try {
      if (request.method === "POST" && url.pathname === "/create-order") return await createOrder(request, env, origin);
      if (request.method === "POST" && url.pathname === "/verify") return await verify(request, env, origin);
      if (request.method === "POST" && url.pathname === "/webhook") return await webhook(request, env, origin);
      return json({ error: "Not found" }, origin, 404);
    } catch (err) {
      return json({ error: "Server error", detail: String(err) }, origin, 500);
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
