# AKS — Software Quality, Security & Vulnerability Audit

**Date:** 2026-09-16 (High findings remediated 2026-09-20)  
**Method:** Static code review of auth, RBAC, assets, payments, OTP, server actions + live probes (`/api/webhooks/safepay`, `/api/assets/serve`).  
**Scope:** Application code under `app/`, `modules/`, `worker/`, `auth.ts`. Secrets **values** not read; `.env.example` names only.

**Companion live results:** [`LIVE_TESTING_EXECUTION_REPORT.md`](./LIVE_TESTING_EXECUTION_REPORT.md)

### Remediation status (2026-09-20)

| ID | Status | Change |
|----|--------|--------|
| S-01 | **Fixed** | `OTP_TTL_MS` = 10 minutes |
| S-02 | **Fixed** | Track OTP failures log `${orderNumber}:${email}` |
| S-03 | **Fixed** | JWT `update` reloads 2FA flags from DB |
| S-04 | **Fixed** | `assertSafeAssetKey` path jail on serve + local disk |
| S-05 | **Fixed** | `AUTH_SECRET` + `TWO_FACTOR_ENCRYPTION_KEY` prod-required |
| Q-02 | **Fixed** | No-op outbox handlers for `production_job.*`, `payment.*`, etc. |

Medium items (S-06+) remain open for a later sprint.

---

## 1. Quality verdict

| Dimension | Grade | Notes |
|-----------|-------|--------|
| Architecture fit | **B+** | Clear module boundaries; outbox for side effects; status via `transition()` |
| Soft-launch product coherence | **A-** | ADR-0015 RTW + FULL_COD; online gated |
| Test automation | **B-** | Strong Vitest islands; E2E now covers COD place; shared-DB test isolation weak |
| Operability | **B+** | Worker required; fire-and-forget outbox topics now no-op ack |
| Security posture | **B** | High OTP/JWT/asset/env items remediated 2026-09-20; Medium remain |

**Ship soft-launch COD?** Yes, with worker + Resend. High hardening sprint complete; Medium (try-on ownership, OTP KDF, etc.) next.

---

## 2. Security findings (code-backed)

### Critical / High

| ID | Sev | Finding | Status |
|----|-----|---------|--------|
| S-01 | **High** | ~~Login OTP TTL 24h~~ → **10 min** | Remediated |
| S-02 | **High** | ~~Track OTP lockout key mismatch~~ | Remediated |
| S-03 | **High** | ~~JWT update trusted client 2FA~~ → DB reload | Remediated |
| S-04 | **High** | ~~Weak asset serve path~~ → `assertSafeAssetKey` | Remediated (serve still public-by-key; signed URLs later) |
| S-05 | **High** | ~~AUTH_SECRET soft~~ → prod required (+ TOTP key) | Remediated |

### Medium

| ID | Sev | Finding | Recommendation |
|----|-----|---------|----------------|
| S-06 | Medium | Try-on `completeUpload` without key ownership | Enforce `uploads/user|anon` prefix |
| S-07 | Medium | Safepay deposit start by `orderNumber` alone | Bind session / signed pay token |
| S-08 | Medium | Try-on session status / share IDOR risk | Bind to userId / anon cookie |
| S-09 | Medium | OTP hashed as unsalted SHA-256 of 6 digits | HMAC with `AUTH_SECRET` or slower KDF |
| S-10 | Medium | Phone OTP send inline (not outbox) in prod path | Enqueue like email |
| S-11 | Medium | `trustHost: true` | Pin `AUTH_URL` / trusted hosts in prod |
| S-12 | Medium | Admin 2FA off when `NODE_ENV !== "production"` | Force on shared staging via `AKS_ENFORCE_ADMIN_2FA` |

### Low / Info

| ID | Sev | Finding | Recommendation |
|----|-----|---------|----------------|
| S-13 | Low | Newsletter subscribe uncapped | Rate-limit |
| S-14 | Low | Track OTP may distinguish unknown email | Uniform error copy |
| S-15 | Low | Preflight only rejects `AKS_ALLOW_DEV_OTP===1` | Align with runtime (`!== "0"` in non-prod) |
| S-16 | Info | No `eval` / `dangerouslySetInnerHTML` found | Keep |
| S-17 | Info | `child_process` confined to scripts | Keep |
| S-18 | Info | Safepay webhook HMAC + skew + timingSafeEqual | Keep; tests present |
| S-19 | Info | Admin mutations generally `requirePermission` | Continue for new actions |

### Live security probes (this session)

| Probe | Result |
|-------|--------|
| `POST /api/webhooks/safepay` unsigned | **400** |
| `GET /api/assets/serve?key=../.env` | **404** |
| Unauth `/admin/orders` | **307** login (after P0 fix) |

---

## 3. Software quality findings

### 3.1 Strengths

- Money / metres as integers; order snapshots immutable copies.
- Status changes via `transition()` + event row.
- Permissions server-side; passwordless auth only.
- Checkout price / payment-plan unit tests; Safepay signature tests.
- Soft-launch payment story coherent (`FULL_COD` only when `AKS_PAY_*=0`).

### 3.2 Defects / debt

| ID | Area | Finding | Suggestion |
|----|------|---------|------------|
| Q-01 | Build | `fabric-lot-options` lacked `"use server"` → `/admin/orders` 500 | **Fixed** this session; audit other server actions imported from client |
| Q-02 | Outbox | ~~Topics without handlers~~ → no-op handlers in `worker/index.ts` | **Fixed** |
| Q-03 | Tests | Vitest deletes `orders` while `rtw_movements` FK references remain | Delete children first or use truncated test DB |
| Q-04 | Docs/stack | `.cursorrules` cites BullMQ/Redis/Zod/RHF; runtime is outbox poller; Zod not direct dep | Align docs with reality |
| Q-05 | E2E | Coverage was smoke-only; now COD place covered | Add admin OTP + advance + AWB e2e |
| Q-06 | Confirmation | Order number is capability URL (no auth) | Accept for soft launch; add short-lived token later |
| Q-07 | Wishlist | `localStorage` only | Document; or sync when account exists |
| Q-08 | Purchase orders | Schema without admin UI | Build or hide from ops docs |
| Q-09 | next-auth | Still **beta** (`5.0.0-beta.32`) | Track advisories; plan stable pin |

### 3.3 Reliability (live worker)

Previously: `production_job.transitioned` RETRY/MISSING.  
**2026-09-20:** no-op handlers registered in `worker/index.ts` for production_job.*, payment.*, inventory.low_stock, etc. Order email path unchanged (`order.transitioned` → `message.send`).

---

## 4. Suggested remediation order

1. ~~S-01–S-05, Q-02~~ — **done 2026-09-20**  
2. **S-06–S-08** — Try-on / Safepay ownership (next)  
3. **Q-03, Q-05** — Test isolation + admin e2e  
4. Replace Unsplash temp merch; keep worker always-on in deploy  

---

## 5. Dependency / supply-chain notes (observational)

| Package | Note |
|---------|------|
| `next-auth` beta | Monitor Auth.js CVEs |
| Next 15.5 / React 19 | Current major |
| No BullMQ despite rules | Not a vuln; doc drift |
| Playwright `@1.51` | Soft-launch e2e present |

---

## 6. Compliance with project rules (spot check)

| Rule | Observation |
|------|-------------|
| Passwordless only | Met |
| No demo admin signup | Met |
| Money integer paisa | Met in paths reviewed |
| Outbox for email/WA | Met for order transitions; phone OTP exception (S-10) |
| Vendor SDK in adapters | Safepay behind provider adapter |
| Six admin colours / shop-proto | Not re-audited visually this pass |

---

## 7. Conclusion

Security is **not** “wide open,” but **High** items (OTP TTL, track lockout bug, 2FA JWT trust, asset serve) should be fixed before calling the system production-hardened. Soft-launch COD + email is **functionally live-verified**; treat missing outbox handlers and the High auth findings as the next engineering sprint, parallel to real photography and WhatsApp/online rails later.

*End of security & quality audit.*
