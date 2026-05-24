export type BookingStatus = "pending" | "active" | "completed" | "cancelled";

export interface Booking {
  id: string;
  passengerName: string;
  driverId: string;
  vehicleId: string;
  pickupLocation: string;
  dropoffLocation: string;
  status: BookingStatus;
  scheduledAt: string;
  fare?: number;
  createdAt: string;
}
