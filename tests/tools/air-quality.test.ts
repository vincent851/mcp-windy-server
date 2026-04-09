import { describe, it, expect } from "vitest";
import { formatAirQualityResponse } from "../../src/tools/air-quality.js";

describe("formatAirQualityResponse", () => {
  it("returns empty array for empty timestamps", () => {
    expect(formatAirQualityResponse({ ts: [] })).toEqual([]);
  });

  it("returns empty array for missing timestamps", () => {
    expect(formatAirQualityResponse({})).toEqual([]);
  });

  it("formats NO2 data with kg/m³ to µg/m³ conversion", () => {
    const data = {
      ts: [1700000000000],
      "no2-surface": [0.00000002], // 20 µg/m³ when *1e9
    };

    const result = formatAirQualityResponse(data);
    expect(result[0].no2).toBeCloseTo(20, 0);
  });

  it("formats PM2.5 data", () => {
    const data = {
      ts: [1700000000000],
      "pm2p5-surface": [0.000000015], // 15 µg/m³
    };

    const result = formatAirQualityResponse(data);
    expect(result[0].pm2_5).toBeCloseTo(15, 0);
  });

  it("formats PM10 data", () => {
    const data = {
      ts: [1700000000000],
      "pm10-surface": [0.00000005], // 50 µg/m³
    };

    const result = formatAirQualityResponse(data);
    expect(result[0].pm10).toBeCloseTo(50, 0);
  });

  it("formats O3 data", () => {
    const data = {
      ts: [1700000000000],
      "o3-surface": [0.00000008], // 80 µg/m³
    };

    const result = formatAirQualityResponse(data);
    expect(result[0].o3).toBeCloseTo(80, 0);
  });

  it("formats SO2 data", () => {
    const data = {
      ts: [1700000000000],
      "so2-surface": [0.00000001], // 10 µg/m³
    };

    const result = formatAirQualityResponse(data);
    expect(result[0].so2).toBeCloseTo(10, 0);
  });

  it("handles all pollutants together", () => {
    const data = {
      ts: [1700000000000],
      "no2-surface": [0.00000002],
      "pm2p5-surface": [0.000000015],
      "pm10-surface": [0.00000005],
      "o3-surface": [0.00000008],
      "so2-surface": [0.00000001],
    };

    const result = formatAirQualityResponse(data);
    expect(result[0].no2).toBeDefined();
    expect(result[0].pm2_5).toBeDefined();
    expect(result[0].pm10).toBeDefined();
    expect(result[0].o3).toBeDefined();
    expect(result[0].so2).toBeDefined();
  });

  it("handles multiple timestamps", () => {
    const data = {
      ts: [1700000000000, 1700010800000],
      "pm2p5-surface": [0.000000010, 0.000000025],
    };

    const result = formatAirQualityResponse(data);
    expect(result).toHaveLength(2);
    expect(result[0].pm2_5).toBeCloseTo(10, 0);
    expect(result[1].pm2_5).toBeCloseTo(25, 0);
  });

  it("handles null values", () => {
    const data = {
      ts: [1700000000000],
      "no2-surface": [null],
    };

    const result = formatAirQualityResponse(data);
    expect(result[0].no2).toBeUndefined();
  });

  it("omits missing pollutants", () => {
    const data = {
      ts: [1700000000000],
      "no2-surface": [0.00000002],
    };

    const result = formatAirQualityResponse(data);
    expect(result[0].no2).toBeDefined();
    expect(result[0].pm2_5).toBeUndefined();
    expect(result[0].pm10).toBeUndefined();
  });
});
