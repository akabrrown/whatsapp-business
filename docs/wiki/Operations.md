# Operations

## Environment variables (`apps/api/.env`)

The API boots fully with zero configuration (all defaults are dev-safe). Set variables only when going real.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `DATABASE_URL` | `file:./dev.db` | Prisma SQLite path |
| `JWT_SECRET` | `dev-secret` | Admin JWT signing: **set in production** |
| `WHATSAPP_NUMBER` | `233200000000` | Business number used in `wa.me` links |
| `WHATSAPP_MODE` | `sim` | `real` = Meta Cloud API |
| `META_ACCESS_TOKEN` / `META_PHONE_NUMBER_ID` |: | Cloud API credentials (real mode) |
| `META_VERIFY_TOKEN` | `rose-denim-verify` | Webhook handshake token |
| `PAYSTACK_MODE` | `sim` | `real` = live Paystack |
| `PAYSTACK_SECRET_KEY` |: | Live secret key; also the HMAC webhook secret |
| `PAYSTACK_CALLBACK_URL` | `http://localhost:4000/webhooks/paystack` | Payment redirect callback |
| `IMAGES_MODE` | `sim` | `cloudinary` = use `CLOUDINARY_URL` images |
| `REDIS_URL` |: | Reserved for swapping the session store |
| `OWNER_EMAIL` / `OWNER_PASSWORD` | `kukua@roseanddenim.com` / `denim-rose-2026` | Seeded owner account |

Frontends read `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`).

## Daily commands

```powershell
npm run dev            # all three apps concurrently
npm run dev:api        # API only
npm test               # full 87-scenario suite (fresh test DB)
npm run db:push        # apply schema changes
npm run db:seed        # idempotent seed (owner, categories, products, zones)
npm run build          # production builds (web + admin)
```

## Local end-to-end walkthrough (sim mode)

1. **Website order**: open http://localhost:3000 → add items to bag → enter phone + zone in the mini-cart → green CTA → the `/handoff` page previews the WhatsApp message and opens the chat. In sim mode the "WhatsApp" conversation lives via the API: POST `http://localhost:4000/webhooks/whatsapp/sim-inbound` with `{ "phone": "<same phone>", "text": "yes" }` to reply as the customer; watch Kukua collect the address and send a payment link.
2. **Pay the order**: the Paystack simulator exposes charge events; the admin dashboard shows the order flip RESERVED → PAID with a toast, then use Orders → *Mark packed/shipped/delivered* to walk fulfillment (each step messages the customer).
3. **Direct WhatsApp order**: sim-inbound `{ "phone": "233...", "text": "hi" }` and chat through the bot: browse → add → address → payment. Order is tagged `whatsapp_direct`.
4. **Admin ops**: log in at http://localhost:3001, restock a SKU (website updates via `stock.updated`), take over a conversation from the inbox, edit a zone fee, export CSV.

## Going live checklist

1. **Paystack**: set `PAYSTACK_MODE=real` + `PAYSTACK_SECRET_KEY`; point the Paystack dashboard callback URL at `https://<host>/webhooks/paystack` (HMAC verification already enforced, §14.3).
2. **WhatsApp**: create the Meta app, set `WHATSAPP_MODE=real` + `META_ACCESS_TOKEN` + `META_PHONE_NUMBER_ID`; register `https://<host>/webhooks/whatsapp` with `META_VERIFY_TOKEN`; pre-approve the order templates used outside the 24h window (§12.4).
3. **Images**: set `IMAGES_MODE=cloudinary` + `CLOUDINARY_URL` and re-seed/replace product image seeds with hosted URLs.
4. **Secrets**: set a strong `JWT_SECRET` and change `OWNER_PASSWORD`.
5. **Database**: swap the SQLite datasource for Postgres in `schema.prisma` if scaling beyond one instance; the session store can move to Redis via `REDIS_URL`.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Admin shows login loop | JWT expired or `JWT_SECRET` changed: log in again; token lives in `localStorage['rd-admin-token']` |
| No realtime toasts | WS blocked: frontends fall back to polling (15–30 s); check `?channel=` param |
| 409 on checkout | `DUPLICATE_SUSPECT` (recent order from same phone, §14.5) or `SOLD_OUT` race (§4.2) |
| `already_shipped` on address edit | Expected guard: addresses are locked after shipping (§7.6) |
| Tests flaky on ports | Suite boots its own server on an ephemeral port; ensure port 4000 isn't required to be free |
