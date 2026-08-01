import { describe, expect, it } from "vitest";
import { createNewCampaign } from "./campaign";
import {
  BREAK_COMMAND_KINDS,
  COMMANDS,
  applyCommand,
  calculateCommandCost,
  evaluateCommandImpact,
} from "./commands";
import {
  advanceMatch,
  continueMatch,
  createMatch,
  skipObservationSegment,
  startMatch,
} from "./matchEngine";
import { MATCH_DEFINITIONS } from "../data";

const createHydrationBreak = () =>
  skipObservationSegment(
    startMatch(createMatch(MATCH_DEFINITIONS[0], createNewCampaign())),
  );

describe("tactical commands", () => {
  it("keeps calculated time inside the published range", () => {
    const command = COMMANDS.WINGER_TRACK;
    const result = calculateCommandCost(command, {
      averageUnderstanding: 74,
      averageTrust: 72,
      prepared: false,
      randomState: 1101,
    });

    expect(result.cost).toBeGreaterThanOrEqual(command.minCost);
    expect(result.cost).toBeLessThanOrEqual(command.maxCost);
  });

  it("rewards higher understanding and trust", () => {
    const command = COMMANDS.PRESS_HIGHER;
    const skilled = calculateCommandCost(command, {
      averageUnderstanding: 94,
      averageTrust: 92,
      prepared: false,
      randomState: 1101,
    });
    const unprepared = calculateCommandCost(command, {
      averageUnderstanding: 42,
      averageTrust: 40,
      prepared: false,
      randomState: 1101,
    });

    expect(skilled.cost).toBeLessThan(unprepared.cost);
  });

  it("applies both a benefit and a tradeoff to team tactics", () => {
    const match = createHydrationBreak();
    const updated = applyCommand(match, "PRESS_HIGHER", undefined, 35);

    expect(updated.homeTactic.pressing).toBeGreaterThan(
      match.homeTactic.pressing,
    );
    expect(updated.commands[0].tradeoff).toContain("체력");
  });

  it("applies the explicitly selected side for an attack-direction command", () => {
    const match = createHydrationBreak();
    const right = applyCommand(match, "ATTACK_WIDE", undefined, 30, "right");
    const left = applyCommand(right, "ATTACK_WIDE", undefined, 30, "left");

    expect(right.homeTactic.attackSide).toBe("right");
    expect(left.homeTactic.attackSide).toBe("left");
    expect(left.commands.at(-1)?.attackSide).toBe("left");
  });

  it("can spread attacks across both flanks", () => {
    const match = createHydrationBreak();
    const updated = applyCommand(match, "ATTACK_WIDE", undefined, 30, "both");

    expect(updated.homeTactic.attackSide).toBe("both");
    expect(updated.commands[0].attackSide).toBe("both");
  });

  it("applies distinct compact, long-ball and short-passing plans", () => {
    const match = createHydrationBreak();
    const compact = applyCommand(
      match,
      "COMPACT_POSSESSION",
      undefined,
      28,
    );
    const longBall = applyCommand(match, "LONG_BALL", undefined, 26);
    const shortPassing = applyCommand(match, "SHORT_PASSING", undefined, 26);

    expect(compact.homeTactic.width).toBeLessThan(match.homeTactic.width);
    expect(compact.homeTactic.attackSide).toBe("center");
    expect(longBall.homeTactic.passingStyle).toBe("long");
    expect(shortPassing.homeTactic.passingStyle).toBe("short");
    expect(longBall.homeTactic.tempo).toBeGreaterThan(
      shortPassing.homeTactic.tempo,
    );
  });

  it("gives energy conservation no tradeoff beyond its delivery cost", () => {
    const match = createHydrationBreak();
    const target = match.players.find(
      (player) => player.side === "home" && player.onField,
    )!;
    const updated = applyCommand(match, "CONSERVE_ENERGY", target.id, 14);
    const updatedTarget = updated.players.find(
      (player) => player.id === target.id,
    )!;

    expect(COMMANDS.CONSERVE_ENERGY.tradeoff).toBe("없음");
    expect(updatedTarget.currentStamina).toBeGreaterThan(target.currentStamina);
    expect(updated.homeTactic).toBe(match.homeTactic);
  });

  it("orders break actions by spirit, team instructions and personal instructions", () => {
    const categories = BREAK_COMMAND_KINDS.map(
      (kind) => COMMANDS[kind].category,
    );
    const firstTeamInstruction = categories.indexOf("팀 전체 지시");
    const firstPersonalInstruction = categories.indexOf("개인 지시");

    expect(categories[0]).toBe("팀 사기·결속");
    expect(firstTeamInstruction).toBeGreaterThan(0);
    expect(firstPersonalInstruction).toBeGreaterThan(firstTeamInstruction);
  });

  it("evaluates a left-side instruction from left-side threat metrics", () => {
    const match = createHydrationBreak();
    const commanded = applyCommand(
      match,
      "ATTACK_WIDE",
      undefined,
      30,
      "left",
    );
    const evaluated = {
      ...commanded,
      metrics: {
        ...commanded.metrics,
        homeLeftThreat:
          (commanded.commands[0].baseline?.metrics.homeLeftThreat ?? 0) + 3,
      },
    };
    const evaluation = evaluateCommandImpact(
      evaluated,
      commanded.commands[0],
    );

    expect(evaluation.headline).toContain("3회");
  });

  it("rejects a winger-only command for a central player", () => {
    const match = createHydrationBreak();
    const centralPlayer = match.players.find(
      (player) =>
        player.side === "home" &&
        (player.position === "MF" || player.position === "FW") &&
        !COMMANDS.WINGER_TRACK.targetDetailedPositions?.includes(
          player.detailedPosition,
        ),
    )!;

    expect(
      applyCommand(match, "WINGER_TRACK", centralPlayer.id, 12),
    ).toBe(match);
  });

  it("measures command execution from post-command match metrics", () => {
    let match = createHydrationBreak();
    match = applyCommand(match, "LOWER_LINE", undefined, 24);
    match = continueMatch(match);
    for (let index = 0; index < 16; index += 1) {
      match = advanceMatch(match, 0.5);
    }

    const evaluation = evaluateCommandImpact(match, match.commands[0]);
    expect(evaluation.successRate).toBeGreaterThanOrEqual(20);
    expect(evaluation.successRate).toBeLessThanOrEqual(96);
    expect(evaluation.headline).toContain("수비 기준선");
  });

  it("rejects commands outside a hydration break or halftime", () => {
    const active = startMatch(
      createMatch(MATCH_DEFINITIONS[0], createNewCampaign()),
    );

    expect(applyCommand(active, "PRESS_HIGHER", undefined, 30)).toBe(active);
  });
});
