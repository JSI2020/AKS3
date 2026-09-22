# AKS — Full Production Readiness Audit

**Date:** 2026-09-15 (remediation pass same day)  
**Mode:** Audit + soft-launch remediation  
**Standard:** A real customer can discover, buy, pay, track, and receive; the atelier can operate that order end-to-end without repairing the system by hand.

**Overall verdict: GO for soft launch — standard-size RTW + full COD + email notify + AWB tracking.** Live-verified 2026-09-16: HTTP 84/84, Playwright COD place `AKS-2026-00006`, worker `order.transitioned` SENT. See `LIVE_TESTING_EXECUTION_REPORT.md` + `SOFTWARE_QUALITY_SECURITY_AUDIT.md`. Keep the outbox worker running on the live host. Real AKS photography, WhatsApp, and online payment rails are deferred (flags ready). Not ready to claim MTM-primary, live card/Raast checkout, or courier-API shipping. Fix High security items (OTP TTL, track lockout, JWT 2FA update, asset serve) in the first hardening sprint.

Sources audited: Brand Foundation, Brand Concept Roadmap, Admin Redesign HTML, codebase (shop, admin, schema, worker, payments, messaging).

---

## A. Executive Summary

What is wrong with AKS today is not that screens are missing. The app is a **large, real system** with Postgres-backed catalog, cart, checkout, order transitions, RTW + fabric inventory, production board, finance, CMS, and AI studio.

### Soft-launch remediation (same day) — closed for COD path

Earlier findings below that said “no AWB”, “confirmation stub”, “shipping hardcoded 0”, “COD double-book”, “price diverge”, and “brand vs RTW conflict” were **fixed** for the RTW + full-COD launch. Remaining open items: **real photography**, **live worker on host**, **WhatsApp**, **online pay**.

### Historical findings (context; many remediated)

1. **Brand vs product conflict (was P0).** Brand Foundation historically said MTM-primary; live storefront is **standard sizes only**. Resolved for soft launch by **ADR-0015** (RTW first; MTM later).

2. **Payments half-wired (accepted for launch).** Safepay adapter exists; soft launch uses **FULL_COD only**. Online rails stay behind `AKS_PAY_*`.

3. **Money integrity (remediated).** COD balance from ledger — no double-book path.

4. **Messaging delivery-fragile (ops).** Email path works with Resend + worker; WhatsApp still optional/separate.

5. **Ops edges (mostly remediated).** AWB on dispatch; cut metres + lot override in admin; fabric PO still light.

6. **Storefront trust (remediated for launch).** Price resolver unified; confirmation loads order; guest email required; shipping from site settings; temp Unsplash merch until real shots.

7. **Docs/stack drift.** `.cursorrules` mentions Redis + BullMQ; runtime jobs remain a **Postgres outbox poller**.

**Soft-launch (RTW + full COD) is code-ready** when: `COMING_SOON` off, RTW + fabric lots seeded, Resend + worker running, temp or real merch photos live. Online rails stay behind `AKS_PAY_*`. **Do not claim** MTM-default, live Safepay/JazzCash/EasyPaisa checkout, BullMQ, WhatsApp Meta templates, or courier-API tracking until those are real.

---

## B. Architecture Map

```text
Browser
  ├─ Storefront (Next.js App Router + next-intl, en only)
  │    pages → modules/shop|catalog|cart|checkout|account
  │    anon cookie aks_anon → carts
  └─ Admin (Auth.js JWT + RBAC)
       pages → modules/orders|production|inventory|money|content|…

API routes: Auth.js, OTP, assets (R2/local), search, Safepay webhook

Postgres (Drizzle)
  catalog · inventory (rtw_stock + fabric_lots) · orders · payments
  production · messaging · platform.outbox · identity · content · …

Worker (long-lived Node)
  polls outbox → email / WhatsApp / order.transitioned / AI / tryon / asset purge

External (env-gated)
  Resend · WhatsApp Cloud · Safepay (webhook only today) · R2/MinIO · fal · DeepSeek
```

**Not present despite docs:** Redis, BullMQ.

---

## C. Business Flow Map (actual implementation)

```text
CUSTOMER browse (CMS/DB designs)
  → PDP STANDARD size + colourway (RTW stock gate)
  → cart (Postgres)
  → checkout guest/login → placeOrder
  → DRAFT → AWAITING_DEPOSIT (RTW reserved)
  → bank transfer receipt OR (future) Safepay
  → DEPOSIT_PAID (admin verify / webhook)
  → MEASUREMENTS_CONFIRMED  ← fabric lock + production jobs
       (name is MTM-era; used for RTW production gate)
  → CUTTING → STITCHING → EMBROIDERY? → FINISHING → QC
  → READY_TO_SHIP → DISPATCHED (RTW consumed) → DELIVERED → COMPLETED
  → customer track / account (+ email/WA if worker+providers live)
```

**Differs from conceptual MTM map:** customer measurement entry is **retired**; “measurements confirmed” is an **admin production gate**, not a customer tape measure step. Fabric allocation is **automatic FIFO**, not operator-picked. Shipping is **status-only**, no courier API.

---

## D. Data Model Map (high level)

| Domain | Tables / ownership |
|--------|-------------------|
| Product | `designs`, `colourways`, renders, house collections, content CMS |
| Fabric | `fabrics`, `fabric_lots`, reservations, consume at cutting |
| RTW stock | `rtw_stock` / movements — sell gate |
| Cart | `carts`, `cart_lines` (sizeMode STANDARD \| MADE_TO_MEASURE) |
| Order | `orders`, `order_items` (immutable snapshots), `order_events` via `transition()` |
| Payment | `payments`, `order_payments`, COD remittances, refunds |
| Production | `production_jobs`, events, qc_checks, rework (UI thin) |
| Customer | users + profiles, measurement profiles (latent), addresses |
| Platform | `outbox`, `assets`, `audit_logs` |

**Snapshots on orders are immutable** (aligned with project rules). Historical orders should survive catalog edits if placement path is used correctly.

---

## E. Production Readiness Matrix

| Area | Feature | FE | BE | DB | Integration | UX | Status | Priority | Finding |
|------|---------|----|----|----|-----------|-----|--------|----------|---------|
| Product philosophy | MTM vs RTW story | RTW | MTM latent | Both | — | Conflict | 🔴 | P0 | Docs vs code vs brand.mdc disagree |
| Catalog | Browse / collections / PDP | ✓ | ✓ | ✓ | — | Partial | 🟡 | P1 | Placeholders if CMS empty; brand copy risks |
| Pricing | Shade/PDP vs cart | Bug | Cart ignores shade base | ✓ | — | Trust | 🔴 | P0 | Display vs charged price can diverge |
| Size | XS–XL RTW | ✓ | ✓ | Charts | — | OK | 🟢 | — | Measure route retired |
| MTM flow | Customer measure | Redirect | Latent | Present | — | Absent | 🔴 | P0* | *Blocked by product decision, not missing code |
| Cart | Persist / merge | ✓ | ✓ | ✓ | — | Drawer only | 🟢 | P3 | No `/cart` page |
| Checkout | Address / plans | ✓ | ✓ | ✓ | — | Stale MTM copy | 🟡 | P1 | Guest email optional |
| Pay | Bank transfer | ✓ | ✓ | ✓ | Bank env | Manual | 🟡 | P0 | Soft-launch path |
| Pay | Safepay checkout | ✗ | Adapter | ✓ | Webhook | — | 🔴 | P1 | Zero customer callers |
| Pay | COD balance ledger | ✓ | Bug | ✓ | — | — | 🔴 | P0 | Double-book risk |
| Orders | Transition machine | ✓ | ✓ | Events | Outbox | — | 🟢 | — | Solid core |
| Production | Kanban | ✓ | ✓ | Jobs | Sync | Partial | 🟡 | P1 | QC UI missing; early CUTTING jobs |
| Fabric | Allocate / consume | Auto | ✓ | Lots | — | No lot pick/PO | 🟡 | P1 | Scale ops in Excel |
| Inventory | RTW units | ✓ | ✓ | ✓ | — | — | 🟢 | — | Must seed for launch |
| Messaging | Status email/WA | Track UI | Outbox | Templates | Resend/WA | Env | 🟡 | P0 | Worker + keys required |
| Shipping | Courier / AWB | ✗ | Status only | No AWB | ✗ | Manual | 🔴 | P1 | WhatsApp/Excel |
| Auth admin | OTP + 2FA + RBAC | ✓ | ✓ | ✓ | — | — | 🟢 | — | Harden NODE_ENV |
| Auth customer | OTP / WA / OAuth | ✓ | ✓ | ✓ | Env | — | 🟡 | P2 | WA/OAuth gated |
| Content | Homepage / pages | ✓ | ✓ | ✓ | — | Placeholders | 🟡 | P1 | Seed CMS for launch |
| Insights / Today | Attention cards | ✓ | Live queries | ✓ | — | One dead link | 🟢 | P2 | `awaitingReview` ignored |
| AI Studio | Photoreal / try-on | ✓ | fal | ✓ | Keys | Merch only | 🟡 | P3 | Not fulfilment-critical |
| Infra | Outbox worker | — | Poller | Outbox | — | Ops | 🟡 | P0 | Must run in prod |
| Infra | Redis/BullMQ | — | Unused | — | — | Docs lie | 🔴 | P2 | Fix docs or remove |
| i18n | Urdu locale | en only | Schema ur | — | — | — | 🟡 | P2 | `ur.json` removed |
| Gate | COMING_SOON | Holding | Middleware | — | — | Ready | 🟢 | P0 | Must unset to open shop |

Legend: 🟢 READY · 🟡 PARTIAL · 🔴 BLOCKED

---

## F. Top 50 Problems

### Product & philosophy
| ID | Problem | Why it matters | Where | Priority | Solution |
|----|---------|----------------|-------|----------|----------|
| P01 | MTM-primary brand vs RTW-only shop | False promise / wrong roadmap | Brand docs vs PDP / measure redirect | P0 | **Decide** launch model; sync Foundation, Roadmap, brand.mdc, copy |
| P02 | Latent MTM API with UI retired | Confusion, accidental MTM orders | cart/checkout/admin filters | P1 | Gate API or re-enable intentional MTM |
| P03 | `madeToMeasureOffered` defaults true | Admin/product mismatch | `catalog.ts` | P2 | Default false for RTW launch |
| P04 | Status name `MEASUREMENTS_CONFIRMED` for RTW | Operator confusion | Order machine | P2 | Relabel UI “Size confirmed / ready to cut” |
| P05 | Checkout copy still describes MTM deposits | Trust | `payment-step.tsx` | P1 | RTW-accurate copy |

### Pricing & catalog
| ID | Problem | Why | Where | Pri | Solution |
|----|---------|-----|-------|-----|----------|
| P06 | PDP vs cart price formula diverge | Wrong charged price | configurator vs `compute-unit-price` | P0 | Single price resolver; tests |
| P07 | Cards use design base not shade | Misleading list price | `design-card` | P1 | Shade-aware card price |
| P08 | Customizations loaded, never sold | Dead merch | configurator | P2 | Remove or wire UI |
| P09 | No qty UI (always ~1) | Friction | PDP | P3 | Qty control or hide state |
| P10 | SVG / “set in admin” placeholders | Looks unfinished | home/gallery | P1 | Require hero + PDP assets before publish |
| P11 | Forbidden brand phrases in messages | Brand violation | `en.json` HomeProto/ShopShell | P1 | Rewrite per Foundation |
| P12 | WHITE_COLLECTION door hard-labeled Signature | Merch error | `home-page.tsx` | P2 | CMS-driven labels |

### Cart / checkout / customer
| ID | Problem | Why | Where | Pri | Solution |
|----|---------|-----|-------|-----|----------|
| P13 | Guest email optional vs track needs email | Dead-end tracking | checkout + track | P0 | Require email or WhatsApp track |
| P14 | Confirmation page no DB order | Stub UX | confirmation page | P0 | Load order; show pay state |
| P15 | Shipping/tax hardcoded 0 | Wrong economics | checkout actions | P1 | Rules or explicit free-ship promise |
| P16 | No dedicated cart page | Discoverability | — | P3 | Optional `/cart` |
| P17 | Guest↔account order linking gaps | History missing | customer queries | P1 | Link by WhatsApp/email on login |

### Payments
| ID | Problem | Why | Where | Pri | Solution |
|----|---------|-----|-------|-----|----------|
| P18 | Safepay never started from checkout | No online pay | payments module | P1 | Wire `createSafepayCheckout` post-place |
| P19 | COD trusts stale `balanceAmountMinor` | Double-book | orders actions + COD | P0 | Net balance from ledger |
| P20 | Safepay failure events not persisted | Ops blind | webhook | P1 | Write FAILED payment rows |
| P21 | Balance Safepay doesn’t update order columns | Ledger drift | handle-webhook | P1 | Update paid/balance fields |
| P22 | Payment outbox topics without handlers | Dead letters | worker | P1 | Register or stop enqueue |
| P23 | JazzCash/EasyPaisa enum-only | False expectation | schema | P3 | Hide until adapters exist |

### Orders / production / fabric
| ID | Problem | Why | Where | Pri | Solution |
|----|---------|-----|-------|-----|----------|
| P24 | Dual advance order vs kanban | Desync | production + orders | P1 | Single write path or sync guards |
| P25 | Jobs created already in CUTTING | Board noise | create-jobs | P1 | Start PENDING until cut begins |
| P26 | Actual cut metres not in UI | Wastage blind | advanceStageAction | P1 | Capture metres on cut |
| P27 | QC/rework/block UI missing | Fail path offline | production | P1 | Surface existing actions |
| P28 | No lot picker | Wrong cloth risk | allocateFabric | P2 | Optional override |
| P29 | No fabric PO admin | Purchasing in Excel | inventory schema only | P2 | PO receive UI |
| P30 | Confirm measurements one-click | Weak for true MTM | order detail | P2 | Edit/verify if MTM returns |

### Shipping / messaging / sync
| ID | Problem | Why | Where | Pri | Solution |
|----|---------|-----|-------|-----|----------|
| P31 | No AWB / tracking number fields | Customer “where is it?” | orders | P1 | Fields + show on track |
| P32 | No courier API | Manual booking | — | P2 | Phase later; capture AWB first |
| P33 | WhatsApp/email log-only without keys | Fake “SENT” | providers | P0 | Fail loud or require keys in prod |
| P34 | WA free-text outside 24h window fails | Missed updates | whatsapp provider | P1 | Approved templates map |
| P35 | Worker not documented as hard dependency | Silent stalls | ops | P0 | Deploy checklist + health |

### Admin / content / auth / infra
| ID | Problem | Why | Where | Pri | Solution |
|----|---------|-----|-------|-----|----------|
| P36 | Overview designs deep link ignores filter | Wasted click | designs catalog | P2 | Honor `awaitingReview` |
| P37 | Staff OTP TTL 24h | Security | otp | P2 | Shorten in prod |
| P38 | `devCode` if NODE_ENV wrong | Auth bypass | OTP routes | P0 | Deploy guard / refuse |
| P39 | Redis/BullMQ in rules but unused | Wrong ops plan | docs | P2 | Align docs to outbox |
| P40 | RHF/Zod claimed, not installed | Drift | package.json | P3 | Install or fix rules |
| P41 | Urdu locale removed | Roadmap Gap | i18n | P2 | Re-add when ready |
| P42 | COMING_SOON left on | Shop invisible | middleware | P0 | Unset for launch |
| P43 | AI_GENERATION_MOCK in prod risk | Fake images | tryon/ai | P1 | Block mock in production |
| P44 | Bolt/ mock admin in repo | Confusion | `Bolt/` | P3 | Keep out of deploy |
| P45 | Payment step MTM surcharge language | Confusion | checkout | P1 | With P05 |
| P46 | Content CMS pages seed “coming soon” | Dead legal pages | content seed | P1 | Ship shipping/returns copy |
| P47 | Footer legacy “Demo” strings | Unprofessional | unused en keys | P3 | Clean messages |
| P48 | Insights/Today label ≠ status names | Ops training | today queries | P3 | Align glossary |
| P49 | Photoreal spend vs fulfilment priority | Distraction | — | P3 | Merch track, not launch blocker |
| P50 | No automated E2E journey in CI for buy→cut→ship | Regressions | CI | P1 | Playwright happy path |

---

## G. UX Audit (Customer)

**Voice:** Friend who sews — specific, second person, no “luxury/elevated.” Several HomeProto/ShopShell strings still read like generic fashion marketing (“East meets West”, luxury-adjacent). Fix before launch.

**Journey:** Browse→size→cart→checkout is usable for RTW. Trust breaks at **price consistency**, **confirmation stub**, **payment story** (bank-only), and **tracking without email**.

**MTM philosophy:** Structure does **not** prove “custom is default” — size chart is primary; measure path removed. Either restore MTM as primary or **rewrite Foundation soft-launch claims** to honest pret/RTW.

**Mobile:** Shop-proto has 900px breakpoints, drawer, touch targets; size guide scrolls horizontally. Not visually audited in browser this pass — recommend device QA on PDP + checkout.

**Visual:** Quiet Luxury storefront tokens under `.shop-proto` vs admin six-colour chrome — keep separated. Placeholders and slot tags make merchandising look unfinished.

---

## H. Admin Audit

**Needs you now:** Real Drizzle counts — not a static mock. One broken deep link (`awaitingReview`).

**20-order day:** Operators **can** verify deposit → confirm → allocate fabric (auto) → advance production → pack/print → record money. They **still need** WhatsApp/Excel for courier AWB, supplier POs, cut wastage, QC fails, and customer chat if providers unset.

**Admin Redesign prototype:** Directionally matches Overview attention model; live app is indigo-ground operational UI. Studio/Photoreal are merchandising tools, not fulfilment blockers.

---

## I. Integration Audit

| Integration | Status |
|-------------|--------|
| Postgres | Required, ready |
| Outbox worker | Required for messaging/AI; must run |
| Resend | Required for real email; else log-only |
| WhatsApp Cloud | Optional; templates preferred |
| Safepay | Webhook ready; checkout initiation missing |
| R2 / MinIO | Assets |
| fal / DeepSeek | Studio / polish |
| Courier | None |
| Redis/BullMQ | Unused |

---

## J. Security Audit

**Strengths:** Passwordless; no demo OTP in prod path; admin RBAC + audit logs; OTP rate limits; Safepay HMAC + skew; track cookie HMAC; upload ownership checks.

**P0 risks:** Mis-set `NODE_ENV` exposing `devCode`; COD double-book; production messaging appearing “SENT” when only logged.

**P1/P2:** Long staff OTP TTL; XFF trust for rate limits; open OTP API POSTs (rate-limited).

---

## K. Performance Audit (likely)

Not load-tested this pass. Likely hotspots: admin Today/Insights aggregate queries; PDP image resolution; photoreal/fal generation; outbox drain under burst transitions. Soft launch volume is unlikely to stress Postgres if indexes on order status / outbox due are healthy — verify with `EXPLAIN` on Today cards before scale.

---

## L. Remediation Roadmap

```text
0. PRODUCT DECISION
   Lock: Soft launch = RTW pret (current code) OR restore MTM-primary.
   Sync Brand Foundation / Roadmap / brand.mdc / storefront copy.

1. FOUNDATION / MONEY INTEGRITY
   P19 COD ledger · P06 price resolver · P38 NODE_ENV/OTP · P33 messaging fail-loud
   P42 COMING_SOON · P35 worker deploy · seed RTW+fabric+CMS assets

2. CUSTOMER BUY PATH
   P14 confirmation · P13 email/track · P05/P11 copy · P15 shipping honesty
   Bank path polish; then P18 Safepay if needed for launch

3. ADMIN OPS EDGE
   P31 AWB fields · P26 metres UI · P27 QC UI · P24/P25 job sync
   P36 awaitingReview filter

4. FABRIC / SCALE
   P29 PO UI · P28 lot override · low-stock alerts reliable

5. INTEGRATIONS / I18N / POLISH
   Safepay balance · payment outbox handlers · Urdu · brand visual pass · E2E tests
```

**Do not** polish photoreal before P0 money + confirmation + messaging.

---

## M. Recommended Architecture Changes (only where necessary)

1. **Do not introduce Redis/BullMQ** unless outbox proves insufficient — fix documentation instead.  
2. **Single price service** shared by PDP, cart, checkout.  
3. **Balance-due = total − sum(successful payments)** everywhere (orders, COD, UI).  
4. **Product decision document** checked into `docs/` resolving MTM vs RTW for Phase 2–3.  
5. Optional later: courier adapter behind AWB fields (capture first, API second).

No big-bang rewrite recommended — the order/transition/outbox core is sound.

---

## N. Test Plan (must pass before production)

### Journey A — Customer (RTW soft launch)
1. COMING_SOON off; published design with stock + images.  
2. Home → collection → PDP → pick colourway/size → add to cart.  
3. Assert PDP price === cart === checkout total (paisa).  
4. Guest checkout **with email** → place order → confirmation shows real order.  
5. Upload bank receipt → admin verify → status DEPOSIT_PAID.  
6. Track via email OTP; account login sees order.  
7. Failure: wrong OTP, duplicate receipt, cancel before pay.

### Journey B — Admin ops
1. Confirm measurements → fabric reserved → jobs visible.  
2. Advance cutting→…→ready to ship (order + board stay aligned).  
3. Dispatch with AWB (once fields exist); customer track updates.  
4. Deliver + COD path: prepaid balance must **not** double COD.  
5. Refund/cancel releases RTW/fabric correctly.

### Journey C — Messaging
1. Worker running; Resend (and WA if used) configured.  
2. Each transition creates customer-visible message (not log-only).  
3. Outbox dead-letter alerts fire on failure.

### Journey D — Negative
Payment timeout/reject; sold-out race; insufficient fabric on confirm; unauthorized admin; expired session mid-checkout.

### Non-goals for soft launch
Safepay UI, Urdu locale, courier API, full MTM, photoreal perfection.

---

## Soft-launch go / no-go checklist

| Must be true | Status today |
|--------------|--------------|
| Product story RTW vs MTM decided & copy aligned | ✅ ADR-0015 |
| Price single source of truth | ✅ |
| Soft launch pay = full COD (online gated) | ✅ |
| COD ledger safe | ✅ |
| Email notify + Resend + branded templates | ✅ |
| Worker process (local/compose ready; keep on in prod) | ⚠️ Ops |
| RTW + fabric seeded; CMS launch copy | ✅ |
| Temp merch photos for QA (replace with real AKS later) | ✅ Temp |
| Confirmation + track with email | ✅ |
| AWB on dispatch + customer track | ✅ |
| Cut metres UI · lot override · manual COD default | ✅ |
| Playwright smoke (`npm run test:e2e`) | ✅ (webServer boots `next dev`) |
| Real AKS photography | ❌ Owner later |
| WhatsApp Meta templates | ❌ Separate track |
| Online payment rails live | ❌ Later (flags ready) |

### Soft-launch remediation completed (same day)

- ADR-0015 RTW-only; brand rules + storefront copy aligned  
- Checkout = `FULL_COD` only; online providers gated  
- AWB required on dispatch; shown on customer track + email  
- Shipping from site settings (Pakistan free / honest fee)  
- Launch seed + temp Unsplash merch for QA  
- Branded email templates; worker seeds on boot  
- Cut metres UI · fabric lot override · manual order FULL_COD  
- `AKS_ALLOW_DEV_OTP` never in production · compose includes `worker`

---

## Appendix — Evidence pointers

- MTM retired: `app/[locale]/(shop)/designs/[slug]/measure/page.tsx`, `modules/catalog/design-configurator.tsx`  
- Order machine: `modules/orders/constants.ts`, `transitions.ts`  
- Soft-launch pay: `modules/checkout/payment-plans.ts` (`FULL_COD`)  
- Online rails gated: `modules/payments/methods-config.ts`  
- Jobs: `worker/index.ts` (outbox, not BullMQ) · `docker-compose.yml` `worker`  
- Gate: `middleware.ts` `COMING_SOON`  
- Brand: `docs/decisions/ADR-0015-rtw-launch.md` · `.cursor/rules/aks-brand.mdc`  
- E2E: `e2e/soft-launch-smoke.spec.ts` · `playwright.config.ts`

*Remediation for soft-launch COD path is done in code. Remaining work is owner ops (photos, live worker) and later tracks (WhatsApp, online pay).*
