import type { NextConfig } from "next";
import { composeCsp } from "./src/lib/csp";

/**
 * Security headers — see docs/web-app-security.md §9.
 *
 * CSP is composed at startup from a base policy + per-feature-flag deltas
 * (Phase 7 W0 §7.8 S17). Flip `PAYMENT_GATEWAY=RAZORPAY` or
 * `REALTIME_TRACKING_ENABLED=true` and the policy widens accordingly.
 *
 * Still report-only — switch to enforcing CSP once the new `e2e:csp`
 * Playwright job (S17 follow-up) is green on prod reports for ≥1 week.
 */
const csp = composeCsp();

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
