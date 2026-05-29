import { z } from "zod";

/**
 * `slug` is part of every tenant-scoped URL and the JWT custom-claim
 * resolution path (06_profile_sync_org.sql), so it must be a stable,
 * URL-safe identifier. Lowercase alphanumerics + dashes; no leading or
 * trailing dashes; 2–32 chars.
 */
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const orgInputSchema = z.object({
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(32, "Slug must be at most 32 characters")
    .regex(SLUG_REGEX, "Lowercase letters, digits and dashes only"),
  name: z.string().min(1, "Name is required").max(120),
});

export type OrgFormValues = z.input<typeof orgInputSchema>;
export type OrgInput = z.infer<typeof orgInputSchema>;

export const createOrgSchema = orgInputSchema;
export const updateOrgSchema = orgInputSchema.extend({
  id: z.string().min(1),
});
export type UpdateOrgFormValues = z.input<typeof updateOrgSchema>;

export const orgIdSchema = z.object({ id: z.string().min(1) });
