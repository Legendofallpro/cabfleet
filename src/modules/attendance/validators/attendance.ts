import { z } from "zod";
import { AttendanceStatus } from "@prisma/client";

export const checkInSchema = z.object({
  profileId: z.string().uuid("Invalid profile ID"),
  date: z.coerce.date(),
  checkIn: z.coerce.date(),
});

export const checkOutSchema = z.object({
  profileId: z.string().uuid("Invalid profile ID"),
  date: z.coerce.date(),
  checkOut: z.coerce.date(),
});

export const markAbsentSchema = z.object({
  profileId: z.string().uuid("Invalid profile ID"),
  date: z.coerce.date(),
  status: z.enum(AttendanceStatus).default(AttendanceStatus.ABSENT),
});

export type CheckInFormValues = z.input<typeof checkInSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;

export type CheckOutFormValues = z.input<typeof checkOutSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;

export type MarkAbsentFormValues = z.input<typeof markAbsentSchema>;
export type MarkAbsentInput = z.infer<typeof markAbsentSchema>;
