/**
 * Template variable sanitizer (Phase 7 §7.4 S13).
 *
 * Inputs interpolated into transactional templates (WhatsApp / Resend HTML)
 * are user-controlled (customer fullName, address strings, etc). To defeat
 * social-engineering through these surfaces — phishing URLs, fake reply
 * blocks, zero-width-character spoofing — every string variable is run
 * through `sanitizeTemplateVar` before it hits a provider.
 *
 * Rules:
 *   1. Strip ALL URLs (http/https/data/file).
 *   2. Strip control characters and zero-width / bidi-override characters.
 *   3. Collapse runs of whitespace.
 *   4. Truncate to 50 characters (configurable per call).
 */
const URL_REGEX = /\b(?:https?|ftp|file|data):[^\s]+/gi;
// Control chars (C0/C1) and the common zero-width / bidi-override family.
const INVISIBLE_REGEX = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const WHITESPACE_RUNS = /\s{2,}/g;

export function sanitizeTemplateVar(
  input: string | number,
  maxLength = 50,
): string {
  if (typeof input === "number") return String(input);
  return input
    .replace(URL_REGEX, "")
    .replace(INVISIBLE_REGEX, "")
    .replace(WHITESPACE_RUNS, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize a whole `variables` map. Numeric values pass through unchanged;
 * strings are normalized. Returns a fresh object — never mutates the input.
 */
export function sanitizeVariables(
  variables: Record<string, string | number>,
  maxLength = 50,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(variables)) {
    out[k] = typeof v === "number" ? v : sanitizeTemplateVar(v, maxLength);
  }
  return out;
}
