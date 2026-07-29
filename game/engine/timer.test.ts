import { describe, expect, it } from "vitest";
import { calculateBreakRemaining } from "./timer";

describe("calculateBreakRemaining", () => {
  it("decreases three displayed seconds per real second", () => {
    expect(calculateBreakRemaining(1_000, 8_000, 0)).toBe(159);
  });

  it("deducts command time immediately", () => {
    expect(calculateBreakRemaining(1_000, 8_000, 38)).toBe(121);
  });

  it("never returns a negative value", () => {
    expect(calculateBreakRemaining(0, 70_000, 50)).toBe(0);
  });
});
