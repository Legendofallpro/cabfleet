import type { NextConfig } from "next";

/**
 * Security headers — see docs/web-app-security.md §9.
 *
 * CSP is intentionally permissive for first deploy (allows inline scripts &
 * styles required by Next 15 RSC + TailAdmin). We start in
 * `Content-Security-Policy-Report-Only` and tighten in a follow-up once
 * violation reports settle.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHost = (() => {
  try {
    return supabaseUrl ? new URL(supabaseUrl).origin : "";
  } catch {
    return "";
  }
})();

const connectSrc = ["'self'", supabaseHost, "https://*.supabase.co", "wss://*.supabase.co"]
  .filter(Boolean)
  .join(" ");

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Next.js needs 'unsafe-inline' + 'unsafe-eval' for RSC hydration in dev.
  // In production we still keep 'unsafe-inline' for hydration scripts; this
  // can be tightened with nonces in a later pass.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src ${connectSrc}`,
  "form-action 'self'",
  "frame-src 'self'",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Report-only first; flip to "Content-Security-Policy" once clean.
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },

  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
