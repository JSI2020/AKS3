# ADR-0015 — Soft launch is ready-to-wear (RTW)

**Status:** Accepted  
**Date:** 2026-09-15  
**Decides:** Brand vs storefront product conflict (was P0-11)

## Context

Brand Foundation and Roadmap described made-to-measure as the primary path.
The live shop (and `.cursor/rules/aks-brand.mdc`) sell standard sizes only:
`/designs/[slug]/measure` redirects; PDP/cart use `sizeMode: "STANDARD"`.

## Decision

**Soft launch = ready-to-wear only (XS–XL).**

- Customer flows do not collect custom body measurements.
- Brand docs and storefront copy must match that reality.
- Made-to-measure remains a later product phase, not a silent restore.

## Consequences

- Update `docs/AKS_Brand_Foundation.md` and Roadmap soft-launch rules to RTW.
- Keep measure/MTM admin + engine code; do not expose on the shop.
- Lead time, checkout, and size-guide copy stay RTW-honest.
- A future ADR is required before reopening customer MTM.
