import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AalLevel = "aal1" | "aal2";
export { isStaffMfaExemptPath, staffMustChallengeAal2 } from "@/lib/auth/aal-paths";

/**
 * Current authenticator assurance for this request's session.
 * Missing / failed lookups are treated as aal1 (fail closed for staff gates).
 */
export const getCurrentAal = cache(async (): Promise<AalLevel> => {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || data?.currentLevel !== "aal2") return "aal1";
  return "aal2";
});
