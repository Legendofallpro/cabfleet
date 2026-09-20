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

/** 15-character Indian GSTIN. Empty string is allowed (stored as null). */
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function makeUpdateOrgGstSchema(country: string) {
  const gstin =
    country === "IN"
      ? z
          .string()
          .trim()
          .transform((v) => v.toUpperCase())
          .refine((v) => v === "" || GSTIN_REGEX.test(v), {
            message: "Enter a valid 15-character GSTIN, or leave blank",
          })
      : z
          .string()
          .trim()
          .max(32, "Tax ID must be at most 32 characters");

  return z.object({
    orgId: z.string().min(1),
    gstin,
    gstRate: z.coerce
      .number()
      .min(0, "Tax rate must be at least 0")
      .max(100, "Tax rate must be at most 100"),
  });
}

/** India defaults — kept for callers that assume the legacy export name. */
export const updateOrgGstSchema = makeUpdateOrgGstSchema("IN");

export type UpdateOrgGstFormValues = z.input<
  ReturnType<typeof makeUpdateOrgGstSchema>
>;
export type UpdateOrgGstInput = z.infer<
  ReturnType<typeof makeUpdateOrgGstSchema>
>;
