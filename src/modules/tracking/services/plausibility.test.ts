import { describe, it, expect } from "vitest";
import {
  derivedSpeedKph,
  evaluatePoint,
  haversineKm,
} from "@/modules/tracking/services/plausibility";

describe("haversineKm", () => {
  it("is ~zero between the same point", () => {
    const a = { lat: 12.97, lng: 77.59 };
    expect(haversineKm(a, a)).toBeLessThan(0.001);
  });

  it("matches a known Bangalore<->Chennai distance (~290km)", () => {
    const blr = { lat: 12.9716, lng: 77.5946 };
    const maa = { lat: 13.0827, lng: 80.2707 };
    const km = haversineKm(blr, maa);
    expect(km).toBeGreaterThan(285);
    expect(km).toBeLessThan(300);
  });
});

describe("derivedSpeedKph", () => {
  it("returns 0 when dt is non-positive", () => {
    const t = new Date();
    expect(
      derivedSpeedKph(
        { lat: 0, lng: 0, recordedAt: t },
        { lat: 1, lng: 1, recordedAt: t },
      ),
    ).toBe(0);
  });

  it("computes ~60 km/h for a 1km hop over 60s", () => {
    const t0 = new Date("2026-01-01T00:00:00Z");
    const t1 = new Date("2026-01-01T00:01:00Z");
    // ~1km north (0.009 deg lat ≈ 1km).
    const speed = derivedSpeedKph(
      { lat: 12.97, lng: 77.59, recordedAt: t0 },
      { lat: 12.979, lng: 77.59, recordedAt: t1 },
    );
    expect(speed).toBeGreaterThan(55);
    expect(speed).toBeLessThan(65);
  });
});

describe("evaluatePoint", () => {
  const baseCtx = {
    pickup: { lat: 12.97, lng: 77.59 },
    previous: null,
    isFirstPoint: false,
    maxSpeedKph: 200,
    firstPointMaxKm: 5,
  } as const;

  it("accepts a plausible point", () => {
    const v = evaluatePoint(
      { lat: 12.97, lng: 77.59, recordedAt: new Date(), speedKph: 40 },
      baseCtx,
    );
    expect(v.ok).toBe(true);
  });

  it("rejects when reported speed exceeds cap", () => {
    const v = evaluatePoint(
      { lat: 12.97, lng: 77.59, recordedAt: new Date(), speedKph: 250 },
      baseCtx,
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/reported_speed/);
  });

  it("rejects when derived speed exceeds cap", () => {
    const t0 = new Date("2026-01-01T00:00:00Z");
    const t1 = new Date("2026-01-01T00:00:10Z"); // 10s
    // ~2km hop in 10s = ~720 km/h
    const v = evaluatePoint(
      { lat: 12.99, lng: 77.59, recordedAt: t1 },
      {
        ...baseCtx,
        previous: { lat: 12.97, lng: 77.59, recordedAt: t0 },
      },
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/derived_speed/);
  });

  it("flags first point far from pickup", () => {
    const v = evaluatePoint(
      { lat: 13.10, lng: 77.59, recordedAt: new Date() }, // ~14km away
      { ...baseCtx, isFirstPoint: true },
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/first_point_too_far/);
  });

  it("skips first-point check when firstPointMaxKm is 0", () => {
    const v = evaluatePoint(
      { lat: 13.10, lng: 77.59, recordedAt: new Date() },
      { ...baseCtx, isFirstPoint: true, firstPointMaxKm: 0 },
    );
    expect(v.ok).toBe(true);
  });
});
