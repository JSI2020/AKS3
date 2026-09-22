# AKS — Live Testing Execution Report

**Executed:** 2026-09-16 (local)  
**Base URL:** `http://127.0.0.1:3000`  
**Mode:** Soft launch — RTW STANDARD + FULL_COD + email outbox  
**Procedure:** [`LIVE_TESTING_PROCEDURE.md`](./LIVE_TESTING_PROCEDURE.md)  
**App + worker:** both running (`COMING_SOON=0`, worker polling 500ms)

---

## 1. Executive verdict

| Area | Result |
|------|--------|
| Storefront HTTP smoke (all listed routes) | **PASS 84/84** (`LIVE_TEST_RESULTS.json`) |
| Playwright soft-launch smoke | **PASS 2/2** |
| Playwright live catalogue → PDP → cart → COD place → track | **PASS** (order `AKS-2026-00006`) |
| Admin unauth gate `/admin/orders` | **PASS** (307 → login) after fix |
| Security probes (unsigned Safepay, `../.env` serve) | **PASS** (400 / 404) |
| Worker outbox | **RUNNING** — `order.transitioned` SENT observed |
| Admin authenticated click-through of all 92 pages | **PARTIAL** — HTTP unauth sweep done; OTP staff session not automated in this run |
| Post-place admin advance → COMPLETED on `AKS-2026-00006` | **DEFERRED** — live DB advance script ready (`scripts/live-fulfililment-pipeline.ts`); policy blocked auto-mutation mid-run. Code path = `transition()` + order allow-list (covered by module tests + prior sessions) |

**Overall live soft-launch path:** **GO with findings** (see §5–6 and security audit).

---

## 2. Evidence artefacts

| File | Contents |
|------|----------|
| `docs/audits/LIVE_TESTING_PROCEDURE.md` | Exhaustive procedure (storefront, admin, cross-pipelines, negatives) |
| `docs/audits/LIVE_TEST_RESULTS.json` | 84 HTTP probes — all pass after orders fix |
| `docs/audits/LIVE_UI_RESULTS.json` | Playwright UI steps incl. place `AKS-2026-00006` |
| `e2e/soft-launch-smoke.spec.ts` | Home / designs / empty checkout |
| `e2e/live-full-pipeline.spec.ts` | Full browse→COD→track |
| `scripts/live-test-harness.ts` | Repeatable HTTP harness |
| `scripts/live-fulfililment-pipeline.ts` | Admin-side status advance harness (ready) |

---

## 3. Storefront results (procedure §1–2)

### 3.1 Route smoke — PASS

All of `/`, house doors, `/collections/*`, `/search`, `/size-guide`, `/fabrics`, `/wishlist`, seeded `/pages/*`, `/account/login`, `/account/orders`, `/api/health`, `/api/search` returned &lt;500 (mostly 200).

Discovered PDP slug example: `test-design-01a06108-…` / live place used `production-design-01a0a758-…`.

### 3.2 Cart → FULL_COD → confirmation → track — PASS (live)

| Step | Result | Evidence |
|------|--------|----------|
| Seed RTW | PASS | `npm run db:seed:launch` → 3701 RTW units, 0 zero bins |
| Find in-stock size | PASS | Playwright walked PDPs until enabled size |
| Add to bag | PASS | `button.addcart` enabled after size |
| Address → Payment → Review | PASS | `#recipientName`, `#phone`, `#guestEmail`, province `PUNJAB`, **Review order** |
| Place order | PASS | Landed `/checkout/confirmation?order=AKS-2026-00006` |
| Track page | PASS | `/track/AKS-2026-00006` loads (OTP gate expected for timeline detail) |

Note: `UI-addr-next` recorded false only because empty `[role=alert]` was treated as failure; place still succeeded — treat as harness noise, not product fail.

### 3.3 Empty cart checkout — PASS

Redirects to `/` (locale prefix never).

---

## 4. Admin results (procedure §3–4)

### 4.1 Bug found and fixed during live test

**Symptom:** `GET /admin/orders` → **500** while unauthenticated (and broke compile for authenticated too).

**Cause:** `modules/orders/fabric-lot-options.ts` imported `requirePermission` / DB without `"use server"`, pulled into client graph via `order-detail-view.tsx` → `server-only` in `customer-account.ts` exploded.

**Fix:** Added `"use server"` to `fabric-lot-options.ts`.

**Retest:** `GET /admin/orders` → **307** `/admin/login`. Harness **84/84**.

### 4.2 Unauth admin sweep — PASS (&lt;500)

Login, overview, customers, discounts, content*, production, inventory*, fabrics, designs, finance, insights, settings*, photoreal, tryon — all &lt;500 (redirect or login).

### 4.3 Authenticated admin mutations — PARTIAL

Staff OTP login not completed end-to-end in automation this run (email/dev OTP interactive). Procedure §5–12 remain the checklist for a staff session:

- Confirm measurements on `AKS-2026-00006`
- Production board advance / QC
- Dispatch with AWB
- Finance COD remittance after delivery
- Content/design/fabric CRUD spot checks

Worker log already shows historical `order.transitioned` SENT and `production_job.transitioned` **RETRY** (no handler — known gap).

---

## 5. Cross-pipeline matrix (live + code)

| Pipeline | Live evidence | Status |
|----------|---------------|--------|
| Publish design → storefront PDP | Catalogue + PDP HTTP | PASS |
| RTW stock gate on Add to bag | Sold-out disables; stock enables | PASS |
| Guest COD place | `AKS-2026-00006` | PASS |
| Confirmation loads order | Query `?order=` | PASS |
| Track route | Loads | PASS |
| Outbox `order.transitioned` | Worker SENT | PASS |
| WhatsApp notify | Env unset → log-only | EXPECTED |
| `production_job.transitioned` | Worker RETRY / MISSING handler | **FAIL / known gap** |
| Payment.* outbox topics | No handlers | **FAIL / known gap** |
| Online pay | Gated off | SKIP (by design) |
| Admin confirm → cut → ship | Script ready; not auto-advanced this run | PARTIAL |

---

## 6. Negatives / security live probes

| ID | Result |
|----|--------|
| N-03 unsigned Safepay webhook | **400** PASS |
| N-04 `serve?key=../.env` | **404** PASS |
| N-01 unauth admin | Redirect login PASS (after fix) |
| Absolute-path serve keys | Not fully proven safe on Windows — see security audit |

---

## 7. Defects discovered in this live pass

| Sev | Defect | Status |
|-----|--------|--------|
| **P0** | `/admin/orders` 500 — client import of server-only via fabric lot action | **FIXED** (`"use server"`) |
| **P1** | Outbox topics without handlers (`production_job.*`, `payment.*`, `inventory.low_stock`, …) → RETRY noise / dead letters | Open |
| **P2** | Playwright place-order fragile without exact button copy / seeded stock | Mitigated in e2e |
| **Info** | Vitest suite on shared DB shows FK pollution failures when deleting orders with `rtw_movements` — test isolation issue, not storefront | Open |

---

## 8. How to re-run

```powershell
$env:COMING_SOON="0"
npm run dev          # terminal 1
npm run worker:dev   # terminal 2
npm run db:seed:launch
npx tsx scripts/live-test-harness.ts
npx playwright test e2e/live-full-pipeline.spec.ts e2e/soft-launch-smoke.spec.ts --workers=1
# Optional staff fulfilment advance:
npx tsx scripts/live-fulfililment-pipeline.ts
```

---

## 9. Sign-off

Live soft-launch **customer COD path** verified end-to-end in browser against this host.  
Admin list page compile defect fixed.  
Remaining: authenticated admin checklist execution, register missing outbox handlers, replace temp merch photos, keep worker on in production.

*Companion:* [`SOFTWARE_QUALITY_SECURITY_AUDIT.md`](./SOFTWARE_QUALITY_SECURITY_AUDIT.md)
