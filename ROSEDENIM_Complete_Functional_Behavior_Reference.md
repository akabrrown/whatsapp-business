**ROSE & DENIM**  
**BY KUKUA**  
Complete Functional Behavior Reference  
_How the Live System Functions in Every Scenario_  
Prepared for: Kukua — Founder, ROSE & DENIM  
Market: Accra, Ghana  
Version 1.0 | August 2026 | Post-Launch Operating Reference

**Table of Contents**
=====================

1\. Purpose of This Document  
2\. How to Read the Scenario Tables  
3\. Discovery & Browsing Scenarios  
4\. Cart & Checkout Scenarios  
5\. Payment Scenarios  
6\. Inventory Scenarios  
7\. Delivery Address & Zone Scenarios  
8\. Order Status & Fulfillment Scenarios  
9\. Multi-Channel & Returning Customer Scenarios  
10\. Human Handoff Scenarios  
11\. Admin Action Scenarios  
12\. Messaging & Delivery-Channel Failure Scenarios  
13\. Third-Party Outage Scenarios  
14\. Security & Abuse Scenarios  
15\. Cancellation, Refund & Return Scenarios  
16\. Post-Purchase & Retention Scenarios  
17\. Master Scenario Index

**1\. Purpose of This Document**
================================

The System Workflow document describes the primary, intended path a customer and an order take through ROSE & DENIM's platform. This document goes further: it defines how the fully built system behaves in every scenario it can realistically encounter once live — the happy path, every variation of it, and every way it can go wrong.  
This is the reference to hand a new staff member, to test against before launch, and to check against whenever “what happens if…” comes up in real operation. Every row is written as a concrete, testable rule: given this trigger, the system does exactly this, and the customer sees exactly that.  
_If a real situation ever produces a result different from what's written here, that's a bug — not a grey area. This document is the definition of “correct behavior” for the finished system._

**2\. How to Read the Scenario Tables**
=======================================

Each category below is a table of individually numbered scenarios. Every scenario follows the same structure:

*   Scenario — a short name for the situation
*   Trigger — exactly what causes it (a customer action, a timeout, a webhook, an admin click)
*   System Behavior — what the backend actually does, in order
*   What the Customer Sees — the exact message or UI state shown to the customer (where relevant, to staff instead)

Scenarios are grouped by theme, not by chronological order, because real usage doesn't happen in a straight line — this reference is built to be looked up, not read start to finish.

**3\. Discovery & Browsing Scenarios**
======================================

| **#** | **Scenario** | **Trigger** | **System Behavior** | **What the Customer Sees** |
| --- | --- | --- | --- | --- |
| 1 | Normal browse | Customer opens roseanddenim.com | API returns active products with live stock; page renders grid | Product grid with images, prices, stock badges |
| 2 | All products sold out | Every product has stock\_quantity = 0 | API still returns the catalog but every card is flagged sold out | “Sold Out” badge on every item; no crash or blank page |
| 3 | Product deactivated mid-browse | Admin sets status = inactive while a customer has the page open | Product simply won't appear on the next catalog refresh | Item quietly disappears from catalog on next load; if already in cart, removed at checkout with a note |
| 4 | Slow/failed image load | Cloudinary CDN latency or a broken image URL | Frontend falls back to a placeholder image | Placeholder swatch shown instead of a broken image icon |
| 5 | Direct link to a specific product | Customer taps an Instagram/Status link to a specific SKU | Website resolves the SKU and opens the Product Detail Page directly | Product page loads directly, skipping the grid |
| 6 | Search with no results | Customer searches a term matching nothing | API returns an empty result set | “No products found — try Jeans, Bags, or Accessories” with category shortcuts |

**4\. Cart & Checkout Scenarios**
=================================

| **#** | **Scenario** | **Trigger** | **System Behavior** | **What the Customer Sees** |
| --- | --- | --- | --- | --- |
| 1 | Add to cart, in stock | Customer selects size/color and taps Add | Frontend validates against live stock; item added to local cart + Redis session | Mini-cart updates instantly with running subtotal |
| 2 | Add to cart, item just sold out | Stock hits 0 between page load and Add tap | API rejects the add with a 409 Conflict | “Sorry, this just sold out” — offers similar items |
| 3 | Cart session expires (30 min idle) | Customer leaves the tab open without action | Redis session TTL lapses; cart is cleared server-side | On return: cart appears empty; local items may still show briefly, then clear on next sync |
| 4 | Customer returns within 30 minutes | Same browser, same session ID | Redis session still valid; cart restored automatically | Cart reappears exactly as left, including quantities |
| 5 | Two browser tabs, same customer | Customer edits cart in Tab A, switches to Tab B | Each tab holds its own local state until the next server sync | Tabs can briefly disagree; next “Complete Order” sync reconciles to the server's Redis copy |
| 6 | Handoff tapped with an empty cart | Customer taps “Complete Order on WhatsApp” with 0 items | Frontend blocks the request client-side; no token is generated | Button is disabled with “Add items to your cart first” |
| 7 | Order token generated successfully | Valid cart, handoff tapped | Token created, stock soft-reserved, 15-minute TTL set, WhatsApp redirect fired | Customer is redirected into WhatsApp with a pre-filled order message |
| 8 | Customer closes WhatsApp without sending | Redirect succeeds but customer backs out | Token remains valid until its 15-minute TTL expires | If they reopen WhatsApp and send the pre-filled text within 15 min, order proceeds normally |

**5\. Payment Scenarios**
=========================

| **#** | **Scenario** | **Trigger** | **System Behavior** | **What the Customer Sees** |
| --- | --- | --- | --- | --- |
| 1 | Successful card payment | Customer completes Paystack checkout by card | charge.success webhook verified → order marked PAID, stock hard-deducted | “Payment Received!” confirmation with order number |
| 2 | Successful MoMo payment | Customer completes checkout via MTN MoMo prompt | Same as above — Paystack normalizes the channel | Identical confirmation message regardless of payment method |
| 3 | Wrong MoMo PIN entered | Customer mistypes their PIN on the USSD/MoMo prompt | charge.failed webhook received; stock reservation retained for one retry | “Your payment didn't go through. Try again here: \[fresh link\]” |
| 4 | Insufficient funds | Customer's account/wallet balance is too low | Same handling as failed charge | Same retry message; stock still held during the retry window |
| 5 | Second consecutive failure | Retry also fails | System stops offering a third auto-retry | Bot offers human assistance: “Having trouble? I can connect you with our team.” |
| 6 | Payment succeeds after token has expired | Customer pays 16+ minutes after token creation | Webhook arrives referencing an expired/released token | System still honors the payment (money was actually taken) and creates the order manually-flagged for admin review; customer gets a normal confirmation |
| 7 | Duplicate webhook delivery | Paystack retries the same charge.success event (webhooks are not guaranteed exactly-once) | System checks payments.paystack\_reference; if already recorded, the event is a no-op | Customer receives only one confirmation message, never two |
| 8 | Customer pays twice by mistake | Customer manually reopens an old payment link and pays again | Second charge.success references an order already PAID | System does not create a duplicate order; flags the extra payment for a refund and notifies Kukua |
| 9 | Refund requested and approved | Kukua approves a refund from the dashboard | System calls the Paystack refund API and updates payment\_status = refunded | “Your refund of GHS X has been processed and will reflect in 3–5 business days.” |
| 10 | Bank transfer selected | Customer chooses bank transfer on the Paystack checkout page | Same webhook-based confirmation flow, typically with longer settlement time | Bot may add: “Bank transfers can take a little longer to confirm — we'll notify you the moment it clears.” |

**6\. Inventory Scenarios**
===========================

| **#** | **Scenario** | **Trigger** | **System Behavior** | **What the Customer Sees** |
| --- | --- | --- | --- | --- |
| 1 | Normal purchase | Payment confirmed for an in-stock item | stock\_quantity decremented by the ordered quantity | No customer-visible change; next browser sees updated count |
| 2 | Last unit reserved on website | Customer generates a token for the final unit of a variant | reserved\_stock incremented; available = 0 for other website visitors | Other website visitors immediately see “Sold Out” for that variant |
| 3 | Reservation expires unpaid | 15 minutes pass with no payment | reserved\_stock decremented back to 0; item becomes available again | Item reappears as in-stock on the website for the next visitor |
| 4 | Race: website reservation vs. direct WhatsApp sale | Two customers chase the same last unit on different channels simultaneously | Whichever completes payment first gets hard-deducted stock; the reserved order is still honored if it pays within its window (see Case C, Section 7 of the Workflow document) — the later payer is refunded | Losing customer: “Sorry, we just ran out of this item. A refund has been initiated.” |
| 5 | Admin restocks mid-conversation | Kukua updates stock\_quantity from 0 to 10 while a customer is mid-chat | WebSocket event updates the website instantly; bot re-checks stock on the customer's next message | Bot: “Good news — this is back in stock!” if the customer's next message references it |
| 6 | Admin manually adjusts stock down (damage, loss) | Kukua records a damaged-item adjustment | inventory\_logs entry created with change\_type = adjustment; stock\_quantity reduced | No customer-facing message; purely an internal record |
| 7 | Low-stock threshold crossed | stock\_quantity drops to or below low\_stock\_threshold | Restock alert triggered to admin dashboard/notification | Kukua sees a “Low Stock” badge; customers see no difference until it truly hits 0 |

**7\. Delivery Address & Zone Scenarios**
=========================================

| **#** | **Scenario** | **Trigger** | **System Behavior** | **What the Customer Sees** |
| --- | --- | --- | --- | --- |
| 1 | Known zone typed clearly | “East Legon, Accra” | Matched against the delivery\_zones table; fee applied automatically | “Delivery to East Legon, Accra: GHS 25” shown in the order summary |
| 2 | Location pin shared instead of text | Customer shares a WhatsApp location pin | Reverse-geocoded to the nearest known zone | Same fee summary shown; if ambiguous, bot confirms the area with the customer first |
| 3 | Address outside defined zones | Customer is outside Accra or in an unmapped area | No automatic fee match; flagged for manual quote | “This is outside our standard delivery zones — Kukua will confirm your delivery fee shortly” + human handoff |
| 4 | Unrecognizable address text | Gibberish or incomplete address | Geocoding/regex match fails | “I couldn't recognize that address. Please send it as: \[Area\], \[City\]” |
| 5 | Customer changes address after payment | Customer messages a new address post-payment, pre-shipping | Requires manual admin update; not auto-applied to avoid fraud/fee mismatches | Bot: “I'll get Kukua to update that for you” — human handoff triggered |
| 6 | Customer changes address after shipping | Order already marked SHIPPED | System does not allow automatic address edits post-dispatch | Bot explains the order is already with the rider and offers to relay a message to them via Kukua |

**8\. Order Status & Fulfillment Scenarios**
============================================

| **#** | **Scenario** | **Trigger** | **System Behavior** | **What the Customer Sees** |
| --- | --- | --- | --- | --- |
| 1 | Normal pack → ship → deliver | Kukua clicks each status button in order | Status transitions PAID → PACKED → SHIPPED → DELIVERED; each triggers a customer template message | Customer gets a message at each stage automatically |
| 2 | Rider fails to deliver (customer unreachable) | Rider cannot reach the customer at the address | Kukua/rider logs a failed-delivery note; order stays SHIPPED | Bot follows up: “Our rider tried to reach you — when's a good time to try again?” |
| 3 | Customer refuses delivery | Customer declines the package on arrival | Kukua marks the order CANCELLED with a return-to-sender note; refund process initiated | “Your order has been cancelled and a refund of GHS X is being processed.” |
| 4 | Wrong item packed | Staff error caught before dispatch | Kukua can revert PACKED → PAID to re-pack; no customer message sent unless delay is significant | Silent correction if caught quickly; “Slight delay in preparing your order” if it affects timing |
| 5 | Rider reassigned mid-delivery | Original rider unavailable; Kukua reassigns | orders.rider\_name / rider\_phone updated | “Slight update — your order is now with \[new rider\], contact: \[number\]” |
| 6 | Order stuck in PACKED for 24+ hours | No shipping action taken | System can flag stale packed orders on the dashboard (operational alert, not automatic customer message) | Kukua sees a “Packed > 24h” flag on the Orders page |

**9\. Multi-Channel & Returning Customer Scenarios**
====================================================

| **#** | **Scenario** | **Trigger** | **System Behavior** | **What the Customer Sees** |
| --- | --- | --- | --- | --- |
| 1 | Browses website, orders via WhatsApp | Standard token handoff | Order tagged source: website | Normal confirmation flow |
| 2 | Messages WhatsApp directly, never visits site | Direct chat from the start | Order tagged source: whatsapp\_direct | Menu-driven flow (Section 4 of the Workflow document) |
| 3 | Returning customer, new order | Existing phone number places a second order | customers.total\_orders and total\_spent increment; repeat-buyer tag applied | Bot may personalize: “Welcome back!” if template messaging allows |
| 4 | Customer switches from website cart to direct chat mid-decision | Starts a cart on the site, then just messages the WhatsApp number directly instead of using the handoff button | Two independent flows — the abandoned website cart simply expires after 30 minutes with no order created; the direct chat proceeds normally | No conflict; customer experiences it as one continuous conversation once in WhatsApp |
| 5 | Same customer, two devices | Orders from phone, later messages from a tablet also logged into WhatsApp Web | Both route to the same WhatsApp number/conversation thread — no duplication risk | Conversation history is continuous regardless of device |

**10\. Human Handoff Scenarios**
================================

| **#** | **Scenario** | **Trigger** | **System Behavior** | **What the Customer Sees** |
| --- | --- | --- | --- | --- |
| 1 | Customer explicitly asks for a human | “Can I speak to someone” / “agent” / “manager” | Immediate handoff; bot pauses for that conversation | “Let me get Kukua for you. She'll reply shortly.” |
| 2 | Repeated unrecognized messages | 3 consecutive messages the bot can't interpret | conversations.status = NEEDS\_HUMAN; dashboard alert pushed | Same handoff message shown after the 3rd failure |
| 3 | Voice note sent | Customer sends audio instead of text | Bot cannot parse audio content; auto-handoff | “I can't listen to voice notes yet — let me get Kukua to help.” |
| 4 | High-value order (over GHS 1,000) | Cart/order total crosses the VIP threshold | Order flagged VIP; bot continues normally but alerts Kukua | No visible change to the customer unless Kukua chooses to step in personally |
| 5 | Negotiation attempt | “Can you do a discount?” / “best price?” | Handoff triggered — bot does not negotiate pricing | “Let me connect you with Kukua to sort that out.” |
| 6 | Staff takes over mid-bot-flow | Kukua clicks “Take Over” or starts typing in the Inbox | Bot stops auto-replying to that thread; all further messages route through the dashboard | Customer sees no visible difference — replies simply come from “ROSE & DENIM” as before |
| 7 | Staff resolves and releases | Kukua clicks “Release to Bot” | conversations.status reset; bot resumes automated handling from the last known order state | Bot picks up the conversation naturally, e.g. resuming an in-progress checkout |

**11\. Admin Action Scenarios**
===============================

| **#** | **Scenario** | **Trigger** | **System Behavior** | **What the Customer Sees** |
| --- | --- | --- | --- | --- |
| 1 | Add a new product | Kukua creates a product with images and variants | New row in products; appears on website and bot catalog immediately | Customers see it on next page load / next bot menu request |
| 2 | Deactivate a product | Kukua toggles status to inactive | Product hidden from catalog and bot; existing orders referencing it are unaffected | Product disappears from browse views; past order history still shows it correctly |
| 3 | Bulk stock update (new shipment arrives) | Kukua updates several SKUs at once | Each triggers its own inventory\_logs entry and WebSocket update | Website/bot reflect new stock within seconds |
| 4 | Edit a delivery zone fee | Kukua changes the East Legon fee from GHS 25 to GHS 30 | delivery\_zones updated; applies to all orders created after the change | Orders already in progress keep their original quoted fee; new orders get the new fee |
| 5 | Export orders/analytics | Kukua requests a sales report | API aggregates orders/payments data for the requested period | Downloadable report or on-screen analytics view |
| 6 | Add a second staff account | Kukua invites a staff member | New admin\_users row with role = staff; scoped permissions applied | Staff member can log in and see Orders/Inventory/Chat, but not staff management or full analytics |

**12\. Messaging & Delivery-Channel Failure Scenarios**
=======================================================

| **#** | **Scenario** | **Trigger** | **System Behavior** | **What the Customer Sees** |
| --- | --- | --- | --- | --- |
| 1 | WhatsApp message fails to send | Meta API returns an error (e.g. invalid number, rate limit) | System logs the failure and retries per Meta's guidance; does not silently drop it | If persistent, the order still exists in the dashboard so Kukua can follow up manually |
| 2 | Customer has blocked the business number | Delivery reports show messages undelivered | System flags the conversation; automated retries stop after a few attempts | Order remains visible to admin with an “undeliverable” flag for manual outreach |
| 3 | Customer's number changes (new SIM) | Old number stops responding | No automatic action — requires the customer to reach out from the new number | New conversation starts fresh; Kukua can manually link order history if the customer identifies themselves |
| 4 | Template message rejected by Meta | A message sent outside the 24-hour window uses a non-approved template | Send fails at the API level; system logs the rejection | Customer does not receive that specific automated message; falls back to a pre-approved template where available |
| 5 | Webhook delivery delayed | Meta or Paystack webhook arrives late (network delay) | System processes it whenever it arrives — all logic is idempotent and doesn't assume immediate delivery | Customer may see a short delay between paying and receiving confirmation, but never a lost order |

**13\. Third-Party Outage Scenarios**
=====================================

| **#** | **Scenario** | **Trigger** | **System Behavior** | **What the Customer Sees** |
| --- | --- | --- | --- | --- |
| 1 | Paystack is down | Payment initialization API fails or times out | System cannot generate a payment link | Bot: “We're having trouble processing payments right now — please try again shortly, or Kukua can assist.” |
| 2 | Paystack webhook delivery is delayed platform-wide | Known Paystack incident | Orders sit in RESERVED longer than usual; no data is lost, just delayed confirmation | Customer may not get instant confirmation; admin can manually verify payment via the Paystack dashboard if needed |
| 3 | Meta WhatsApp Cloud API outage | Meta platform incident | System cannot send or receive WhatsApp messages | Website remains fully browsable; the “Complete Order on WhatsApp” step simply won't complete until service resumes |
| 4 | Database temporarily unreachable | Supabase/Postgres connectivity issue | API returns errors for all reads/writes; system does not fabricate data | Website shows a maintenance/error state rather than stale or incorrect stock |
| 5 | Redis unavailable | Session/cache layer down | Cart sessions and reservations can't be tracked temporarily | Customers may need to rebuild their cart once service resumes; no payment or order data is lost since that lives in Postgres |

**14\. Security & Abuse Scenarios**
===================================

| **#** | **Scenario** | **Trigger** | **System Behavior** | **What the Customer Sees** |
| --- | --- | --- | --- | --- |
| 1 | Same phone spams token requests | More than 5 tokens requested in an hour | Rate limit triggers a 429 response; further requests blocked temporarily | “Too many order attempts — please wait a few minutes and try again.” |
| 2 | Tampered token guess | Someone tries a random/guessed order token | Lookup fails; no order data is exposed | “I couldn't find that order. Please visit our website to place a new order.” |
| 3 | Forged payment webhook | A request hits /webhooks/paystack without a valid signature | HMAC verification fails; request rejected and logged as a security event | No order is ever created or marked paid from an unverified webhook |
| 4 | Admin login from an unrecognized device (future 2FA scope) | Kukua logs in from a new device | Standard JWT auth applies now; stronger device verification is a noted future enhancement | Login proceeds if credentials are correct; flagged in the roadmap for hardening |
| 5 | Duplicate order within 10 minutes | Same phone, same items, short time window | System detects the pattern and asks for confirmation instead of silently creating a second order | “It looks like you just placed a similar order a few minutes ago — did you mean to order again?” |
| 6 | Malicious file upload attempt (future admin scope) | Non-image file uploaded via product image field | Rejected at validation — images only, max 5MB, type-checked | Admin sees an upload error; no file is stored |

**15\. Cancellation, Refund & Return Scenarios**
================================================

| **#** | **Scenario** | **Trigger** | **System Behavior** | **What the Customer Sees** |
| --- | --- | --- | --- | --- |
| 1 | Customer cancels before payment | Customer says “cancel” while order is still RESERVED | Reservation released immediately; token invalidated | “No problem, your order has been cancelled. Let us know if you'd like to start a new one!” |
| 2 | Customer cancels after payment, before packing | Refund requested while order is PAID | Requires Kukua's approval; on approval, Paystack refund is issued and stock is released back | “Your order has been cancelled and a refund is being processed.” |
| 3 | Customer requests exchange (wrong size) | Delivered order, customer wants a different size | Handled as a manual process today (Phase 1 scope) — human handoff, no automated exchange flow yet | Bot connects the customer with Kukua to arrange the exchange |
| 4 | Item damaged in transit | Customer reports damage on delivery | Human handoff; Kukua reviews and decides refund vs. replacement | “So sorry about that! Let me get Kukua to sort this out right away.” |
| 5 | Refund partially processed (multi-item order) | Customer only wants to return one item from a multi-item order | Manual partial refund handled by Kukua via Paystack dashboard; system logs it against the order | “A partial refund of GHS X for \[item\] has been processed.” |

**16\. Post-Purchase & Retention Scenarios**
============================================

| **#** | **Scenario** | **Trigger** | **System Behavior** | **What the Customer Sees** |
| --- | --- | --- | --- | --- |
| 1 | Standard 3-day check-in | 3 days after order marked DELIVERED | Scheduled job fires a template message | “Hope you're loving your new items! Any feedback for us?” |
| 2 | 2-week cross-sell | 14 days after delivery | Job selects a related category based on the purchased item | “Customers who bought jeans also loved these bags 👀” |
| 3 | 60-day win-back | No new order in 60 days since last purchase | Job sends a discount-coded template message | “We miss you! Here's 10% off your next order.” |
| 4 | Customer orders again before the win-back fires | New order placed at day 45 | The 60-day timer resets from the new order's date; no win-back sent for the old timer | No win-back message received — customer simply gets normal order confirmations |
| 5 | Customer opts out of marketing messages | Customer replies “STOP” or similar to a retention message | System tags the customer to exclude from check-in/cross-sell/win-back automation going forward | Transactional messages (order status) continue; marketing-style messages stop |

**17\. Master Scenario Index**
==============================

A quick lookup of every category in this document and how many individually defined scenarios it covers.

| **Category** | **Scenarios Covered** |
| --- | --- |
| 3\. Discovery & Browsing | 6 |
| 4\. Cart & Checkout | 8 |
| 5\. Payment | 10 |
| 6\. Inventory | 7 |
| 7\. Delivery Address & Zone | 6 |
| 8\. Order Status & Fulfillment | 6 |
| 9\. Multi-Channel & Returning Customer | 5 |
| 10\. Human Handoff | 7 |
| 11\. Admin Actions | 6 |
| 12\. Messaging & Delivery-Channel Failures | 5 |
| 13\. Third-Party Outages | 5 |
| 14\. Security & Abuse | 6 |
| 15\. Cancellation, Refund & Return | 5 |
| 16\. Post-Purchase & Retention | 5 |
| Total | 87 defined scenarios |