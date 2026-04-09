import { describe, it, expect } from "vitest";
import {
  classifySwellSize,
  swellEnergy,
  classifySwellPeriod,
  formatSwellResponse,
} from "../../src/tools/swell.js";

describe("classifySwellSize", () => {
  it("returns 'flat' for < 0.3m", () => {
    expect(classifySwellSize(0.1)).toBe("flat");
    expect(classifySwellSize(0.29)).toBe("flat");
  });

  it("returns 'small' for 0.3-0.6m", () => {
    expect(classifySwellSize(0.3)).toBe("small");
    expect(classifySwellSize(0.5)).toBe("small");
  });

  it("returns 'moderate' for 0.6-1.2m", () => {
    expect(classifySwellSize(0.6)).toBe("moderate");
    expect(classifySwellSize(1.0)).toBe("moderate");
  });

  it("returns 'large' for 1.2-2.0m", () => {
    expect(classifySwellSize(1.2)).toBe("large");
    expect(classifySwellSize(1.9)).toBe("large");
  });

  it("returns 'very large' for 2.0-3.0m", () => {
    expect(classifySwellSize(2.0)).toBe("very large");
    expect(classifySwellSize(2.9)).toBe("very large");
  });

  it("returns 'huge' for 3.0-5.0m", () => {
    expect(classifySwellSize(3.0)).toBe("huge");
    expect(classifySwellSize(4.9)).toBe("huge");
  });

  it("returns 'extreme' for >= 5.0m", () => {
    expect(classifySwellSize(5.0)).toBe("extreme");
    expect(classifySwellSize(10.0)).toBe("extreme");
  });
});

describe("swellEnergy", () => {
  it("returns 0 for 0 height", () => {
    expect(swellEnergy(0, 10)).toBe(0);
  });

  it("returns 0 for 0 period", () => {
    expect(swellEnergy(2, 0)).toBe(0);
  });

  it("computes height² × period", () => {
    expect(swellEnergy(2, 10)).toBe(40); // 2² × 10 = 40
    expect(swellEnergy(1, 12)).toBe(12); // 1² × 12 = 12
    expect(swellEnergy(3, 8)).toBe(72); // 3² × 8 = 72
  });
});

describe("classifySwellPeriod", () => {
  it("returns 'short (wind swell)' for < 6s", () => {
    expect(classifySwellPeriod(3)).toBe("short (wind swell)");
    expect(classifySwellPeriod(5.9)).toBe("short (wind swell)");
  });

  it("returns 'medium' for 6-9s", () => {
    expect(classifySwellPeriod(6)).toBe("medium");
    expect(classifySwellPeriod(8)).toBe("medium");
  });

  it("returns 'long (ground swell)' for 9-13s", () => {
    expect(classifySwellPeriod(9)).toBe("long (ground swell)");
    expect(classifySwellPeriod(12)).toBe("long (ground swell)");
  });

  it("returns 'very long (deep water swell)' for 13-18s", () => {
    expect(classifySwellPeriod(13)).toBe("very long (deep water swell)");
    expect(classifySwellPeriod(17)).toBe("very long (deep water swell)");
  });

  it("returns 'ultra long' for >= 18s", () => {
    expect(classifySwellPeriod(18)).toBe("ultra long");
    expect(classifySwellPeriod(25)).toBe("ultra long");
  });
});

describe("formatSwellResponse", () => {
  it("returns empty array for empty timestamps", () => {
    expect(formatSwellResponse({ ts: [] })).toEqual([]);
  });

  it("returns empty array for missing timestamps", () => {
    expect(formatSwellResponse({})).toEqual([]);
  });

  it("formats primary swell with all detail fields", () => {
    const data = {
      ts: [1700000000000],
      "swell1_height-surface": [1.5],
      "swell1_period-surface": [10.0],
      "swell1_direction-surface": [220],
    };

    const result = formatSwellResponse(data);
    expect(result).toHaveLength(1);

    const swell = result[0].primary_swell!;
    expect(swell.height_m).toBe(1.5);
    expect(swell.height_ft).toBeCloseTo(4.9, 1);
    expect(swell.period_s).toBe(10);
    expect(swell.period_quality).toBe("long (ground swell)");
    expect(swell.direction_deg).toBe(220);
    expect(swell.compass).toBe("SW");
    expect(swell.energy).toBe(22.5); // 1.5² × 10
    expect(swell.size_class).toBe("large");
  });

  it("formats secondary swell", () => {
    const data = {
      ts: [1700000000000],
      "swell2_height-surface": [0.5],
      "swell2_period-surface": [7.0],
      "swell2_direction-surface": [310],
    };

    const result = formatSwellResponse(data);
    expect(result[0].secondary_swell).toBeDefined();
    expect(result[0].secondary_swell!.height_m).toBe(0.5);
    expect(result[0].secondary_swell!.size_class).toBe("small");
  });

  it("formats combined seas", () => {
    const data = {
      ts: [1700000000000],
      "waves_height-surface": [2.0],
      "waves_period-surface": [8.0],
      "waves_direction-surface": [180],
    };

    const result = formatSwellResponse(data);
    expect(result[0].combined_seas).toBeDefined();
    expect(result[0].combined_seas!.height_m).toBe(2.0);
    expect(result[0].combined_seas!.size_class).toBe("very large");
  });

  it("formats wind waves", () => {
    const data = {
      ts: [1700000000000],
      "windWaves_height-surface": [0.8],
      "windWaves_period-surface": [4.0],
      "windWaves_direction-surface": [90],
    };

    const result = formatSwellResponse(data);
    expect(result[0].wind_waves).toBeDefined();
    expect(result[0].wind_waves!.period_quality).toBe("short (wind swell)");
  });

  it("converts height to feet correctly", () => {
    const data = {
      ts: [1700000000000],
      "swell1_height-surface": [1.0],
      "swell1_period-surface": [10.0],
      "swell1_direction-surface": [0],
    };

    const result = formatSwellResponse(data);
    expect(result[0].primary_swell!.height_ft).toBeCloseTo(3.3, 1);
  });

  it("handles multiple timestamps", () => {
    const data = {
      ts: [1700000000000, 1700010800000],
      "swell1_height-surface": [1.0, 2.0],
      "swell1_period-surface": [8.0, 12.0],
      "swell1_direction-surface": [200, 210],
    };

    const result = formatSwellResponse(data);
    expect(result).toHaveLength(2);
    expect(result[0].primary_swell!.size_class).toBe("moderate");
    expect(result[1].primary_swell!.size_class).toBe("very large");
  });

  it("omits missing swell components", () => {
    const data = {
      ts: [1700000000000],
      "swell1_height-surface": [1.5],
      "swell1_period-surface": [10.0],
      "swell1_direction-surface": [200],
    };

    const result = formatSwellResponse(data);
    expect(result[0].primary_swell).toBeDefined();
    expect(result[0].secondary_swell).toBeUndefined();
    expect(result[0].combined_seas).toBeUndefined();
    expect(result[0].wind_waves).toBeUndefined();
  });

  it("handles null height values", () => {
    const data = {
      ts: [1700000000000],
      "swell1_height-surface": [null],
    };

    const result = formatSwellResponse(data);
    expect(result[0].primary_swell).toBeUndefined();
  });
});
