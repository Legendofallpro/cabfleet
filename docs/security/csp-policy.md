# Content Security Policy

Phase 7 W0 / §7.8 S17.

The Content-Security-Policy header is **composed at startup** from a base policy plus per-feature-flag deltas. The composition lives in [`src/lib/csp.ts`](../../src/lib/csp.ts) and is wired into [`next.config.ts`](../../next.config.ts).

Today the header is sent as `Content-Security-Policy-Report-Only`. The flip to enforcing mode is gated on the `e2e:csp` Playwright smoke test running clean against production traffic for ≥1 week. See the comment block at the top of `next.config.ts` for the exact promotion rule.

## How it works

`composeCsp(flags?)` produces the directive string. It always merges in:

1. The base policy (`'self'` everywhere, hardened `default-src`/`frame-ancestors`/`object-src`).
2. The Supabase project origin (read from `NEXT_PUBLIC_SUPABASE_URL`) into `connect-src` and `img-src`. Supabase realtime (`wss://*.supabase.co`) is included by default because Phase 5 already uses it.

Then, per enabled feature flag, the matching delta is layered on:

| Flag (env var) | Delta constant | Hosts admitted |
|---|---|---|
| `PAYMENT_GATEWAY=RAZORPAY` | `RAZORPAY_CSP` | `checkout.razorpay.com`, `api.razorpay.com`, `lumberjack.razorpay.com` (in `script-src` / `frame-src` / `connect-src`) |
| `REALTIME_TRACKING_ENABLED=true` | `REALTIME_CSP` | `api.maptiler.com`, `api.mapbox.com`, `*.tiles.mapbox.com` (in `connect-src` / `img-src` / `style-src`) |

Deltas are deduplicated per directive — adding the same host twice is a no-op.

## Adding a new third-party host

When a Phase 7+ workstream needs to admit a new host, do **not** edit the base policy. Instead:

1. Add a new exported constant in `src/lib/csp.ts` (e.g. `WHATSAPP_CSP`, `TWILIO_CSP`).
2. Gate it on a feature flag in `resolveCspFlags()` so dev/preview/prod stay in sync.
3. Add a row to the table above documenting the flag and the hosts.
4. Add a unit test in `src/lib/csp.test.ts` asserting the hosts appear when the flag is on and disappear when it is off.

The composition is unit-tested — the `e2e:csp` Playwright check (deferred to S17 follow-up) verifies the runtime header doesn't break the live app under enforced CSP.

## Why not nonces?

Next 15 RSC hydration currently requires `'unsafe-inline'` and `'unsafe-eval'` in `script-src`. Per-request nonces are a future tightening once Next ships first-class CSP nonce support. Until then the base policy keeps these in place; the per-feature deltas never widen them further.

## Threat model

The composed CSP defends against:

- **XSS** — `default-src 'self'` blocks foreign script origins; the per-feature deltas explicitly enumerate the gateway/map hosts we choose to trust.
- **Clickjacking** — `frame-ancestors 'none'` plus the legacy `X-Frame-Options: DENY` header in `next.config.ts`.
- **Mixed-content downgrades** — every admitted host is `https:` only.

It does **not** defend against compromised first-party origins (e.g. a malicious bundle reaching `/_next/static/`). That is handled by build provenance + Supabase service-role isolation, not CSP.
