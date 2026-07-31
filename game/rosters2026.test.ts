import { describe, expect, it } from "vitest";
import { MATCH_DEFINITIONS, TEAMS } from "./data";
import { createNewCampaign } from "./engine/campaign";
import { createMatch } from "./engine/matchEngine";
import { GROUP_A_ROSTERS_2026 } from "./rosters2026";

describe("2026 Group A rosters", () => {
  it("contains 26 unique official squad entries for every team", () => {
    for (const roster of Object.values(GROUP_A_ROSTERS_2026)) {
      expect(roster).toHaveLength(26);
      expect(new Set(roster.map((player) => player.id)).size).toBe(26);
      expect(new Set(roster.map((player) => player.shirtNumber)).size).toBe(26);
    }
  });

  it("uses the actual Korea Republic Group A opponents in match order", () => {
    expect(MATCH_DEFINITIONS.map((match) => match.opponentId)).toEqual([
      "CZE",
      "MEX",
      "RSA",
    ]);
    expect(Object.keys(TEAMS).sort()).toEqual(["CZE", "KOR", "MEX", "RSA"]);
  });

  it("selects a valid 4-3-3 for both teams from number-ordered rosters", () => {
    for (const definition of MATCH_DEFINITIONS) {
      const match = createMatch(definition, createNewCampaign());
      for (const side of ["home", "away"] as const) {
        const positions = match.players
          .filter((player) => player.side === side)
          .map((player) => player.position);
        expect(positions).toEqual([
          "GK",
          "DF",
          "DF",
          "DF",
          "DF",
          "MF",
          "MF",
          "MF",
          "FW",
          "FW",
          "FW",
        ]);
      }
    }
  });
});
