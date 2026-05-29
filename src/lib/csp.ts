/**
 * CSP composition (Phase 7 W0, §7.8 S17).
 *
 * The directive set is built from a base policy plus per-feature-flag deltas.
 * `next.config.ts` reads `composeCsp()` at startup. Flipping a feature flag
 * (e.g. `PAYMENT_GATEWAY=RAZORPAY`) automatically widens the policy to admit
 * the gateway's host, so dev/preview/prod stay in sync without manual edits.
 *
 * Read from `process.env` directly — this module also runs from `next.config.ts`
 * before `@/lib/env` (Next can't resolve the alias at config-load time).
 */

type CspDirective =
  | "default-src"
  | "base-uri"
  | "object-src"
  | "frame-ancestors"
  | "img-src"
  | "font-src"
  | "script-src"
  | "style-src"
  | "connect-src"
  | "form-action"
  | "frame-src";

export type CspDelta = Partial<Record<CspDirective, string[]>>;

function isTruthy(raw: string | undefined): boolean {
  if (!raw) return false;
  return ["true", "1", "yes", "on"].includes(raw.toLowerCase());
}

function supabaseDirectives(): CspDelta {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let origin = "";
  try {
    origin = url ? new URL(url).origin : "";
  } catch {
    origin = "";
  }
  return {
    "connect-src": [origin, "https://*.supabase.co", "wss://*.supabase.co"].filter(Boolean),
    "img-src": [origin].filter(Boolean),
  };
}

/** W3 (Payments — Razorpay). Applied when PAYMENT_GATEWAY=RAZORPAY. */
export const RAZORPAY_CSP: CspDelta = {
  "script-src": ["https://checkout.razorpay.com"],
  "frame-src": ["https://api.razorpay.com", "https://checkout.razorpay.com"],
  "connect-src": ["https://lumberjack.razorpay.com", "https://api.razorpay.com"],
};

/** W5 (Realtime — MapLibre + Mapbox geocoding). Applied when REALTIME_TRACKING_ENABLED=true. */
export const REALTIME_CSP: CspDelta = {
  "connect-src": [
    "https://api.maptiler.com",
    "https://api.mapbox.com",
    "https://*.tiles.mapbox.com",
  ],
  "img-src": ["https://api.maptiler.com", "https://*.tiles.mapbox.com"],
  "style-src": ["https://api.maptiler.com", "https://api.mapbox.com"],
};

/** Base policy (Phase 0–6 behavior, preserved verbatim). */
function basePolicy(): Record<CspDirective, string[]> {
  return {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    // Next 15 RSC needs 'unsafe-inline' + 'unsafe-eval' for hydration. Nonces
    // are a follow-up tightening (S17 follow-up).
    "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "connect-src": ["'self'"],
    "form-action": ["'self'"],
    "frame-src": ["'self'"],
  };
}

function merge(into: Record<CspDirective, string[]>, delta: CspDelta): void {
  for (const [directive, values] of Object.entries(delta) as [CspDirective, string[]][]) {
    const existing = into[directive] ?? [];
    const merged = Array.from(new Set([...existing, ...values])).filter(Boolean);
    into[directive] = merged;
  }
}

export type CspFlags = {
  razorpay?: boolean;
  realtime?: boolean;
};

/**
 * Resolve which deltas to apply from env flags. Override in tests by passing
 * `flags` explicitly.
 */
export function resolveCspFlags(): CspFlags {
  return {
    razorpay: (process.env.PAYMENT_GATEWAY ?? "").toUpperCase() === "RAZORPAY",
    realtime: isTruthy(process.env.REALTIME_TRACKING_ENABLED),
  };
}

export function composeCsp(flags: CspFlags = resolveCspFlags()): string {
  const policy = basePolicy();
  merge(policy, supabaseDirectives());
  if (flags.razorpay) merge(policy, RAZORPAY_CSP);
  if (flags.realtime) merge(policy, REALTIME_CSP);

  return (Object.entries(policy) as [CspDirective, string[]][])
    .map(([directive, values]) => `${directive} ${values.join(" ")}`)
    .join("; ");
}
