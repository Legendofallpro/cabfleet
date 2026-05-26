import { createHmac, timingSafeEqual } from "crypto";

import { env } from "@/lib/env";

export const PROOF_COOKIE_NAME = "cabfleet-password-setup-proof";

/** 10 minutes in seconds */
const PROOF_TTL_SECONDS = 600;

type ProofPayload = {
  authUserId: string;
  flow: "invite" | "recovery";
  /** Sanitized intended post-password redirect target */
  redirectTo: string;
  iat: number;
  exp: number;
};

export type VerifiedProof = Omit<ProofPayload, "iat" | "exp">;

function b64uEncode(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function b64uDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createProof(
  authUserId: string,
  flow: "invite" | "recovery",
  redirectTo: string,
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: ProofPayload = {
    authUserId,
    flow,
    redirectTo,
    iat: now,
    exp: now + PROOF_TTL_SECONDS,
  };
  const encodedPayload = b64uEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, env.AUTH_PROOF_SECRET);
  return `${encodedPayload}.${signature}`;
}

export function verifyProof(value: string): VerifiedProof | null {
  const dotIndex = value.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const encodedPayload = value.slice(0, dotIndex);
  const receivedSig = value.slice(dotIndex + 1);

  const expectedSig = sign(encodedPayload, env.AUTH_PROOF_SECRET);

  let sigsMatch: boolean;
  try {
    sigsMatch = timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig));
  } catch {
    return null;
  }

  if (!sigsMatch) return null;

  let payload: ProofPayload;
  try {
    payload = JSON.parse(b64uDecode(encodedPayload)) as ProofPayload;
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return null;
  if (!payload.authUserId || !payload.flow || !payload.redirectTo) return null;
  if (payload.flow !== "invite" && payload.flow !== "recovery") return null;

  return {
    authUserId: payload.authUserId,
    flow: payload.flow,
    redirectTo: payload.redirectTo,
  };
}

export const PROOF_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/set-password",
  secure: process.env.NODE_ENV === "production",
  maxAge: PROOF_TTL_SECONDS,
};

export const PROOF_COOKIE_CLEAR_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/set-password",
  secure: process.env.NODE_ENV === "production",
  maxAge: 0,
};
