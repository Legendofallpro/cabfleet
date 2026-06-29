"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import Button from "@/components/ui/button/Button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AVATAR_BUCKET, withAvatarCacheBust } from "@/modules/profile/avatar-url";
import {
  ensureAvatarsBucketAction,
  updateAvatarUrlAction,
} from "@/modules/profile/actions/profile.actions";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type Props = {
  profileId: string;
  /** Compact layout for driver profile header row. */
  variant?: "default" | "inline";
};

function isBucketMissingError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("bucket not found") ||
    lower.includes("does not exist") ||
    lower.includes("not found") && lower.includes("bucket")
  );
}

function avatarUploadErrorMessage(message: string): string {
  if (isBucketMissingError(message)) {
    return "Avatar storage is not set up yet. Ask an admin to run: npx tsx scripts/setup-avatar-bucket.ts and apply prisma/sql/12_avatar_storage.sql in Supabase.";
  }
  if (message.toLowerCase().includes("row-level security") || message.toLowerCase().includes("policy")) {
    return "Upload blocked by storage permissions. Run prisma/sql/12_avatar_storage.sql in the Supabase SQL editor.";
  }
  return message || "Upload failed.";
}

export function AvatarUploadForm({ profileId, variant = "default" }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function tryEnsureBucket(): Promise<boolean> {
    const result = await ensureAvatarsBucketAction({});
    if (!result.ok) {
      toast.error(result.error.message);
      return false;
    }
    if (result.data.created) {
      toast.message("Created avatars storage bucket. If upload still fails, apply storage RLS SQL.");
    }
    return true;
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be 2 MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${profileId}/avatar.${ext}`;

      let uploadError = (
        await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
          upsert: true,
          contentType: file.type,
        })
      ).error;

      if (uploadError && isBucketMissingError(uploadError.message)) {
        const ensured = await tryEnsureBucket();
        if (ensured) {
          uploadError = (
            await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
              upsert: true,
              contentType: file.type,
            })
          ).error;
        }
      }

      if (uploadError) {
        toast.error(avatarUploadErrorMessage(uploadError.message));
        return;
      }

      const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const avatarUrl = withAvatarCacheBust(urlData.publicUrl);

      const result = await updateAvatarUrlAction({ avatarUrl });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success("Avatar updated.");
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  const button = (
    <Button
      type="button"
      size="sm"
      intent="outline"
      disabled={uploading}
      onClick={() => inputRef.current?.click()}
    >
      {uploading ? "Uploading…" : "Change photo"}
    </Button>
  );

  return (
    <div className={variant === "inline" ? "" : "mb-6"}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onFileChange}
        disabled={uploading}
      />
      {variant === "inline" ? (
        <div className="space-y-1">
          {button}
          <p className="text-xs text-muted">JPEG, PNG, or WebP · max 2 MB</p>
        </div>
      ) : (
        <>
          {button}
          <p className="mt-1.5 text-xs text-muted">JPEG, PNG, or WebP. Max 2 MB.</p>
        </>
      )}
    </div>
  );
}
