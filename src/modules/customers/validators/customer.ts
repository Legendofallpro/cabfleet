import { z } from "zod";

export const findOrCreateStaffCustomerSchema = z.object({
  phone: z.string().min(7).max(32),
  fullName: z.string().min(1).max(120),
});

export type FindOrCreateStaffCustomerFormValues = z.input<typeof findOrCreateStaffCustomerSchema>;
export type FindOrCreateStaffCustomerInput = z.infer<typeof findOrCreateStaffCustomerSchema>;

export const lookupCustomerByPhoneSchema = z.object({
  phone: z.string().min(7).max(32),
});

export type LookupCustomerByPhoneInput = z.infer<typeof lookupCustomerByPhoneSchema>;

export const prepareCustomerSignupSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .refine((v) => !v.toLowerCase().endsWith(".invalid"), "Use a real email address"),
  password: z.string().min(8).max(128),
  phone: z.string().min(7).max(32),
  fullName: z.string().trim().min(1).max(160),
});

export type PrepareCustomerSignupInput = z.infer<typeof prepareCustomerSignupSchema>;

export const inviteCustomerToPortalSchema = z.object({
  customerId: z.string().min(1),
});

export type InviteCustomerToPortalInput = z.infer<typeof inviteCustomerToPortalSchema>;

export const claimStaffManagedCustomerSchema = z.object({
  token: z.string().min(1),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .refine((v) => !v.toLowerCase().endsWith(".invalid"), "Use a real email address"),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(1).max(160),
});

export type ClaimStaffManagedCustomerInput = z.infer<typeof claimStaffManagedCustomerSchema>;
