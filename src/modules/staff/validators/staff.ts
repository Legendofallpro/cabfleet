import { z } from "zod";
import { Role, StaffDesignation, StaffStatus } from "@prisma/client";

export const inviteStaffSchema = z.object({
  email: z.email(),
  fullName: z.string().min(1).max(120),
  phone: z.string().max(32).optional().nullable(),
  branchId: z.string().min(1, "Branch is required"),
  employeeId: z.string().min(1).max(40),
  designation: z.enum(StaffDesignation).default(StaffDesignation.SUPPORT),
  status: z.enum(StaffStatus).default(StaffStatus.ACTIVE),
  // Allow inviting either as STAFF or ADMIN
  role: z.enum([Role.STAFF, Role.ADMIN]).default(Role.STAFF),
  notes: z.string().max(500).optional().nullable(),
});

export type InviteStaffFormValues = z.input<typeof inviteStaffSchema>;
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

export const updateStaffSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1).max(120),
  phone: z.string().max(32).optional().nullable(),
  branchId: z.string().min(1),
  employeeId: z.string().min(1).max(40),
  designation: z.enum(StaffDesignation),
  status: z.enum(StaffStatus),
  role: z.enum([Role.STAFF, Role.ADMIN]),
  notes: z.string().max(500).optional().nullable(),
});

export type UpdateStaffFormValues = z.input<typeof updateStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
