import { z } from "zod";

export const MAINTENANCE_TYPES = [
  "SERVICE",
  "OIL_CHANGE",
  "TYRE",
  "BRAKE",
  "BATTERY",
  "AC",
  "ELECTRICAL",
  "REPAIR",
  "INSPECTION",
  "OTHER",
] as const;

export const createMaintenanceLogSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  type: z.enum(MAINTENANCE_TYPES),
  cost: z.coerce.number().nonnegative("Cost must be non-negative"),
  odometer: z.coerce.number().int().nonnegative("Odometer must be non-negative"),
  nextDueOdometer: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
  at: z.coerce.date().optional(),
});

export type MaintenanceLogFormValues = z.input<typeof createMaintenanceLogSchema>;
export type MaintenanceLogInput = z.infer<typeof createMaintenanceLogSchema>;
