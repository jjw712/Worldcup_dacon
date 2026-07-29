import { describe, expect, it } from "vitest";
import { MATCH_DEFINITIONS } from "../data";
import { applyMatchResult, createNewCampaign } from "./campaign";
import { createMatch, createMatchResult } from "./matchEngine";

describe("campaign state", () => {
  it("updates the standings and advances to the next round", () => {
    const campaign = createNewCampaign();
    const match = createMatch(MATCH_DEFINITIONS[0], campaign);
    const result = createMatchResult({
      ...match,
      score: { home: 2, away: 1 },
    });
    const updated = applyMatchResult(campaign, result);

    expect(updated.currentRound).toBe(1);
    expect(updated.standings.KOR.points).toBe(3);
    expect(updated.standings.KOR.goalsFor).toBe(2);
    expect(updated.results).toHaveLength(1);
  });
});
