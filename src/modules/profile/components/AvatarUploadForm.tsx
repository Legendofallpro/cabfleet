"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import Button from "@/components/ui/button/Button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { updateAvatarUrlAction } from "@/modules/profile/actions/profile.actions";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type Props = {
  profileId: string;
};

export function AvatarUploadForm({ profileId }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        toast.error(uploadError.message ?? "Upload failed.");
        return;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = urlData.publicUrl;

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

  return (
    <div className="mb-6">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onFileChange}
        disabled={uploading}
      />
      <Button
        type="button"
        size="sm"
        intent="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Uploading…" : "Change avatar"}
      </Button>
      <p className="mt-1.5 text-xs text-muted">JPEG, PNG, or WebP. Max 2 MB.</p>
    </div>
  );
}
