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

  it("expires a suspension even when the suspended player does not play", () => {
    const campaign = createNewCampaign(220_101);
    const initial = createMatch(MATCH_DEFINITIONS[0], campaign);
    const player = initial.homeTeam.roster[0];
    const suspendedCampaign = {
      ...campaign,
      playerCarry: {
        ...campaign.playerCarry,
        [player.id]: {
          stamina: 88,
          condition: 84,
          yellowCards: 0,
          suspendedMatches: 1,
          injuryMatchesRemaining: 0,
          managerTrust: 72,
        },
      },
    };
    const match = createMatch(MATCH_DEFINITIONS[0], suspendedCampaign);
    expect(match.players.some((candidate) => candidate.id === player.id)).toBe(false);

    const updated = applyMatchResult(
      suspendedCampaign,
      createMatchResult(match),
    );
    expect(updated.playerCarry[player.id].suspendedMatches).toBe(0);
  });

  it("turns two accumulated yellow cards into a one-match suspension", () => {
    const campaign = createNewCampaign(220_202);
    const match = createMatch(MATCH_DEFINITIONS[0], campaign);
    const player = match.players.find((candidate) => candidate.side === "home")!;
    const campaignWithYellow = {
      ...campaign,
      playerCarry: {
        ...campaign.playerCarry,
        [player.id]: {
          stamina: 92,
          condition: 90,
          yellowCards: 1,
          suspendedMatches: 0,
          injuryMatchesRemaining: 0,
          managerTrust: 72,
        },
      },
    };
    const result = createMatchResult({
      ...match,
      players: match.players.map((candidate) =>
        candidate.id === player.id
          ? { ...candidate, card: "YELLOW" as const }
          : candidate,
      ),
    });
    const updated = applyMatchResult(campaignWithYellow, result);

    expect(updated.playerCarry[player.id].yellowCards).toBe(0);
    expect(updated.playerCarry[player.id].suspendedMatches).toBe(1);
  });
});
