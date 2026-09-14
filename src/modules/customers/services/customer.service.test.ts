import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";

vi.mock("@/lib/db", () => ({
  db: {
    profile: { findFirst: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    customer: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { db } from "@/lib/db";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { findOrCreateStaffCustomer, prepareCustomerSignup } from "./customer.service";
import { staffManagedEmailFromE164 } from "@/modules/customers/staff-managed";

describe("findOrCreateStaffCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an invalid Indian mobile", async () => {
    await expect(
      findOrCreateStaffCustomer({ phone: "123", fullName: "A" }, { id: "staff-1" }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "VALIDATION",
      } satisfies Partial<AppError>),
    );
    expect(db.profile.findFirst).not.toHaveBeenCalled();
  });

  it("returns the existing customer when the phone is already on file", async () => {
    vi.mocked(db.profile.findFirst).mockResolvedValue({
      id: "prof-1",
      fullName: "Priya",
      email: "priya@staff.cabfleet.invalid",
      phone: "+919876543210",
      customer: {
        id: "cust-1",
        profileId: "prof-1",
        loyaltyTier: null,
        totalBookings: 2,
        totalSpend: 100,
        staffManaged: true,
        createdAt: new Date("2026-01-01"),
        deletedAt: null,
      },
    } as never);

    const result = await findOrCreateStaffCustomer(
      { phone: "9876543210", fullName: "Priya" },
      { id: "staff-1" },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("cust-1");
      expect(result.data.staffManaged).toBe(true);
    }
    expect(getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("builds a non-deliverable staff-managed email from E.164", () => {
    expect(staffManagedEmailFromE164("+919876543210")).toBe(
      "919876543210@staff.cabfleet.invalid",
    );
  });
});

describe("prepareCustomerSignup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects .invalid emails", async () => {
    await expect(
      prepareCustomerSignup({
        email: "a@staff.cabfleet.invalid",
        password: "password1",
        phone: "9876543210",
        fullName: "A B",
      }),
    ).rejects.toEqual(expect.objectContaining({ code: "VALIDATION" }));
  });

  it("returns new when the phone is unused", async () => {
    vi.mocked(db.profile.findFirst).mockResolvedValue(null);

    const result = await prepareCustomerSignup({
      email: "priya@gmail.com",
      password: "password1",
      phone: "9876543210",
      fullName: "Priya N",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.mode).toBe("new");
    expect(getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("does not call the admin API when the phone already belongs to a guest", async () => {
    vi.mocked(db.profile.findFirst).mockImplementation(((args?: { where?: { phone?: string } }) => {
      if (args?.where?.phone) {
        return Promise.resolve({
          id: "prof-1",
          customer: { id: "cust-1", staffManaged: true, deletedAt: null },
        });
      }
      return Promise.resolve(null);
    }) as never);

    await expect(
      prepareCustomerSignup({
        email: "priya@gmail.com",
        password: "password1",
        phone: "9876543210",
        fullName: "Priya N",
      }),
    ).rejects.toEqual(expect.objectContaining({ code: "CONFLICT" }));
    expect(getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("rejects a phone already used by a portal customer", async () => {
    vi.mocked(db.profile.findFirst).mockImplementation(((args?: { where?: { phone?: string } }) => {
      if (args?.where?.phone) {
        return Promise.resolve({
          id: "prof-2",
          customer: { id: "cust-2", staffManaged: false, deletedAt: null },
        });
      }
      return Promise.resolve(null);
    }) as never);

    await expect(
      prepareCustomerSignup({
        email: "new@gmail.com",
        password: "password1",
        phone: "9876543210",
        fullName: "New User",
      }),
    ).rejects.toEqual(expect.objectContaining({ code: "CONFLICT" }));
  });
});
