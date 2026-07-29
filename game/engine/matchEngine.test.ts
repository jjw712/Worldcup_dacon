import { describe, expect, it } from "vitest";
import { MATCH_DEFINITIONS } from "../data";
import { createNewCampaign } from "./campaign";
import { advanceMatch, createMatch, startMatch } from "./matchEngine";

const runSeconds = (seconds: number) => {
  let match = startMatch(
    createMatch(MATCH_DEFINITIONS[0], createNewCampaign()),
  );
  for (let index = 0; index < seconds * 2; index += 1) {
    match = advanceMatch(match, 0.5);
  }
  return match;
};

describe("match engine", () => {
  it("moves the first observation segment to the hydration break", () => {
    const match = runSeconds(60);
    expect(match.phase).toBe("HYDRATION_FIRST");
    expect(match.gameMinute).toBe(22);
  });

  it("is deterministic for the same campaign and seed", () => {
    const first = runSeconds(35);
    const second = runSeconds(35);

    expect(first.score).toEqual(second.score);
    expect(first.metrics).toEqual(second.metrics);
    expect(first.events.map((event) => event.text)).toEqual(
      second.events.map((event) => event.text),
    );
  });

  it("never drains stamina below zero", () => {
    const match = runSeconds(60);
    expect(
      match.players.every((player) => player.currentStamina >= 0),
    ).toBe(true);
  });

  it("moves players into distinct support and pressing runs", () => {
    const initial = startMatch(
      createMatch(MATCH_DEFINITIONS[0], createNewCampaign()),
    );
    const evolved = runSeconds(8);
    const movedPlayers = evolved.players.filter((player) => {
      const original = initial.players.find(
        (candidate) => candidate.id === player.id,
      );
      return (
        original &&
        Math.hypot(player.x - original.x, player.y - original.y) > 0.035
      );
    });

    expect(movedPlayers.length).toBeGreaterThanOrEqual(6);
    expect(evolved.ball.ownerPlayerId).toBeTruthy();
  });
});
