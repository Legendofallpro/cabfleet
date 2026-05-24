import { z } from "zod";
import { DriverStatus, DriverVerificationStatus } from "@prisma/client";

export const inviteDriverSchema = z.object({
  email: z.email(),
  fullName: z.string().min(1).max(120),
  phone: z.string().min(7).max(32),
  branchId: z.string().min(1, "Branch is required"),
  licenseNumber: z.string().min(2).max(40),
  licenseExpiry: z.coerce.date(),
  status: z.enum(DriverStatus).default(DriverStatus.ACTIVE),
  verification: z
    .enum(DriverVerificationStatus)
    .default(DriverVerificationStatus.PENDING),
  notes: z.string().max(500).optional().nullable(),
});

// Form (input) type: dates arrive as strings from <input type="date">.
// Service receives the coerced `Date` type via z.infer.
export type InviteDriverFormValues = z.input<typeof inviteDriverSchema>;
export type InviteDriverInput = z.infer<typeof inviteDriverSchema>;

export const updateDriverSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1).max(120),
  phone: z.string().min(7).max(32),
  branchId: z.string().min(1),
  licenseNumber: z.string().min(2).max(40),
  licenseExpiry: z.coerce.date(),
  status: z.enum(DriverStatus),
  verification: z.enum(DriverVerificationStatus),
  notes: z.string().max(500).optional().nullable(),
});

export type UpdateDriverFormValues = z.input<typeof updateDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
