import { afterEach, describe, expect, it, vi } from "vitest";

const envState = vi.hoisted(() => ({
  MAPBOX_ACCESS_TOKEN: undefined as string | undefined,
}));

vi.mock("@/lib/env", () => ({
  env: envState,
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { drivingKm, geocodeAddress, resolveBookingRoute } from "./geocode";

describe("geocodeAddress", () => {
  afterEach(() => {
    envState.MAPBOX_ACCESS_TOKEN = undefined;
  });

  it("returns null when the Mapbox token is unset", async () => {
    expect(await geocodeAddress("MG Road, Bengaluru")).toBeNull();
  });

  it("reads lng,lat from the first Mapbox feature", async () => {
    envState.MAPBOX_ACCESS_TOKEN = "pk.test";
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ features: [{ center: [77.6, 12.9] }] }), {
        status: 200,
      }),
    );
    await expect(
      geocodeAddress("MG Road", { fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).resolves.toEqual({ lng: 77.6, lat: 12.9 });
  });
});

describe("drivingKm", () => {
  afterEach(() => {
    envState.MAPBOX_ACCESS_TOKEN = undefined;
  });

  it("falls back to haversine when Directions fails", async () => {
    envState.MAPBOX_ACCESS_TOKEN = "pk.test";
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    const km = await drivingKm(
      { lat: 12.9, lng: 77.6 },
      { lat: 13.0, lng: 77.6 },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(km).toBeGreaterThan(0);
  });
});

describe("resolveBookingRoute", () => {
  afterEach(() => {
    envState.MAPBOX_ACCESS_TOKEN = undefined;
  });

  it("keeps a staff-entered distance and still geocodes when token is set", async () => {
    envState.MAPBOX_ACCESS_TOKEN = "pk.test";
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes("geocoding")) {
        return new Response(JSON.stringify({ features: [{ center: [77.6, 12.9] }] }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ routes: [{ distance: 12345 }] }), { status: 200 });
    });
    const route = await resolveBookingRoute({
      pickupAddress: "A",
      dropAddress: "B",
      distanceKm: 8,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(route.distanceKm).toBe(8);
    expect(route.pickupLat).toBe(12.9);
  });

  it("returns empty geometry without a token", async () => {
    const route = await resolveBookingRoute({
      pickupAddress: "A",
      dropAddress: "B",
    });
    expect(route).toEqual({
      pickupLat: null,
      pickupLng: null,
      dropLat: null,
      dropLng: null,
      distanceKm: null,
    });
  });

  it("keeps a staff-entered distance when Mapbox is unset", async () => {
    const route = await resolveBookingRoute({
      pickupAddress: "A",
      dropAddress: "B",
      distanceKm: 8,
    });
    expect(route.distanceKm).toBe(8);
    expect(route.pickupLat).toBeNull();
  });
});
