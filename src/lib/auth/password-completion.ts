"use server";

import { cookies } from "next/headers";

import { PROOF_COOKIE_NAME, PROOF_COOKIE_CLEAR_OPTIONS } from "@/lib/auth/password-setup-proof";

/**
 * Clears the password-setup proof cookie after a successful password update.
 *
 * This must be called from a Server Action (or an inline server action in a
 * Client Component) because the proof cookie is HttpOnly and cannot be
 * cleared by browser-side JavaScript.
 *
 * Call immediately after `supabase.auth.updateUser({ password })` succeeds.
 */
export async function clearPasswordSetupProof(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PROOF_COOKIE_NAME, "", PROOF_COOKIE_CLEAR_OPTIONS);
}
