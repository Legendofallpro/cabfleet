import { z } from "zod";

export const assignVehicleSchema = z.object({
  driverId: z.string().min(1),
  vehicleId: z.string().min(1, "Vehicle is required"),
});

export type AssignVehicleFormValues = z.input<typeof assignVehicleSchema>;
export type AssignVehicleInput = z.infer<typeof assignVehicleSchema>;

export const endVehicleAssignmentSchema = z.object({
  assignmentId: z.string().min(1),
});
