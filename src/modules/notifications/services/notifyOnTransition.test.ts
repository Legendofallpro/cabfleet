import { BookingStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { templateIdForTransition } from "./notifyOnTransition";
import { TEMPLATES } from "./templates";

describe("templateIdForTransition", () => {
  it("notifies when a driver claims an open trip", () => {
    expect(
      templateIdForTransition(BookingStatus.OPEN_FOR_CLAIM, BookingStatus.CLAIMED),
    ).toBe("BOOKING_CLAIMED");
  });

  it("notifies when staff assigns from pending or claimed", () => {
    expect(
      templateIdForTransition(BookingStatus.PENDING, BookingStatus.ASSIGNED),
    ).toBe("BOOKING_ASSIGNED");
    expect(
      templateIdForTransition(BookingStatus.CLAIMED, BookingStatus.ASSIGNED),
    ).toBe("BOOKING_ASSIGNED");
  });

  it("notifies 'on the way' when the driver leaves for pickup", () => {
    expect(
      templateIdForTransition(BookingStatus.ASSIGNED, BookingStatus.DRIVER_EN_ROUTE),
    ).toBe("BOOKING_STARTED");
  });

  it("does not treat ASSIGNED → IN_PROGRESS as a real edge", () => {
    expect(
      templateIdForTransition(BookingStatus.ASSIGNED, BookingStatus.IN_PROGRESS),
    ).toBeNull();
  });

  it("notifies when the trip actually starts", () => {
    expect(
      templateIdForTransition(BookingStatus.DRIVER_EN_ROUTE, BookingStatus.IN_PROGRESS),
    ).toBe("BOOKING_IN_PROGRESS");
  });

  it("notifies on complete", () => {
    expect(
      templateIdForTransition(BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED),
    ).toBe("BOOKING_COMPLETED");
  });

  it("notifies on cancel from any status", () => {
    expect(
      templateIdForTransition(BookingStatus.PENDING, BookingStatus.CANCELLED),
    ).toBe("BOOKING_CANCELLED");
    expect(
      templateIdForTransition(BookingStatus.DRIVER_EN_ROUTE, BookingStatus.CANCELLED),
    ).toBe("BOOKING_CANCELLED");
  });

  it("stays silent for open-for-claim, no-show, and failed", () => {
    expect(
      templateIdForTransition(BookingStatus.PENDING, BookingStatus.OPEN_FOR_CLAIM),
    ).toBeNull();
    expect(
      templateIdForTransition(BookingStatus.DRIVER_EN_ROUTE, BookingStatus.NO_SHOW),
    ).toBeNull();
    expect(
      templateIdForTransition(BookingStatus.IN_PROGRESS, BookingStatus.FAILED),
    ).toBeNull();
  });
});

describe("BOOKING_STARTED / BOOKING_IN_PROGRESS templates", () => {
  it("sends email and WhatsApp for on-the-way", () => {
    expect(TEMPLATES.BOOKING_STARTED.channels).toEqual(["EMAIL", "WHATSAPP"]);
    const email = TEMPLATES.BOOKING_STARTED.renderEmail({
      bookingRef: "ABC123",
      customerName: "Aman",
      driverName: "Ravi",
    });
    expect(email.subject.length).toBeGreaterThan(0);
    expect(email.html).toContain("on the way");
  });

  it("has a trip-started template", () => {
    expect(TEMPLATES.BOOKING_IN_PROGRESS.channels).toEqual(["EMAIL", "WHATSAPP"]);
    const wa = TEMPLATES.BOOKING_IN_PROGRESS.renderWhatsApp({
      bookingRef: "ABC123",
      driverName: "Ravi",
    });
    expect(wa.toLowerCase()).toContain("started");
  });
});
