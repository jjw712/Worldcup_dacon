import { describe, expect, it } from "vitest";
import { MATCH_DEFINITIONS, TEAMS } from "./data";
import { createNewCampaign } from "./engine/campaign";
import { createMatch } from "./engine/matchEngine";
import {
  GROUP_A_EXPECTED_XI_2026,
  GROUP_A_ROSTERS_2026,
} from "./rosters2026";

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

  it("maps every expected XI to the normalized player database", () => {
    for (const [teamId, lineup] of Object.entries(GROUP_A_EXPECTED_XI_2026)) {
      const roster = GROUP_A_ROSTERS_2026[teamId as keyof typeof GROUP_A_ROSTERS_2026];
      expect(lineup).toHaveLength(11);
      expect(new Set(lineup.map((entry) => entry.player_id)).size).toBe(11);
      for (const entry of lineup) {
        expect(roster.some((player) => player.id === entry.player_id)).toBe(true);
      }
    }
  });

  it("keeps Korea fixed and limits opponent XI changes to one or two players", () => {
    for (const definition of MATCH_DEFINITIONS) {
      const match = createMatch(definition, createNewCampaign());
      for (const side of ["home", "away"] as const) {
        const teamId = side === "home" ? "KOR" : definition.opponentId;
        const expectedIds = GROUP_A_EXPECTED_XI_2026[teamId].map(
          (entry) => entry.player_id,
        );
        const playerIds = match.players
          .filter((player) => player.side === side)
          .map((player) => player.id);
        if (side === "home") {
          expect(playerIds).toEqual(expectedIds);
        } else {
          const changedCount = playerIds.filter(
            (playerId) => !expectedIds.includes(playerId),
          ).length;
          expect(changedCount).toBeGreaterThanOrEqual(1);
          expect(changedCount).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it("varies opponent scouting plans between campaign playthroughs", () => {
    const definition = MATCH_DEFINITIONS[0];
    const plans = new Set(
      Array.from({ length: 12 }, (_, index) => {
        const match = createMatch(
          definition,
          createNewCampaign(80_000 + index * 997),
        );
        const lineup = match.players
          .filter((player) => player.side === "away")
          .map((player) => player.id)
          .join(",");
        return `${match.awayTeam.formationName}:${lineup}`;
      }),
    );

    expect(plans.size).toBeGreaterThan(1);
  });

  it("provides six core values and simulation attributes for all players", () => {
    for (const roster of Object.values(GROUP_A_ROSTERS_2026)) {
      for (const player of roster) {
        const values = [
          player.coreAbilities.shooting,
          player.advancedAbilities.ballControl ?? player.coreAbilities.dribbling,
          player.coreAbilities.passing,
          player.coreAbilities.defending,
          player.coreAbilities.pace,
          player.coreAbilities.physical,
          ...Object.values(player.gameAttributes),
        ];
        expect(values.every((value) => value >= 0 && value <= 100)).toBe(true);
      }
    }
  });

  it("applies Korean display names and verified weight data to all 104 players", () => {
    const allPlayers = Object.values(GROUP_A_ROSTERS_2026).flat();

    expect(allPlayers).toHaveLength(104);
    expect(allPlayers.every((player) => Boolean(player.originalName))).toBe(true);
    expect(allPlayers.every((player) => (player.weightKg ?? 0) > 0)).toBe(true);
    expect(GROUP_A_ROSTERS_2026.MEX[0]).toMatchObject({
      name: "라울 랑헬",
      originalName: "Raúl Rangel",
      weightKg: 81,
    });
    expect(GROUP_A_ROSTERS_2026.CZE[9]).toMatchObject({
      name: "파트리크 시크",
      weightKg: 87,
    });
  });
});
