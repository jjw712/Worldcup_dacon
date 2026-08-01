import { describe, expect, it } from "vitest";
import { MATCH_DEFINITIONS } from "../data";
import { createNewCampaign } from "./campaign";
import {
  advanceMatch,
  advanceMatchTicks,
  applyHalfTimeRecovery,
  cancelPendingSubstitution,
  configureTacticLoadout,
  continueMatch,
  createMatch,
  createMatchResult,
  moveHomePlayer,
  queueSubstitution,
  skipObservationSegment,
  startMatch,
  substituteHalfTimePlayer,
  substitutePausedPlayer,
  substitutePreMatchPlayer,
  swapHomePlayerPositions,
  switchToSubTactic,
} from "./matchEngine";

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
  it("configures three unique tactics before kickoff and only switches to loaded sub tactics", () => {
    let prepared = createMatch(
      MATCH_DEFINITIONS[0],
      createNewCampaign(909_101),
    );
    prepared = configureTacticLoadout(prepared, "main", "PRESS_343");
    prepared = configureTacticLoadout(prepared, "sub1", "CONTROL_4231");
    prepared = configureTacticLoadout(prepared, "sub2", "COUNTER_442");

    expect(new Set(Object.values(prepared.tacticLoadout)).size).toBe(3);
    expect(prepared.homeTactic.presetId).toBe("PRESS_343");
    expect(prepared.homeTeam.formationName).toBe("3-4-3");

    const active = startMatch(prepared);
    const switched = switchToSubTactic(active, "sub1");
    expect(switched.homeTactic.presetId).toBe("CONTROL_4231");
    expect(switched.homeTeam.formationName).toBe("4-2-3-1");
    expect(switched.events[0].text).toContain("전술 전환");
  });

  it("applies an immediate substitution while active play is paused by the UI", () => {
    const active = startMatch(
      createMatch(MATCH_DEFINITIONS[0], createNewCampaign(111_222)),
    );
    const outgoing = active.players.find(
      (player) => player.side === "home" && player.position !== "GK",
    )!;
    const startingIds = new Set(active.players.map((player) => player.id));
    const incoming = active.homeTeam.roster.find(
      (player) => !startingIds.has(player.id) && player.position !== "GK",
    )!;

    const substituted = substitutePausedPlayer(active, outgoing.id, incoming.id);

    expect(substituted.substitutionsUsed).toBe(1);
    expect(substituted.players.some((player) => player.id === outgoing.id)).toBe(false);
    expect(substituted.players.some((player) => player.id === incoming.id)).toBe(true);
    expect(substituted.substitutedOutPlayerStates).toContainEqual(outgoing);
    expect(
      createMatchResult(substituted).playerStates.some(
        (player) => player.id === outgoing.id,
      ),
    ).toBe(true);
  });

  it("allows an injured player who has left the field to be replaced", () => {
    const active = startMatch(
      createMatch(MATCH_DEFINITIONS[0], createNewCampaign(111_223)),
    );
    const outgoing = active.players.find(
      (player) => player.side === "home" && player.position !== "GK",
    )!;
    const startingIds = new Set(active.players.map((player) => player.id));
    const incoming = active.homeTeam.roster.find(
      (player) => !startingIds.has(player.id) && player.position !== "GK",
    )!;
    const injured = {
      ...active,
      players: active.players.map((player) =>
        player.id === outgoing.id
          ? { ...player, injured: true, onField: false }
          : player,
      ),
    };

    const substituted = substitutePausedPlayer(
      injured,
      outgoing.id,
      incoming.id,
    );

    expect(substituted.substitutionsUsed).toBe(1);
    expect(substituted.players.some((player) => player.id === incoming.id)).toBe(
      true,
    );
    expect(substituted.substitutedOutPlayerIds).toContain(outgoing.id);
  });

  it("queues a hydration substitution, allows cancellation and applies it on resume", () => {
    const hydration = skipObservationSegment(
      startMatch(createMatch(MATCH_DEFINITIONS[0], createNewCampaign(222_333))),
    );
    const outgoing = hydration.players.find(
      (player) => player.side === "home" && player.position !== "GK",
    )!;
    const startingIds = new Set(hydration.players.map((player) => player.id));
    const incoming = hydration.homeTeam.roster.find(
      (player) => !startingIds.has(player.id) && player.position !== "GK",
    )!;
    const queued = queueSubstitution(hydration, outgoing.id, incoming.id);

    expect(queued.pendingSubstitutions).toHaveLength(1);
    expect(queued.players.some((player) => player.id === outgoing.id)).toBe(true);
    expect(
      cancelPendingSubstitution(queued, queued.pendingSubstitutions[0].id)
        .pendingSubstitutions,
    ).toHaveLength(0);

    const resumed = continueMatch(queued);
    expect(resumed.phase).toBe("OBSERVE_22_45");
    expect(resumed.pendingSubstitutions).toHaveLength(0);
    expect(resumed.substitutionsUsed).toBe(1);
    expect(resumed.players.some((player) => player.id === incoming.id)).toBe(true);
    expect(resumed.events[1].text).toContain("예약 교체 적용");
  });

  it("clears a queued substitution that becomes invalid before resuming", () => {
    const hydration = skipObservationSegment(
      startMatch(createMatch(MATCH_DEFINITIONS[0], createNewCampaign(222_334))),
    );
    const outgoing = hydration.players.find(
      (player) => player.side === "home" && player.position !== "GK",
    )!;
    const startingIds = new Set(hydration.players.map((player) => player.id));
    const incoming = hydration.homeTeam.roster.find(
      (player) => !startingIds.has(player.id) && player.position !== "GK",
    )!;
    const queued = queueSubstitution(hydration, outgoing.id, incoming.id);
    const invalidated = {
      ...queued,
      players: queued.players.map((player) =>
        player.id === outgoing.id
          ? { ...player, onField: false, injured: false }
          : player,
      ),
    };

    const resumed = continueMatch(invalidated);

    expect(resumed.pendingSubstitutions).toHaveLength(0);
    expect(resumed.substitutionsUsed).toBe(0);
  });

  it("reserves a paused substitution for the selected future break", () => {
    const active = startMatch(
      createMatch(MATCH_DEFINITIONS[0], createNewCampaign(333_444)),
    );
    const outgoing = active.players.find(
      (player) => player.side === "home" && player.position !== "GK",
    )!;
    const startingIds = new Set(active.players.map((player) => player.id));
    const incoming = active.homeTeam.roster.find(
      (player) => !startingIds.has(player.id) && player.position !== "GK",
    )!;
    const queued = queueSubstitution(
      active,
      outgoing.id,
      incoming.id,
      "HALF_TIME",
    );

    const hydration = skipObservationSegment(queued);
    const secondSegment = continueMatch(hydration);
    expect(secondSegment.pendingSubstitutions).toHaveLength(1);

    const halftime = skipObservationSegment(secondSegment);
    const secondHalf = continueMatch(halftime);
    expect(secondHalf.pendingSubstitutions).toHaveLength(0);
    expect(secondHalf.players.some((player) => player.id === incoming.id)).toBe(true);
  });

  it("allows repositioning home players during halftime", () => {
    const hydration = skipObservationSegment(
      startMatch(createMatch(MATCH_DEFINITIONS[0], createNewCampaign())),
    );
    const halftime = skipObservationSegment(continueMatch(hydration));
    const player = halftime.players.find((candidate) => candidate.side === "home")!;
    const moved = moveHomePlayer(halftime, player.id, 0.44, 0.71);

    expect(moved.players.find((candidate) => candidate.id === player.id)).toMatchObject({
      x: 0.44,
      y: 0.71,
      baseX: 0.44,
      baseY: 0.71,
    });
  });

  it("swaps two home-player positions when one is dropped on the other", () => {
    const match = createMatch(
      MATCH_DEFINITIONS[0],
      createNewCampaign(555_111),
    );
    const [first, second] = match.players.filter(
      (player) => player.side === "home" && player.position !== "GK",
    );
    const swapped = swapHomePlayerPositions(
      moveHomePlayer(match, first.id, second.x, second.y),
      first.id,
      second.id,
      first.x,
      first.y,
    );

    expect(swapped.players.find((player) => player.id === first.id)).toMatchObject({
      x: second.x,
      y: second.y,
    });
    expect(swapped.players.find((player) => player.id === second.id)).toMatchObject({
      x: first.x,
      y: first.y,
    });
  });

  it("does not swap a goalkeeper with an outfield player", () => {
    const match = createMatch(
      MATCH_DEFINITIONS[0],
      createNewCampaign(555_112),
    );
    const goalkeeper = match.players.find(
      (player) => player.side === "home" && player.position === "GK",
    )!;
    const outfieldPlayer = match.players.find(
      (player) => player.side === "home" && player.position !== "GK",
    )!;
    const positioned = moveHomePlayer(
      match,
      goalkeeper.id,
      outfieldPlayer.x,
      outfieldPlayer.y,
    );

    expect(
      swapHomePlayerPositions(
        positioned,
        goalkeeper.id,
        outfieldPlayer.id,
        goalkeeper.x,
        goalkeeper.y,
      ),
    ).toBe(positioned);
  });

  it("rejects goalkeeper and outfield-player substitutions", () => {
    const initial = createMatch(
      MATCH_DEFINITIONS[0],
      createNewCampaign(123_457),
    );
    const goalkeeper = initial.players.find(
      (player) => player.side === "home" && player.position === "GK",
    )!;
    const startingIds = new Set(initial.players.map((player) => player.id));
    const outfieldBenchPlayer = initial.homeTeam.roster.find(
      (player) => !startingIds.has(player.id) && player.position !== "GK",
    )!;

    expect(
      substitutePreMatchPlayer(
        initial,
        goalkeeper.id,
        outfieldBenchPlayer.id,
      ),
    ).toBe(initial);

    const active = startMatch(initial);
    expect(
      substitutePausedPlayer(active, goalkeeper.id, outfieldBenchPlayer.id),
    ).toBe(active);

    const hydration = skipObservationSegment(active);
    expect(
      queueSubstitution(hydration, goalkeeper.id, outfieldBenchPlayer.id),
    ).toBe(hydration);

    const halftime = skipObservationSegment(continueMatch(hydration));
    expect(
      substituteHalfTimePlayer(
        halftime,
        goalkeeper.id,
        outfieldBenchPlayer.id,
      ),
    ).toBe(halftime);
  });

  it("replaces a pre-match starter with a bench player in the same tactical slot", () => {
    const initial = createMatch(
      MATCH_DEFINITIONS[0],
      createNewCampaign(123_456),
    );
    const outgoing = initial.players.find(
      (player) => player.side === "home" && player.position !== "GK",
    )!;
    const startingIds = new Set(initial.players.map((player) => player.id));
    const incoming = initial.homeTeam.roster.find(
      (player) => !startingIds.has(player.id) && player.position !== "GK",
    )!;
    const substituted = substitutePreMatchPlayer(
      initial,
      outgoing.id,
      incoming.id,
    );
    const replacement = substituted.players.find(
      (player) => player.id === incoming.id,
    );

    expect(substituted.players.some((player) => player.id === outgoing.id)).toBe(false);
    expect(replacement).toMatchObject({ x: outgoing.x, y: outgoing.y, onField: true });
    expect(replacement?.name).toBe(incoming.name);
  });

  it("applies halftime substitutions and prevents an outgoing player from returning", () => {
    let halftime = skipObservationSegment(
      continueMatch(
        skipObservationSegment(
          startMatch(createMatch(MATCH_DEFINITIONS[0], createNewCampaign(456_789))),
        ),
      ),
    );
    expect(halftime.phase).toBe("HALF_TIME");
    const outgoing = halftime.players.find(
      (player) => player.side === "home" && player.position !== "GK",
    )!;
    const startingIds = new Set(halftime.players.map((player) => player.id));
    const incoming = halftime.homeTeam.roster.find(
      (player) => !startingIds.has(player.id) && player.position !== "GK",
    )!;

    halftime = substituteHalfTimePlayer(halftime, outgoing.id, incoming.id);

    expect(halftime.substitutionsUsed).toBe(1);
    expect(halftime.substitutedOutPlayerIds).toContain(outgoing.id);
    expect(halftime.players.some((player) => player.id === incoming.id)).toBe(true);
    expect(
      substituteHalfTimePlayer(halftime, incoming.id, outgoing.id),
    ).toBe(halftime);
  });

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

  it("records possession and separates total shots from shots on target", () => {
    const match = runSeconds(60);
    expect(
      (match.metrics.homePossessionSeconds ?? 0) +
        (match.metrics.awayPossessionSeconds ?? 0),
    ).toBeGreaterThan(0);
    expect(match.metrics.homeShotsOnTarget ?? 0).toBeLessThanOrEqual(
      match.metrics.homeShots,
    );
    expect(match.metrics.awayShotsOnTarget ?? 0).toBeLessThanOrEqual(
      match.metrics.awayShots,
    );
  });

  it("keeps generated event identifiers unique after the feed reaches its cap", () => {
    const match = runSeconds(60);
    const ids = match.events.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);
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

  it("skips only to the next automatic decision point", () => {
    const initial = startMatch(
      createMatch(MATCH_DEFINITIONS[0], createNewCampaign()),
    );
    const skipped = skipObservationSegment(initial);

    expect(skipped.phase).toBe("HYDRATION_FIRST");
    expect(skipped.gameMinute).toBe(22);
    expect(skipped.events.length).toBeGreaterThan(1);
  });

  it("produces identical state at 1x, 2x, 4x and skip", () => {
    const makeInitial = () =>
      startMatch(createMatch(MATCH_DEFINITIONS[0], createNewCampaign()));
    let oneTimes = makeInitial();
    let twoTimes = makeInitial();
    let fourTimes = makeInitial();
    for (let interval = 0; interval < 120; interval += 1) {
      oneTimes = advanceMatchTicks(oneTimes, 1);
    }
    for (let interval = 0; interval < 60; interval += 1) {
      twoTimes = advanceMatchTicks(twoTimes, 2);
    }
    for (let interval = 0; interval < 30; interval += 1) {
      fourTimes = advanceMatchTicks(fourTimes, 4);
    }
    const skipped = skipObservationSegment(makeInitial());

    expect(twoTimes).toEqual(oneTimes);
    expect(fourTimes).toEqual(oneTimes);
    expect(skipped).toEqual(oneTimes);
  });

  it("tracks halftime recovery as visible bonus stamina", () => {
    const match = {
      ...createMatch(MATCH_DEFINITIONS[0], createNewCampaign()),
      phase: "HALF_TIME" as const,
    };
    const recovered = applyHalfTimeRecovery(match);
    const homePlayers = recovered.players.filter(
      (player) => player.side === "home",
    );

    expect(homePlayers.every((player) => player.bonusStamina === 12)).toBe(
      true,
    );
    expect(recovered.commands.at(-1)?.kind).toBe("HALFTIME_RECOVERY");
  });

  it("does not apply halftime recovery outside halftime", () => {
    const active = startMatch(
      createMatch(MATCH_DEFINITIONS[0], createNewCampaign()),
    );

    expect(applyHalfTimeRecovery(active)).toBe(active);
  });
});
