/**
 * Phone normalization helpers (Phase 7 W2 §6.2).
 *
 * Twilio requires E.164 (`+CCAREANUM`). `Profile.phone` is free-text today
 * (the invite validator accepts `z.string().optional()`), so the
 * NotificationService must normalize before handing a number to a provider.
 *
 * Callers must pass an explicit ISO country code (`defaultRegion`). Install
 * `phoneRegion` settings (Task 10) will supply this at the call site.
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

/** Fallback region when install settings are missing (never implicit IN). */
export function resolvePhoneRegion(
  region: string | null | undefined,
): CountryCode {
  const code = (region ?? "US").trim().toUpperCase();
  return (code.length === 2 ? code : "US") as CountryCode;
}

export function phonePlaceholder(phoneRegion: string): string {
  return phoneRegion === "IN" ? "10-digit mobile" : "Phone number";
}

export function invalidPhoneMessage(phoneRegion: string): string {
  return phoneRegion === "IN"
    ? "Enter a valid 10-digit Indian mobile number"
    : "Enter a valid phone number";
}

/**
 * Parse a free-text phone number and return the E.164 form. Returns a typed
 * `{ ok: false, reason }` instead of throwing so callers (notification
 * pipeline, invite forms) can react without try/catch.
 */
export function toE164(
  input: string | null | undefined,
  defaultRegion: CountryCode,
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
  defaultRegion: CountryCode,
): boolean {
  return toE164(input, defaultRegion).ok;
}
