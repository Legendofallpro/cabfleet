import { z } from "zod";

export const resetPasswordRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export type ResetPasswordRequestFormValues = z.input<typeof resetPasswordRequestSchema>;

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.");

export const setPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type SetPasswordFormValues = z.input<typeof setPasswordSchema>;
