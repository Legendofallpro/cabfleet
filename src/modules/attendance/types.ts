export type AttendanceStatus = "present" | "absent" | "late" | "on_leave";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeType: "driver" | "staff";
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  notes?: string;
}
