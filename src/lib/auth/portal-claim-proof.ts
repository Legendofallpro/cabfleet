import { createHmac, timingSafeEqual } from "crypto";

import { env } from "@/lib/env";

const CLAIM_TTL_SECONDS = 60 * 60 * 24;

type ClaimPayload = {
  customerId: string;
  iat: number;
  exp: number;
};

function b64uEncode(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function b64uDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createPortalClaimToken(customerId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: ClaimPayload = {
    customerId,
    iat: now,
    exp: now + CLAIM_TTL_SECONDS,
  };
  const encodedPayload = b64uEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, env.AUTH_PROOF_SECRET);
  return `${encodedPayload}.${signature}`;
}

export function verifyPortalClaimToken(value: string): { customerId: string } | null {
  const dotIndex = value.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const encodedPayload = value.slice(0, dotIndex);
  const receivedSig = value.slice(dotIndex + 1);
  const expectedSig = sign(encodedPayload, env.AUTH_PROOF_SECRET);

  let sigsMatch: boolean;
  try {
    sigsMatch = timingSafeEqual(
      Buffer.from(receivedSig),
      Buffer.from(expectedSig),
    );
  } catch {
    return null;
  }
  if (!sigsMatch) return null;

  let payload: ClaimPayload;
  try {
    payload = JSON.parse(b64uDecode(encodedPayload)) as ClaimPayload;
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return null;
  if (!payload.customerId) return null;
  return { customerId: payload.customerId };
}

export function portalClaimUrl(token: string): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}/claim-portal?token=${encodeURIComponent(token)}`;
}
