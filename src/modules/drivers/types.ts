export type DriverStatus = "active" | "inactive" | "on_leave" | "suspended";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: DriverStatus;
  assignedVehicleId?: string;
  rating?: number;
  totalTrips?: number;
  joinedAt: string;
}
