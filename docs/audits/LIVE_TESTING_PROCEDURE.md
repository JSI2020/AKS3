# AKS — Exhaustive Live Testing Procedure

**Date:** 2026-09-16  
**Scope:** Every storefront route, admin route, and cross-pipeline from catalogue → order → production → dispatch → customer track. Soft-launch mode = RTW STANDARD + FULL_COD + email notify. Online pay rails gated (document only; do not require live KYB).  
**Sources of truth:** `app/(admin)/`, `app/[locale]/(shop)/`, `modules/*/actions.ts`, `modules/orders/constants.ts`, `modules/production/constants.ts`, `worker/index.ts`.  
**Pass criteria:** Expected HTTP/UI outcome, no uncaught 500, permission gates hold, inventory/money side effects match transition docs.  
**Environment:** `COMING_SOON=0`, app + `npm run worker:dev`, DB migrated + launch-seeded, Resend optional (email SENT vs log-only noted).

---

## 0. Preconditions

| # | Check | How |
|---|-------|-----|
| 0.1 | Postgres up + migrations | `npm run db:migrate` |
| 0.2 | Soft-launch seed | `npm run db:seed:launch` (or prior seed) |
| 0.3 | App | `COMING_SOON=0 npm run dev` → `/` 200 |
| 0.4 | Worker | `npm run worker:dev` → "outbox polling" |
| 0.5 | Staff account | Owner/admin can request OTP at `/admin/login` |
| 0.6 | RTW stock > 0 | Admin inventory designs or seed |
| 0.7 | Dev OTP only non-prod | `AKS_ALLOW_DEV_OTP≠0` locally; never in production |

Record: Date/time, commit SHA, BASE_URL, worker PID, tester.

---

## 1. Storefront — route smoke (every page)

For each URL: open → expect 200 (or documented redirect) → body visible → no Next error overlay.

| ID | URL | Expect |
|----|-----|--------|
| S-01 | `/` | Home sections render |
| S-02 | `/collections` | Collections hub |
| S-03 | `/collections/essentials` | PLP |
| S-04 | `/collections/tailored` | PLP |
| S-05 | `/collections/occasion` | PLP |
| S-06 | `/collections/signature` | PLP |
| S-07 | `/collections/separates` | PLP |
| S-08 | `/collections/all` | All published |
| S-09 | `/collections/new` | New arrivals |
| S-10 | `/collections/best-sellers` | Ranking PLP |
| S-11 | `/search?q=kurta` | Results or empty state |
| S-12 | `/size-guide` | XS–XL charts |
| S-13 | `/fabrics` | Fabric library |
| S-14 | `/wishlist` | Client wishlist UI |
| S-15 | `/pages/faq` | CMS page (if seeded) |
| S-16 | `/pages/shipping-returns` | CMS |
| S-17 | `/pages/privacy-terms` | CMS |
| S-18 | `/pages/atelier` | CMS |
| S-19 | `/pages/construction` | CMS |
| S-20 | `/checkout` empty | Redirect `/` |
| S-21 | `/account/login` | OTP form |
| S-22 | `/account/orders` unsigned | Sign-in CTA |
| S-23 | `/designs/[slug]/measure` | Redirect to PDP |
| S-24 | `/api/health` | Healthy JSON |
| S-25 | `/api/search?q=a` | JSON results |

**PDP discovery:** From S-03 pick first product link → `S-PDP-01` `/designs/{slug}` loads; size picker; sold-out disabled; add to cart.

---

## 2. Storefront — cart & COD checkout pipeline

| ID | Step | Expect |
|----|------|--------|
| C-01 | Add STANDARD in-stock size | Cart drawer qty ≥ 1 |
| C-02 | Change qty / remove / re-add | Totals update via `<Money>` |
| C-03 | Checkout address (PK province, phone, guest email) | Validation errors on empty |
| C-04 | Payment step | FULL_COD only when `AKS_PAY_*=0` |
| C-05 | Review + place | Redirect `confirmation?order=AKS-…` |
| C-06 | Confirmation | Order number, status DEPOSIT_PAID, Track link |
| C-07 | Cart emptied | Drawer empty / CONVERTED |
| C-08 | Outbox | `order.transitioned` → `message.send` (worker) |
| C-09 | Track gate | `/track/{order}` asks email OTP |
| C-10 | Track after OTP | Timeline; AWB empty until dispatch |
| C-11 | Discount code (if any active) | Applies or clear error |
| C-12 | Sold-out size | Cannot add |
| C-13 | Customer login OTP | `/account/login` → `/account/orders` |
| C-14 | Guest order attach | Same email → order listed after login |
| C-15 | `/checkout/pay` with COD order | Redirect confirmation (online off) |

---

## 3. Admin — auth & shell

| ID | Step | Expect |
|----|------|--------|
| A-01 | `/admin/login` | OTP form |
| A-02 | Request OTP | Email / worker / `devCode` non-prod |
| A-03 | Wrong OTP | Reject; rate limit after N |
| A-04 | Correct OTP | Enter protected shell |
| A-05 | `/admin` Overview | Cards load (TAILOR → production) |
| A-06 | Nav permission hide | Role without `orders.view` hides Sell→Orders |
| A-07 | Sign out | Back to login |

---

## 4. Admin — every route HTTP smoke

Open each route authenticated; expect 200 or intentional redirect (not 500).

### Sell
`/admin/orders`, `/admin/orders/new`, `/admin/orders/{id}`, `/admin/orders/{id}/invoice`, `/admin/orders/{id}/packing-slip`, `/admin/customers`, `/admin/customers/{userId}`, `/admin/customers/guest/{wa}`, `/admin/customers/merge`, `/admin/customers/subscribers`, `/admin/discounts`, `/admin/content`, `/admin/content/homepage`, `/admin/content/pages`, `/admin/content/lists`, `/admin/content/nav`, `/admin/content/collections`, `/admin/content/settings`, `/admin/content/announcements` → storefront settings redirect

### Make
`/admin/production`, `/admin/production/{jobId}/spec`, `/admin/inventory`, `/admin/inventory/designs`, `/admin/inventory/designs/{designId}`, size ledger, `/admin/inventory/fabrics` (+ fabric/colour), `/admin/inventory/packing`, `/admin/inventory/trims` (+ detail)

### Create
`/admin/fabrics`, `/admin/fabrics/new`, `/admin/fabrics/{id}`, `/admin/designs`, `/admin/designs/new`, `/admin/designs/{id}`, `/admin/studio`→designs, `/admin/studio/ai`, `/admin/studio/{id}` (+ inputs/angles/colourways/sizing/publish), `/admin/photoreal`, `/admin/photoreal/gallery`, `/admin/photoreal/{id}`

### Money / Insights
`/admin/finance`, `/admin/money`→finance, `/admin/payments/cod`→finance?tab=cod, `/admin/payments/verification`→verify, `/admin/tryon`, `/admin/insights`

### Settings
`/admin/settings`, staff (+ detail), roles, storefront, studio, sizing categories/blocks/fit-profiles/archetypes/custom-limits (+ new/id), chart (+ grid/styles/templates/recognition/fit-events)

### Utility
`/admin/tokens`, `/admin/assets-test`, `/admin/2fa`

---

## 5. Cross-pipeline — web COD order fulfilment

| ID | Actor | Action | Expect |
|----|-------|--------|--------|
| P-01 | Customer | Place FULL_COD | Status `DEPOSIT_PAID`; RTW reserved |
| P-02 | Admin | Open order detail | Lines, money, status correct |
| P-03 | Admin | Confirm size / measurements | → `MEASUREMENTS_CONFIRMED`; jobs created |
| P-04 | Admin | Optional lot override | Preferred lot used |
| P-05 | Admin | Advance → CUTTING + actual metres | Status CUTTING; fabric consume path |
| P-06 | Production board | Start job / advance stages | Job stages sync order (CUTTING…PACKED) |
| P-07 | QC fail rework | Record QC fail | Job returns allowed stage |
| P-08 | QC pass → PACKED | All packed | Order `READY_TO_SHIP` |
| P-09 | Dispatch without AWB | Blocked | Error |
| P-10 | Dispatch with courier+AWB | `DISPATCHED` | RTW consumed; email; track shows AWB |
| P-11 | Delivered → Completed | Status path | COD remittance eligible |
| P-12 | Customer track | Timeline matches | Email templates fired per stage |

---

## 6. Cross-pipeline — manual order CRM

| ID | Step | Expect |
|----|------|--------|
| M-01 | `/admin/orders/new` | Form loads designs |
| M-02 | Place WhatsApp source STANDARD FULL_COD | Order created DEPOSIT_PAID |
| M-03 | Same fulfilment as §5 | Jobs + dispatch |

---

## 7. Inventory pipelines

| ID | Step | Expect |
|----|------|--------|
| I-01 | RTW receive / adjust | Ledger row; stock delta |
| I-02 | Fabric lot receive | Lot AVAILABLE; MATERIALS expenditure |
| I-03 | Packing create + movement | Ledger |
| I-04 | Trim create + movement | Ledger |
| I-05 | Cancel order post-reserve | RTW released |
| I-06 | Cancel post-confirm | Fabric released |

---

## 8. Payments / finance

| ID | Step | Expect | Soft-launch |
|----|------|--------|-------------|
| F-01 | Finance hub tabs | Overview loads | Required |
| F-02 | Record expenditure | Saved | Required |
| F-03 | COD remittance | Ledger | After delivery |
| F-04 | Bank verify/reject | Only if receipt exists | Optional (flag off) |
| F-05 | Online pay UI | Hidden when flags off | Skip live KYB |

---

## 9. Designs / fabrics / publish → storefront

| ID | Step | Expect |
|----|------|--------|
| D-01 | Create draft design | Saved |
| D-02 | Colourway + render + size block + fit | Checklist ready |
| D-03 | Publish | Storefront PLP/PDP shows |
| D-04 | Unpublish/archive | Hidden from shop |
| D-05 | Fabric CRUD + swatch | Visible `/fabrics` if published path |
| D-06 | Studio AI generate | Job outbox (needs FAL+R2) or mock |

---

## 10. Content → storefront

| ID | Step | Expect |
|----|------|--------|
| CMS-01 | Homepage hero edit + publish | `/` updates |
| CMS-02 | Nav item | Header updates |
| CMS-03 | Collection activate | Door/PLP |
| CMS-04 | Site settings shipping | Checkout shipping copy/fee |
| CMS-05 | Announcements ticker | Storefront ticker |
| CMS-06 | CMS page publish | `/pages/{slug}` |

---

## 11. Customers / discounts / messaging

| ID | Step | Expect |
|----|------|--------|
| CR-01 | Customer directory search | Results |
| CR-02 | Merge guests | Surviving record |
| CR-03 | Discount create + checkout apply | Price drop |
| CR-04 | Order messages panel | Rows; retry failed |
| CR-05 | Newsletter subscribe | Row if enabled |

---

## 12. Settings / staff / sizing

| ID | Step | Expect |
|----|------|--------|
| ST-01 | Invite staff | Outbox email |
| ST-02 | Role permission toggle | RBAC enforced on mutation |
| ST-03 | Size block edit | Size guide updates |
| ST-04 | Fit profile / category CRUD | Saves |
| ST-05 | Dress-sizing chart tools | Pages load (AI recognition ops-dependent) |

---

## 13. Photoreal / try-on / AI spend

| ID | Step | Expect |
|----|------|--------|
| AI-01 | `/admin/photoreal` | UI loads |
| AI-02 | `/admin/tryon` | Spend dashboard |
| AI-03 | Generate (live) | Needs FAL+R2 — record SKIP if unset |

---

## 14. Negative / security smoke (live)

| ID | Step | Expect |
|----|------|--------|
| N-01 | Unauth `/admin/orders` | Redirect login |
| N-02 | Customer cannot staff OTP | Rejected |
| N-03 | Bad Safepay webhook HMAC | 4xx (if endpoint hit) |
| N-04 | `/api/assets/serve?key=../.env` | Denied |
| N-05 | Empty cart checkout | Home redirect |
| N-06 | COMING_SOON=1 | Shop gated; admin open |

---

## 15. Worker / outbox

| ID | Step | Expect |
|----|------|--------|
| W-01 | Worker running | Poll log |
| W-02 | After order place | `order.transitioned` SENT |
| W-03 | Topics without handlers | `MISSING` logged (payment.*, production_job.*) — known gap |

---

## 16. Evidence pack

For each ID: PASS / FAIL / SKIP + HTTP status + screenshot or note + timestamp.  
Failures: stack, URL, order id, screenshot path.

---

## Appendix A — Order status allow-list

See `modules/orders/constants.ts` ORDER_STATUS_ALLOW (DRAFT→…→COMPLETED / CANCELLED / REFUNDED / WRITE_OFF).

## Appendix B — Production stages

CUTTING→STITCHING→(EMBROIDERY)→FINISHING→QC→PACKED; sync to order via `sync-order.ts`.

## Appendix C — Soft-launch exclusions (document, do not block GO)

Online KYB rails, WhatsApp Meta templates, real photography, courier API, customer MTM, Urdu locale.
