import { z } from "zod";

export const createFuelLogSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  driverId: z.string().optional(),
  litres: z.coerce.number().positive("Litres must be positive"),
  amount: z.coerce.number().positive("Amount must be positive"),
  odometer: z.coerce.number().int().nonnegative("Odometer must be non-negative"),
  notes: z.string().max(500).optional(),
  at: z.coerce.date().optional(),
});

export type FuelLogFormValues = z.input<typeof createFuelLogSchema>;
export type FuelLogInput = z.infer<typeof createFuelLogSchema>;
