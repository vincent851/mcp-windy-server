import { describe, it, expect } from "vitest";
import { formatWaveResponse } from "../../src/tools/waves.js";

describe("formatWaveResponse", () => {
  it("returns empty array for empty timestamps", () => {
    expect(formatWaveResponse({ ts: [] })).toEqual([]);
  });

  it("returns empty array for missing timestamps", () => {
    expect(formatWaveResponse({})).toEqual([]);
  });

  it("formats combined wave data", () => {
    const data = {
      ts: [1700000000000],
      "waves_height-surface": [2.5],
      "waves_period-surface": [8.3],
      "waves_direction-surface": [245.7],
    };

    const result = formatWaveResponse(data);
    expect(result).toHaveLength(1);
    expect(result[0].waves).toEqual({
      height_m: 2.5,
      period_s: 8.3,
      direction_deg: 245.7,
    });
  });

  it("formats swell1 data", () => {
    const data = {
      ts: [1700000000000],
      "swell1_height-surface": [1.8],
      "swell1_period-surface": [12.1],
      "swell1_direction-surface": [200],
    };

    const result = formatWaveResponse(data);
    expect(result[0].swell1).toEqual({
      height_m: 1.8,
      period_s: 12.1,
      direction_deg: 200,
    });
  });

  it("formats swell2 data", () => {
    const data = {
      ts: [1700000000000],
      "swell2_height-surface": [0.5],
      "swell2_period-surface": [6.0],
      "swell2_direction-surface": [310],
    };

    const result = formatWaveResponse(data);
    expect(result[0].swell2).toEqual({
      height_m: 0.5,
      period_s: 6,
      direction_deg: 310,
    });
  });

  it("formats wind waves data", () => {
    const data = {
      ts: [1700000000000],
      "windWaves_height-surface": [0.8],
      "windWaves_period-surface": [4.2],
      "windWaves_direction-surface": [180],
    };

    const result = formatWaveResponse(data);
    expect(result[0].windWaves).toEqual({
      height_m: 0.8,
      period_s: 4.2,
      direction_deg: 180,
    });
  });

  it("handles multiple timestamps with all wave types", () => {
    const data = {
      ts: [1700000000000, 1700010800000],
      "waves_height-surface": [2.0, 2.5],
      "waves_period-surface": [7.0, 8.0],
      "waves_direction-surface": [200, 210],
      "swell1_height-surface": [1.5, 1.8],
      "swell1_period-surface": [10.0, 11.0],
      "swell1_direction-surface": [195, 205],
    };

    const result = formatWaveResponse(data);
    expect(result).toHaveLength(2);
    expect(result[0].waves!.height_m).toBe(2.0);
    expect(result[1].waves!.height_m).toBe(2.5);
    expect(result[0].swell1!.height_m).toBe(1.5);
    expect(result[1].swell1!.height_m).toBe(1.8);
  });

  it("omits missing wave components", () => {
    const data = {
      ts: [1700000000000],
      "waves_height-surface": [2.0],
      "waves_period-surface": [7.0],
      "waves_direction-surface": [200],
    };

    const result = formatWaveResponse(data);
    expect(result[0].waves).toBeDefined();
    expect(result[0].swell1).toBeUndefined();
    expect(result[0].swell2).toBeUndefined();
    expect(result[0].windWaves).toBeUndefined();
  });

  it("handles null height values", () => {
    const data = {
      ts: [1700000000000],
      "waves_height-surface": [null],
    };

    const result = formatWaveResponse(data);
    expect(result[0].waves).toBeUndefined();
  });
});
