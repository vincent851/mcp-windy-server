import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateLat,
  validateLon,
  fetchPointForecast,
  searchWebcams,
  getWebcam,
} from "../../src/api/windy-client.js";

describe("validateLat", () => {
  it("accepts valid latitudes", () => {
    expect(() => validateLat(0)).not.toThrow();
    expect(() => validateLat(90)).not.toThrow();
    expect(() => validateLat(-90)).not.toThrow();
    expect(() => validateLat(45.123)).not.toThrow();
  });

  it("rejects latitude > 90", () => {
    expect(() => validateLat(91)).toThrow("Invalid latitude");
  });

  it("rejects latitude < -90", () => {
    expect(() => validateLat(-91)).toThrow("Invalid latitude");
  });

  it("rejects NaN", () => {
    expect(() => validateLat(NaN)).toThrow("Invalid latitude");
  });

  it("rejects Infinity", () => {
    expect(() => validateLat(Infinity)).toThrow("Invalid latitude");
  });
});

describe("validateLon", () => {
  it("accepts valid longitudes", () => {
    expect(() => validateLon(0)).not.toThrow();
    expect(() => validateLon(180)).not.toThrow();
    expect(() => validateLon(-180)).not.toThrow();
  });

  it("rejects longitude > 180", () => {
    expect(() => validateLon(181)).toThrow("Invalid longitude");
  });

  it("rejects longitude < -180", () => {
    expect(() => validateLon(-181)).toThrow("Invalid longitude");
  });

  it("rejects NaN", () => {
    expect(() => validateLon(NaN)).toThrow("Invalid longitude");
  });
});

describe("fetchPointForecast", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws on empty parameters", async () => {
    await expect(
      fetchPointForecast("key", 0, 0, "gfs", [], ["surface"])
    ).rejects.toThrow("At least one parameter is required");
  });

  it("throws on invalid latitude", async () => {
    await expect(
      fetchPointForecast("key", 100, 0, "gfs", ["wind"], ["surface"])
    ).rejects.toThrow("Invalid latitude");
  });

  it("throws on invalid longitude", async () => {
    await expect(
      fetchPointForecast("key", 0, 200, "gfs", ["wind"], ["surface"])
    ).rejects.toThrow("Invalid longitude");
  });

  it("sends correct request and returns response", async () => {
    const mockResponse = {
      ts: [1700000000000],
      units: { "wind_u-surface": "m/s" },
      "wind_u-surface": [1.5],
      "wind_v-surface": [2.3],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );

    const result = await fetchPointForecast(
      "test-key",
      49.8,
      16.7,
      "gfs",
      ["wind"],
      ["surface"]
    );

    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.windy.com/api/point-forecast/v2",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: 49.8,
          lon: 16.7,
          model: "gfs",
          parameters: ["wind"],
          levels: ["surface"],
          key: "test-key",
        }),
      }
    );
  });

  it("throws on API error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      })
    );

    await expect(
      fetchPointForecast("bad-key", 0, 0, "gfs", ["wind"])
    ).rejects.toThrow("Windy Point Forecast API error (401): Unauthorized");
  });
});

describe("searchWebcams", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends correct request with nearby params", async () => {
    const mockResponse = { total: 1, webcams: [] };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );

    await searchWebcams("cam-key", {
      nearby: { lat: 40.7, lon: -74.0, radius: 25 },
      limit: 5,
    });

    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("nearby=40.7%2C-74%2C25");
    expect(calledUrl).toContain("limit=5");

    const calledOptions = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect((calledOptions.headers as Record<string, string>)["x-windy-api-key"]).toBe("cam-key");
  });

  it("sanitizes country code input", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ total: 0, webcams: [] }),
      })
    );

    // Attempt injection via country parameter
    await searchWebcams("key", { country: "US'; DROP TABLE--" });

    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    // Should only contain sanitized 2-letter code
    expect(calledUrl).toContain("country=US");
    expect(calledUrl).not.toContain("DROP");
  });

  it("clamps limit to valid range", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ total: 0, webcams: [] }),
      })
    );

    await searchWebcams("key", { limit: 999 });

    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("limit=50");
  });

  it("throws on API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve("Forbidden"),
      })
    );

    await expect(searchWebcams("key", {})).rejects.toThrow(
      "Windy Webcams API error (403): Forbidden"
    );
  });
});

describe("getWebcam", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sanitizes webcam ID to digits only", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ webcamId: "12345" }),
      })
    );

    await getWebcam("key", "12345abc!@#");

    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("/webcams/12345?");
    expect(calledUrl).not.toContain("abc");
  });

  it("throws on empty webcam ID after sanitization", async () => {
    await expect(getWebcam("key", "abc")).rejects.toThrow(
      "Invalid webcam ID"
    );
  });

  it("throws on API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
      })
    );

    await expect(getWebcam("key", "99999")).rejects.toThrow(
      "Windy Webcams API error (404): Not found"
    );
  });
});
