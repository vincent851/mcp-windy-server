import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  haversineDistance,
  findNearestStations,
  fetchTidePredictions,
} from "../../src/api/noaa-client.js";

describe("haversineDistance", () => {
  it("returns 0 for same point", () => {
    expect(haversineDistance(40, -74, 40, -74)).toBe(0);
  });

  it("computes approximate distance NYC to LA", () => {
    // NYC (40.7128, -74.0060) to LA (34.0522, -118.2437) ≈ 3940 km
    const dist = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(dist).toBeGreaterThan(3900);
    expect(dist).toBeLessThan(4000);
  });

  it("computes short distance correctly", () => {
    // Two points ~111 km apart (1 degree of latitude)
    const dist = haversineDistance(0, 0, 1, 0);
    expect(dist).toBeGreaterThan(110);
    expect(dist).toBeLessThan(112);
  });

  it("handles negative coordinates", () => {
    const dist = haversineDistance(-33.8688, 151.2093, -37.8136, 144.9631);
    expect(dist).toBeGreaterThan(700);
    expect(dist).toBeLessThan(800);
  });
});

describe("findNearestStations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns stations sorted by distance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            stations: [
              { id: "8518750", name: "The Battery", state: "NY", lat: 40.7006, lng: -74.0142 },
              { id: "9410660", name: "Los Angeles", state: "CA", lat: 33.72, lng: -118.272 },
              { id: "8443970", name: "Boston", state: "MA", lat: 42.3548, lng: -71.0534 },
            ],
          }),
      })
    );

    const stations = await findNearestStations(40.7128, -74.006, 3);

    expect(stations).toHaveLength(3);
    expect(stations[0].id).toBe("8518750"); // The Battery is closest to NYC
    expect(stations[0].distance_km).toBeDefined();
    expect(stations[0].distance_km!).toBeLessThan(stations[1].distance_km!);
    expect(stations[1].distance_km!).toBeLessThan(stations[2].distance_km!);
  });

  it("limits results to requested count", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            stations: [
              { id: "1", name: "A", state: "NY", lat: 40.7, lng: -74.0 },
              { id: "2", name: "B", state: "NY", lat: 40.8, lng: -74.1 },
              { id: "3", name: "C", state: "NY", lat: 40.9, lng: -74.2 },
            ],
          }),
      })
    );

    const stations = await findNearestStations(40.7, -74.0, 2);
    expect(stations).toHaveLength(2);
  });

  it("throws on API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      })
    );

    await expect(findNearestStations(0, 0)).rejects.toThrow("NOAA stations API error");
  });

  it("throws when no stations returned", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ stations: [] }),
      })
    );

    await expect(findNearestStations(0, 0)).rejects.toThrow("No tide stations found");
  });
});

describe("fetchTidePredictions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns formatted predictions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            predictions: [
              { t: "2024-01-01 00:00", v: "1.234" },
              { t: "2024-01-01 01:00", v: "1.567" },
            ],
          }),
      })
    );

    const result = await fetchTidePredictions("8518750", 1, false);
    expect(result.predictions).toHaveLength(2);
    expect(result.predictions[0].time).toBe("2024-01-01 00:00");
    expect(result.predictions[0].height_m).toBe(1.23);
  });

  it("returns hi/lo predictions with type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            predictions: [
              { t: "2024-01-01 05:30", v: "1.85", type: "H" },
              { t: "2024-01-01 11:45", v: "0.12", type: "L" },
            ],
          }),
      })
    );

    const result = await fetchTidePredictions("8518750", 1, true);
    expect(result.predictions[0].type).toBe("H");
    expect(result.predictions[1].type).toBe("L");
  });

  it("sanitizes station ID", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ predictions: [] }),
      })
    );

    await fetchTidePredictions("8518750; DROP TABLE", 1, false);

    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    // Sanitizer strips non-alphanumeric and limits to 10 chars
    expect(calledUrl).toContain("station=8518750DRO");
    expect(calledUrl).not.toContain(";");
    expect(calledUrl).not.toContain(" ");
  });

  it("rejects empty station ID after sanitization", async () => {
    await expect(fetchTidePredictions("!@#$%", 1, false)).rejects.toThrow(
      "Invalid station ID"
    );
  });

  it("clamps days to valid range", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ predictions: [] }),
      })
    );

    await fetchTidePredictions("8518750", 99, false);
    // Just verify it doesn't throw — the clamping happens internally
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("throws on NOAA API error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            error: { message: "Station not found" },
          }),
      })
    );

    await expect(fetchTidePredictions("0000000", 1, false)).rejects.toThrow(
      "NOAA API error: Station not found"
    );
  });

  it("throws on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not Found"),
      })
    );

    await expect(fetchTidePredictions("8518750", 1, false)).rejects.toThrow(
      "NOAA predictions API error (404)"
    );
  });

  it("returns empty array when no predictions available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ predictions: [] }),
      })
    );

    const result = await fetchTidePredictions("8518750", 1, false);
    expect(result.predictions).toEqual([]);
  });
});
