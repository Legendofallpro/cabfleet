export type VehicleStatus = "available" | "on_trip" | "maintenance" | "inactive";

export interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
  status: VehicleStatus;
  assignedDriverId?: string;
  lastServiceDate?: string;
  createdAt: string;
}
