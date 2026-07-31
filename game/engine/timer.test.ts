import { describe, expect, it } from "vitest";
import { calculateBreakRemaining } from "./timer";

describe("calculateBreakRemaining", () => {
  it("decreases three displayed seconds per real second", () => {
    expect(calculateBreakRemaining(1_000, 8_000)).toBe(159);
  });

  it("does not begin before the briefing transition finishes", () => {
    expect(calculateBreakRemaining(4_000, 1_000)).toBe(180);
  });

  it("never returns a negative value", () => {
    expect(calculateBreakRemaining(0, 70_000)).toBe(0);
  });

  it("deducts a delivered command's game-time cost immediately", () => {
    expect(calculateBreakRemaining(1_000, 2_000, 18)).toBe(159);
  });
});
