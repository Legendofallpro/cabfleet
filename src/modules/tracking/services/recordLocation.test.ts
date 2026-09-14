import { describe, expect, it, vi } from "vitest";

const envState = vi.hoisted(() => ({
  REALTIME_TRACKING_ENABLED: false,
  LOCATION_MAX_SPEED_KPH: 200,
  LOCATION_FIRST_POINT_MAX_KM: 5,
}));

vi.mock("@/lib/env", () => ({
  env: envState,
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  db: {
    booking: { findFirst: vi.fn() },
  },
}));

vi.mock("@/modules/tracking/services/broadcast", () => ({
  broadcastLocations: vi.fn(),
}));

import { db } from "@/lib/db";
import { recordLocation } from "./recordLocation";

describe("recordLocation", () => {
  it("refuses ingest when REALTIME_TRACKING_ENABLED is false", async () => {
    envState.REALTIME_TRACKING_ENABLED = false;
    const result = await recordLocation({
      bookingId: "bk-1",
      driverId: "drv-1",
      points: [
        { lat: 12.9, lng: 77.6, recordedAt: new Date() },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
    expect(db.booking.findFirst).not.toHaveBeenCalled();
  });
});
