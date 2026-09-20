import { z } from "zod";
import {
  invalidPhoneMessage,
  resolvePhoneRegion,
  toE164,
} from "@/lib/utils/phone";

/**
 * Shared client-side schemas for auth forms. Server-side trust still flows
 * through Supabase (which has its own validation); enforcing these in the
 * browser catches obvious mistakes and is consistent with AGENTS.md §5.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

// ────────────────────────────────────────────────────────────────────────────
// Sign in
// ────────────────────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type SignInValues = z.input<typeof signInSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Sign up
// ────────────────────────────────────────────────────────────────────────────

export function createSignUpSchema(phoneRegion: string) {
  const region = resolvePhoneRegion(phoneRegion);
  return z.object({
    firstName: z.string().trim().min(1, "First name is required").max(80),
    lastName: z.string().trim().min(1, "Last name is required").max(80),
    phone: z
      .string()
      .trim()
      .min(1, "Mobile number is required")
      .refine((v) => toE164(v, region).ok, invalidPhoneMessage(region)),
    email: emailSchema.refine(
      (v) => !v.toLowerCase().endsWith(".invalid"),
      "Use a real email address",
    ),
    password: passwordSchema,
    agreed: z.literal(true, { message: "Please accept the terms" }),
  });
}
export type SignUpValues = z.input<ReturnType<typeof createSignUpSchema>>;

// ────────────────────────────────────────────────────────────────────────────
// Reset password (request link)
// ────────────────────────────────────────────────────────────────────────────

export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
});
export type ResetPasswordRequestFormValues = z.input<typeof resetPasswordRequestSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Set / change password (invite + recovery)
// ────────────────────────────────────────────────────────────────────────────

export const setPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type SetPasswordFormValues = z.input<typeof setPasswordSchema>;
