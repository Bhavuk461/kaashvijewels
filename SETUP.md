# Payments & Order Notifications — Setup Guide

This guide explains how to configure Razorpay payments with secure server-side
verification, plus automated order notifications to the owner's Gmail and Google
Sheets, for **The Kaashvi Jewels**.

Follow the sections **in order**. Each section ends with the value(s) you'll need
in a later step, so keep a scratch note of them as you go.

---

## Architecture overview

```
Browser (Checkout.jsx)
   │  1. POST /create-order  (cart items)
   ▼
Cloudflare Worker  ── creates Razorpay order using KEY_SECRET ──►  Razorpay API
   │  returns { orderId, amount, currency, keyId }
   ▼
Browser  ── 2. opens Razorpay Checkout with orderId ──►  Razorpay
   │  on success: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
   │  3. POST /verify  (signature + customer + items)
   ▼
Cloudflare Worker  ── recomputes HMAC-SHA256 signature, validates ──►
   │  4. POST (verified order) with shared token
   ▼
Google Apps Script Web App
   ├── appends a row to the Google Sheet
   └── emails the owner via Gmail (MailApp)

Backup path:
Razorpay ── payment.captured webhook ──► Worker /webhook ──► Apps Script
```

**Why this design**

- The `RAZORPAY_KEY_SECRET` lives **only** in the Cloudflare Worker. It is never
  shipped to the browser, so customers cannot read it or forge "paid" orders.
- Amounts (subtotal, GST, shipping, total) are **recomputed server-side** in the
  Worker, so a tampered client cannot change the price that is charged.
- The Apps Script Web App is protected by a shared secret token
  (`SHARED_TOKEN` on the script side == `APPS_SCRIPT_TOKEN` on the Worker side).
- The Razorpay **webhook** is a safety net: if the customer closes the browser
  right after paying, the `/verify` call may never fire, but the webhook still
  records the order. (The webhook row is sparser — it only has the data Razorpay
  stores: email, phone, amount.)

---

## Files in this repository

| File | Purpose |
|------|---------|
| `worker/wrangler.toml` | Cloudflare Worker config (non-secret vars only). |
| `worker/src/index.js` | Worker code: create-order, verify, webhook. |
| `apps-script/Code.gs` | Google Apps Script Web App: sheet append + Gmail. |
| `src/pages/Checkout.jsx` | Frontend checkout flow (create-order → checkout → verify). |
| `.env.example` | Frontend Vite environment variables template. |

---

## Prerequisites

- A Razorpay account (test mode works immediately; live mode needs KYC).
- A Google account that owns the orders spreadsheet:
  `https://docs.google.com/spreadsheets/d/1PTkessRfGPA1K7rPKZhRYJaxaFB2cf0Q9VEKyaRK8UM/edit`
- A free Cloudflare account.
- Node.js installed locally (for Wrangler and the frontend build).

---

## Step 0 — Generate a shared token

You need one random secret string that is shared between Apps Script and the
Worker. Generate it once and reuse it. For example, run locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save the output. It will be used as:

- `SHARED_TOKEN` in Apps Script (Step 2).
- `APPS_SCRIPT_TOKEN` in the Worker (Step 3).

These two **must be identical**.

---

## Step 1 — Razorpay

1. Sign up / log in at <https://razorpay.com>.
2. (For live payments) complete KYC. You can do everything below in **Test Mode**
   first — toggle Test/Live at the top of the dashboard.
3. Go to **Settings → API Keys → Generate Key**.
   - Copy the **Key ID** (looks like `rzp_test_xxx` or `rzp_live_xxx`).
   - Copy the **Key Secret** (shown only once — store it safely).
4. Create a webhook: **Settings → Webhooks → Add New Webhook**.
   - **Webhook URL**: `https://<your-worker-url>/webhook`
     (you will get the Worker URL in Step 3 — you can come back and fill this in).
   - **Secret**: enter a strong random string. This is your
     `RAZORPAY_WEBHOOK_SECRET`.
   - **Active Events**: enable `payment.captured`.
   - Save.

**Values produced:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`.

---

## Step 2 — Google Apps Script (Sheets + Gmail)

1. Open the orders spreadsheet, then **Extensions → Apps Script**.
2. Delete any boilerplate in `Code.gs` and paste the full contents of
   `apps-script/Code.gs` from this repository.
3. Set Script Properties: **Project Settings (gear icon) → Script Properties →
   Add script property**. Add the following:

   | Property | Value |
   |----------|-------|
   | `SHARED_TOKEN` | the token from Step 0 |
   | `OWNER_EMAIL` | the owner Gmail that should receive order alerts |
   | `SHEET_ID` | `1PTkessRfGPA1K7rPKZhRYJaxaFB2cf0Q9VEKyaRK8UM` (optional; defaults to the bound sheet) |
   | `SHEET_NAME` | the tab name, only if not the first tab (optional) |

4. Deploy as a Web App: **Deploy → New deployment**.
   - Click the gear next to "Select type" → choose **Web app**.
   - **Description**: e.g. `Kaashvi orders endpoint`.
   - **Execute as**: **Me** (your Google account).
   - **Who has access**: **Anyone**.
     (The endpoint is still protected by `SHARED_TOKEN`; "Anyone" only means it
     is reachable without a Google login, which the Worker needs.)
   - Click **Deploy**.
5. Authorize the script when prompted. Because it uses Gmail and Sheets, Google
   will show a consent screen; if it warns the app is "unverified", choose
   **Advanced → Go to (project) (unsafe)** — this is expected for your own
   private script.
6. Copy the **Web app URL** (ends in `/exec`). This is `APPS_SCRIPT_URL`.

> **Re-deploying after edits:** Apps Script Web Apps are versioned. After you
> change `Code.gs`, use **Deploy → Manage deployments → (edit) → Version: New
> version → Deploy** so the live URL serves your latest code. The URL stays the
> same.

**Values produced:** `APPS_SCRIPT_URL`.

### Sheet columns

The script writes a header row automatically on first run (only if the sheet is
empty), then appends one row per order:

```
Timestamp | Order ID | Payment ID | Name | Email | Phone | Address |
Subtotal | GST | Shipping | Total | Items | Status
```

---

## Step 3 — Cloudflare Worker

1. Create a free account at <https://dash.cloudflare.com/sign-up>.
2. Install Wrangler and log in:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
3. From the `worker/` directory of this repo, set the secrets (you'll be
   prompted to paste each value):
   ```bash
   cd worker
   wrangler secret put RAZORPAY_KEY_ID         # from Step 1
   wrangler secret put RAZORPAY_KEY_SECRET      # from Step 1
   wrangler secret put RAZORPAY_WEBHOOK_SECRET  # from Step 1
   wrangler secret put APPS_SCRIPT_URL          # from Step 2 (ends in /exec)
   wrangler secret put APPS_SCRIPT_TOKEN        # the token from Step 0 (== SHARED_TOKEN)
   ```
4. Edit `worker/wrangler.toml` and set `ALLOWED_ORIGIN` to your live frontend
   URL (your GitHub Pages URL, no trailing slash), for example:
   ```toml
   [vars]
   ALLOWED_ORIGIN = "https://krishnahaha27-group.github.io"
   ```
   For local frontend testing you can temporarily use `"*"`, but tighten it for
   production.
5. Deploy:
   ```bash
   wrangler deploy
   ```
   Copy the printed URL, e.g. `https://kaashvi-payments.<subdomain>.workers.dev`.
6. Go back to **Razorpay → Webhooks** (Step 1) and set the webhook URL to
   `https://<that-worker-url>/webhook`.

**Values produced:** the Worker base URL → `VITE_WORKER_URL`.

### Worker routes (reference)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/create-order` | Creates a Razorpay order; returns `orderId`, `amount`, `currency`, `keyId`. |
| POST | `/verify` | Verifies payment signature; forwards verified order to Apps Script. |
| POST | `/webhook` | Razorpay `payment.captured` backup; verifies webhook signature. |

---

## Step 4 — Frontend (Vite)

1. In the project root, copy the example env file:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in `.env.local`:
   ```
   VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx   # Razorpay Key ID (public, safe)
   VITE_WORKER_URL=https://kaashvi-payments.<subdomain>.workers.dev   # no trailing slash
   ```
   - `VITE_RAZORPAY_KEY_ID` is the **Key ID only** — never put the Key Secret here.
   - `.env.local` is gitignored, so it stays out of the repo.
3. For the production GitHub Pages build, the same two variables must be present
   in the build environment **before** `npm run build`. Options:
   - Add a `.env.production` file (do **not** commit secrets), or
   - Set them as CI/CD variables / GitHub Actions secrets used by your deploy
     workflow.
4. Build and deploy as usual:
   ```bash
   npm run build
   npm run deploy
   ```

> Note: `index.html` already loads `https://checkout.razorpay.com/v1/checkout.js`,
> so no script tag change is needed.

---

## Step 5 — Test the full flow

1. Use Razorpay **Test Mode** keys for the first run.
2. Add an item to the cart and go to **Checkout**.
3. Fill the shipping form and click **Pay with Razorpay**.
4. On the Razorpay popup, use a test card, e.g.:
   - Card: `4111 1111 1111 1111`
   - Expiry: any future date
   - CVV: any 3 digits
   - See <https://razorpay.com/docs/payments/payments/test-card-details/> for more.
5. After a successful test payment, verify:
   - A new row appears in the Google Sheet.
   - The owner Gmail (`OWNER_EMAIL`) receives an order notification email.
6. When everything works, switch Razorpay to **Live Mode**, regenerate live keys,
   update the Worker secrets (`wrangler secret put ...` again) and the frontend
   `VITE_RAZORPAY_KEY_ID`, and redeploy.

---

## Configuration values summary

| Where | Name | Source |
|-------|------|--------|
| Worker secret | `RAZORPAY_KEY_ID` | Razorpay (Step 1) |
| Worker secret | `RAZORPAY_KEY_SECRET` | Razorpay (Step 1) |
| Worker secret | `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook (Step 1) |
| Worker secret | `APPS_SCRIPT_URL` | Apps Script deploy (Step 2) |
| Worker secret | `APPS_SCRIPT_TOKEN` | shared token (Step 0) |
| Worker var | `ALLOWED_ORIGIN` | your frontend URL (Step 3) |
| Apps Script property | `SHARED_TOKEN` | shared token (Step 0) |
| Apps Script property | `OWNER_EMAIL` | owner Gmail |
| Apps Script property | `SHEET_ID` | spreadsheet ID (optional) |
| Apps Script property | `SHEET_NAME` | tab name (optional) |
| Frontend (Vite) | `VITE_RAZORPAY_KEY_ID` | Razorpay Key ID (Step 1) |
| Frontend (Vite) | `VITE_WORKER_URL` | Worker URL (Step 3) |

---

## Troubleshooting

- **"Payment is not configured"** toast → `VITE_WORKER_URL` is missing at build
  time. Set it and rebuild.
- **CORS error in the browser console** → `ALLOWED_ORIGIN` in `wrangler.toml`
  does not match your site's origin exactly (scheme + host, no trailing slash).
  Update and `wrangler deploy` again.
- **Order created but no sheet row / no email** → check the Worker logs with
  `wrangler tail`. Common causes: `APPS_SCRIPT_TOKEN` != `SHARED_TOKEN`, or the
  Apps Script deployment access is not set to **Anyone**.
- **"Invalid signature" on /verify** → the `RAZORPAY_KEY_SECRET` in the Worker
  does not match the key pair whose `Key ID` is used on the frontend. Make sure
  both come from the same Razorpay key pair and the same mode (test vs live).
- **Apps Script changes not taking effect** → you must deploy a **New version**
  under Manage deployments; saving alone does not update the live `/exec` URL.
- **Owner email not received** → confirm `OWNER_EMAIL` is set, check Gmail spam,
  and note Gmail's daily `MailApp` sending quota (consumer accounts: ~100/day).
