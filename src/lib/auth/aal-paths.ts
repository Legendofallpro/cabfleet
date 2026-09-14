/** Paths staff may visit at aal1 so they can enroll MFA. */
export function isStaffMfaExemptPath(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/profile/");
}

/** Bounce staff to enroll/challenge unless AAL2, the path is exempt, or the gate is off (e2e). */
export function staffMustChallengeAal2(input: {
  aal: "aal1" | "aal2";
  pathname: string;
  required: boolean;
}): boolean {
  if (!input.required) return false;
  if (isStaffMfaExemptPath(input.pathname)) return false;
  return input.aal !== "aal2";
}

