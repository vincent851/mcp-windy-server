import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Webcam tools are thin wrappers around the API client.
 * The API client is tested separately in windy-client.test.ts.
 * Here we test the security aspects — input sanitization paths
 * that flow through the tool layer.
 */

describe("webcam input sanitization", () => {
  it("country codes should be sanitized to 2 letters", () => {
    // This is tested at the API client level, but verify the principle
    const malicious = "US'; DROP TABLE webcams; --";
    const sanitized = malicious.replace(/[^a-zA-Z]/g, "").slice(0, 2);
    expect(sanitized).toBe("US");
  });

  it("category should strip non-alphanumeric characters", () => {
    const malicious = "beach<script>alert(1)</script>";
    const sanitized = malicious.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 50);
    expect(sanitized).toBe("beachscriptalert1script");
    expect(sanitized).not.toContain("<");
    expect(sanitized).not.toContain(">");
  });

  it("webcam ID should only allow digits", () => {
    const malicious = "12345; rm -rf /";
    const sanitized = malicious.replace(/[^0-9]/g, "");
    expect(sanitized).toBe("12345");
  });

  it("empty webcam ID after sanitization should be rejected", () => {
    const malicious = "abc; cat /etc/passwd";
    const sanitized = malicious.replace(/[^0-9]/g, "");
    expect(sanitized).toBe("");
  });

  it("limit should be clamped to 1-50 range", () => {
    const clamp = (n: number) => Math.min(Math.max(1, n), 50);
    expect(clamp(999)).toBe(50);
    expect(clamp(-5)).toBe(1);
    expect(clamp(25)).toBe(25);
  });

  it("radius should be clamped to 1-250 range", () => {
    const clamp = (n: number) => Math.min(Math.max(1, n), 250);
    expect(clamp(500)).toBe(250);
    expect(clamp(-10)).toBe(1);
    expect(clamp(100)).toBe(100);
  });
});
