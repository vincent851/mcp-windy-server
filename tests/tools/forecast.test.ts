import { describe, it, expect } from "vitest";
import { formatForecastResponse } from "../../src/tools/forecast.js";

describe("formatForecastResponse", () => {
  it("returns empty array for empty timestamps", () => {
    expect(formatForecastResponse({ ts: [] }, "surface")).toEqual([]);
  });

  it("returns empty array for missing timestamps", () => {
    expect(formatForecastResponse({}, "surface")).toEqual([]);
  });

  it("formats wind data with speed and direction", () => {
    const data = {
      ts: [1700000000000],
      "wind_u-surface": [3],
      "wind_v-surface": [4],
    };

    const result = formatForecastResponse(data, "surface");
    expect(result).toHaveLength(1);
    expect(result[0].wind).toBeDefined();
    expect(result[0].wind!.speed_ms).toBe(5); // 3-4-5 triangle
    expect(result[0].wind!.speed_kmh).toBe(18); // 5 * 3.6
    expect(result[0].wind!.compass).toBeTruthy();
  });

  it("formats temperature from Kelvin to Celsius", () => {
    const data = {
      ts: [1700000000000],
      "temp-surface": [293.15],
    };

    const result = formatForecastResponse(data, "surface");
    expect(result[0].temperature).toEqual({ celsius: 20 });
  });

  it("formats pressure from Pa to hPa", () => {
    const data = {
      ts: [1700000000000],
      "pressure-surface": [101325],
    };

    const result = formatForecastResponse(data, "surface");
    expect(result[0].pressure).toEqual({ hpa: 1013.25 });
  });

  it("formats precipitation from m to mm", () => {
    const data = {
      ts: [1700000000000],
      "past3hprecip-surface": [0.005],
      "ptype-surface": [1],
    };

    const result = formatForecastResponse(data, "surface");
    expect(result[0].precipitation).toEqual({ mm: 5, type: "rain" });
  });

  it("formats cloud coverage", () => {
    const data = {
      ts: [1700000000000],
      "lclouds-surface": [50],
      "mclouds-surface": [30],
      "hclouds-surface": [10],
    };

    const result = formatForecastResponse(data, "surface");
    expect(result[0].clouds).toEqual({ low: 50, mid: 30, high: 10 });
  });

  it("formats CAPE", () => {
    const data = {
      ts: [1700000000000],
      "cape-surface": [1500],
    };

    const result = formatForecastResponse(data, "surface");
    expect(result[0].cape).toBe(1500);
  });

  it("handles multiple timestamps", () => {
    const data = {
      ts: [1700000000000, 1700010800000, 1700021600000],
      "temp-surface": [280, 285, 290],
    };

    const result = formatForecastResponse(data, "surface");
    expect(result).toHaveLength(3);
    expect(result[0].temperature!.celsius).toBeCloseTo(6.85, 1);
    expect(result[1].temperature!.celsius).toBeCloseTo(11.85, 1);
    expect(result[2].temperature!.celsius).toBeCloseTo(16.85, 1);
  });

  it("handles null values gracefully", () => {
    const data = {
      ts: [1700000000000],
      "temp-surface": [null],
      "wind_u-surface": [null],
    };

    const result = formatForecastResponse(data, "surface");
    expect(result[0].temperature).toBeUndefined();
    expect(result[0].wind).toBeUndefined();
  });

  it("uses correct level suffix", () => {
    const data = {
      ts: [1700000000000],
      "temp-850h": [265],
    };

    const result = formatForecastResponse(data, "850h");
    expect(result[0].temperature).toBeDefined();
    expect(result[0].temperature!.celsius).toBeCloseTo(-8.15, 1);
  });

  it("formats ISO timestamp correctly", () => {
    const data = { ts: [1700000000000] };
    const result = formatForecastResponse(data, "surface");
    expect(result[0].time).toBe("2023-11-14T22:13:20.000Z");
  });
});
