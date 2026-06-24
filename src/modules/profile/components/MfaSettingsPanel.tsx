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
} | null;

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

  async function startEnroll() {
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator app",
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setEnroll({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setVerifyCode("");
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
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        toast.error(error.message);
        return;
      }
      await recordMfaAuditAction({ event: "MFA_UNENROLL", factorId });
      toast.success("Authenticator removed.");
      await refreshFactors();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading security settings…</p>;
  }

  const verified = factors.filter((f) => f.status === "verified");

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
                {f.friendly_name ?? "Authenticator app"}
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

      {enroll ? (
        <div className="space-y-4 rounded-lg border border-default p-4">
          <p className="text-sm text-default">Scan this QR code with your authenticator app.</p>
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
            <Button type="button" size="sm" disabled={busy || verifyCode.length < 6} onClick={confirmEnroll}>
              Confirm
            </Button>
            <Button type="button" size="sm" intent="outline" disabled={busy} onClick={() => setEnroll(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" size="sm" disabled={busy} onClick={startEnroll}>
          Add authenticator
        </Button>
      )}
    </div>
  );
}
