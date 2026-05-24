export type StaffRole = "admin" | "dispatcher" | "support" | "manager";
export type StaffStatus = "active" | "inactive" | "on_leave";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  status: StaffStatus;
  joinedAt: string;
}
