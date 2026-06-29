"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import Button from "@/components/ui/button/Button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { recordMfaAuditAction } from "@/modules/profile/actions/profile.actions";

type Factor = {
  id: string;
  friendly_name?: string;
  status: string;
};

type EnrollState = {
  factorId: string;
  qrCode: string;
  secret: string;
  friendlyName: string;
} | null;

const BASE_FRIENDLY_NAME = "Authenticator app";

function isDuplicateFriendlyNameError(message: string): boolean {
  return message.toLowerCase().includes("friendly name") && message.toLowerCase().includes("already exists");
}

function nextFriendlyName(existing: Factor[]): string {
  const names = new Set(existing.map((f) => f.friendly_name ?? "").filter(Boolean));
  if (!names.has(BASE_FRIENDLY_NAME)) return BASE_FRIENDLY_NAME;
  let n = 2;
  while (names.has(`${BASE_FRIENDLY_NAME} ${n}`)) n += 1;
  return `${BASE_FRIENDLY_NAME} ${n}`;
}

export function MfaSettingsPanel() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enroll, setEnroll] = useState<EnrollState>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshFactors = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error(error.message);
      return;
    }
    setFactors(data.totp ?? []);
  }, []);

  useEffect(() => {
    void refreshFactors().finally(() => setLoading(false));
  }, [refreshFactors]);

  async function unenrollFactor(factorId: string, options?: { silent?: boolean }) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      if (!options?.silent) toast.error(error.message);
      return false;
    }
    return true;
  }

  async function cleanupUnverifiedFactors(exceptId?: string) {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return;

    const stale = (data.totp ?? []).filter(
      (f) => String(f.status) === "unverified" && f.id !== exceptId,
    );
    for (const factor of stale) {
      await unenrollFactor(factor.id, { silent: true });
    }
  }

  async function enrollWithName(friendlyName: string, retryAfterCleanup = false) {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName,
    });

    if (error) {
      if (!retryAfterCleanup && isDuplicateFriendlyNameError(error.message)) {
        toast.message("Cleaning up an incomplete setup attempt…");
        await cleanupUnverifiedFactors();
        const { data: refreshed } = await supabase.auth.mfa.listFactors();
        const name = nextFriendlyName(refreshed?.totp ?? []);
        return enrollWithName(name, true);
      }
      toast.error(error.message);
      return;
    }

    setEnroll({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      friendlyName,
    });
    setVerifyCode("");
    await refreshFactors();
  }

  async function startEnroll() {
    setBusy(true);
    try {
      await cleanupUnverifiedFactors();
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const friendlyName = nextFriendlyName(data?.totp ?? []);
      await enrollWithName(friendlyName);
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll() {
    if (!enroll) return;
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enroll.factorId,
      });
      if (challengeError) {
        toast.error(challengeError.message);
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enroll.factorId,
        challengeId: challenge.id,
        code: verifyCode.trim(),
      });
      if (verifyError) {
        toast.error(verifyError.message);
        return;
      }
      await recordMfaAuditAction({ event: "MFA_ENROLL", factorId: enroll.factorId });
      toast.success("Two-factor authentication enabled.");
      setEnroll(null);
      setVerifyCode("");
      await refreshFactors();
    } finally {
      setBusy(false);
    }
  }

  async function unenroll(factorId: string) {
    setBusy(true);
    try {
      const ok = await unenrollFactor(factorId);
      if (!ok) return;
      await recordMfaAuditAction({ event: "MFA_UNENROLL", factorId });
      toast.success("Authenticator removed.");
      if (enroll?.factorId === factorId) {
        setEnroll(null);
        setVerifyCode("");
      }
      await refreshFactors();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading security settings…</p>;
  }

  const verified = factors.filter((f) => String(f.status) === "verified");
  const unverified = factors.filter((f) => String(f.status) === "unverified");

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Add an authenticator app for a second sign-in step. Recommended for admin and staff
        accounts.
      </p>

      {verified.length > 0 && (
        <ul className="space-y-2">
          {verified.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between rounded-lg border border-default px-4 py-3"
            >
              <span className="text-sm text-default">
                {f.friendly_name ?? BASE_FRIENDLY_NAME}
              </span>
              <Button
                type="button"
                size="sm"
                intent="outline"
                disabled={busy}
                onClick={() => unenroll(f.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      {unverified.length > 0 && !enroll && (
        <div className="space-y-2 rounded-lg border border-default bg-surface-inset p-4">
          <p className="text-sm font-medium text-default">Incomplete setup</p>
          <p className="text-xs text-muted">
            A previous authenticator setup was not finished. Remove it or start a new setup.
          </p>
          <ul className="space-y-2">
            {unverified.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-default bg-surface-elevated px-3 py-2"
              >
                <span className="text-sm text-default">
                  {f.friendly_name ?? BASE_FRIENDLY_NAME} · not verified
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => startEnroll()}
                  >
                    Start new setup
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    intent="outline"
                    disabled={busy}
                    onClick={() => unenroll(f.id)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {enroll ? (
        <div className="space-y-4 rounded-lg border border-default p-4">
          <p className="text-sm text-default">
            Scan this QR code with your authenticator app
            {enroll.friendlyName ? ` (${enroll.friendlyName})` : ""}.
          </p>
          <div className="flex justify-center">
            <Image
              src={enroll.qrCode}
              alt="TOTP QR code"
              width={180}
              height={180}
              unoptimized
            />
          </div>
          <p className="text-xs text-muted break-all">Manual key: {enroll.secret}</p>
          <TextField
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            placeholder="6-digit code"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy || verifyCode.length < 6}
              onClick={confirmEnroll}
            >
              Confirm
            </Button>
            <Button
              type="button"
              size="sm"
              intent="outline"
              disabled={busy}
              onClick={() => {
                setEnroll(null);
                setVerifyCode("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        verified.length === 0 &&
        unverified.length === 0 && (
          <Button type="button" size="sm" disabled={busy} onClick={startEnroll}>
            Add authenticator
          </Button>
        )
      )}
    </div>
  );
}
