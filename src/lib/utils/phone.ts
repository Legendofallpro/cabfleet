/**
 * Phone normalization helpers (Phase 7 W2 §6.2).
 *
 * Twilio requires E.164 (`+CCAREANUM`). `Profile.phone` is free-text today
 * (the invite validator accepts `z.string().optional()`), so the
 * NotificationService must normalize before handing a number to a provider.
 *
 * `IN` is the default region — the platform is India-first — but callers may
 * pass another ISO country code for international customers.
 */
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export type ParsedPhone = {
  ok: true;
  e164: string;
  country: CountryCode | null;
} | {
  ok: false;
  reason: "EMPTY" | "INVALID";
};

/**
 * Parse a free-text phone number and return the E.164 form. Returns a typed
 * `{ ok: false, reason }` instead of throwing so callers (notification
 * pipeline, invite forms) can react without try/catch.
 */
export function toE164(
  input: string | null | undefined,
  defaultRegion: CountryCode = "IN",
): ParsedPhone {
  if (!input) return { ok: false, reason: "EMPTY" };
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: "EMPTY" };

  const parsed = parsePhoneNumberFromString(trimmed, defaultRegion);
  if (!parsed || !parsed.isValid()) return { ok: false, reason: "INVALID" };

  return { ok: true, e164: parsed.number, country: parsed.country ?? null };
}

/** Convenience: `true` iff the input parses to a valid E.164 number. */
export function isValidE164(
  input: string | null | undefined,
  defaultRegion: CountryCode = "IN",
): boolean {
  return toE164(input, defaultRegion).ok;
}
