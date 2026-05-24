import { z } from "zod";
import { VehicleStatus, VehicleType } from "@prisma/client";

// Accepts string (from <input type="date">) or null; outputs Date | null.
const optionalDate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    return v instanceof Date ? v : new Date(v);
  });

export const vehicleInputSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  registrationNumber: z
    .string()
    .min(2, "Registration is required")
    .max(20)
    .transform((v) => v.toUpperCase().trim()),
  make: z.string().min(1).max(60),
  model: z.string().min(1).max(60),
  year: z.coerce
    .number()
    .int()
    .min(1980)
    .max(new Date().getFullYear() + 1),
  color: z.string().max(40).optional().nullable(),
  type: z.enum(VehicleType).default(VehicleType.SEDAN),
  capacity: z.coerce.number().int().min(1).max(60).default(4),
  status: z.enum(VehicleStatus).default(VehicleStatus.AVAILABLE),
  insuranceExpiry: optionalDate,
  fitnessExpiry: optionalDate,
  pucExpiry: optionalDate,
  odometer: z.coerce.number().int().min(0).default(0),
  notes: z.string().max(500).optional().nullable(),
});

export type VehicleFormValues = z.input<typeof vehicleInputSchema>;
export type VehicleInput = z.infer<typeof vehicleInputSchema>;

export const createVehicleSchema = vehicleInputSchema;
export const updateVehicleSchema = vehicleInputSchema.extend({
  id: z.string().min(1),
});

export type UpdateVehicleFormValues = z.input<typeof updateVehicleSchema>;
