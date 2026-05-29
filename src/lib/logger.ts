import pino from "pino";
import { env } from "@/lib/env";

const isDev = env.NODE_ENV !== "production";

/**
 * Redact paths follow pino's wildcard syntax. We err on the side of safety:
 * email/phone/password/token are scrubbed wherever they appear nested.
 * See docs/web-app-security.md §10.
 */
const redactPaths = [
  // Top-level handles
  "email",
  "to",
  "phone",
  "password",
  "token",
  "authorization",
  // Common nested locations
  "*.email",
  "*.password",
  "*.token",
  "*.phone",
  "req.headers.authorization",
  "req.headers.cookie",
  "headers.authorization",
  "headers.cookie",
  "err.email",
  "err.password",
];

export const logger = pino({
  // Default is also enforced in env.ts, but SKIP_ENV_VALIDATION bypasses zod
  // and leaves the field undefined. Fall back here so pino doesn't crash.
  level: env.LOG_LEVEL ?? "info",
  redact: { paths: redactPaths, censor: "[redacted]" },
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
    },
  }),
});
