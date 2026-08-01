import { describe, expect, it } from "vitest";
import { createNewCampaign } from "./campaign";
import {
  COMMANDS,
  applyCommand,
  calculateCommandCost,
  evaluateCommandImpact,
} from "./commands";
import { advanceMatch, createMatch, startMatch } from "./matchEngine";
import { MATCH_DEFINITIONS } from "../data";

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
    const match = createMatch(MATCH_DEFINITIONS[0], createNewCampaign());
    const updated = applyCommand(match, "PRESS_HIGHER", undefined, 35);

    expect(updated.homeTactic.pressing).toBeGreaterThan(
      match.homeTactic.pressing,
    );
    expect(updated.commands[0].tradeoff).toContain("체력");
  });

  it("applies the explicitly selected side for an attack-direction command", () => {
    const match = createMatch(MATCH_DEFINITIONS[0], createNewCampaign());
    const right = applyCommand(match, "ATTACK_WIDE", undefined, 30, "right");
    const left = applyCommand(right, "ATTACK_WIDE", undefined, 30, "left");

    expect(right.homeTactic.attackSide).toBe("right");
    expect(left.homeTactic.attackSide).toBe("left");
    expect(left.commands.at(-1)?.attackSide).toBe("left");
  });

  it("measures command execution from post-command match metrics", () => {
    let match = startMatch(
      createMatch(MATCH_DEFINITIONS[0], createNewCampaign()),
    );
    match = applyCommand(match, "LOWER_LINE", undefined, 24);
    for (let index = 0; index < 16; index += 1) {
      match = advanceMatch(match, 0.5);
    }

    const evaluation = evaluateCommandImpact(match, match.commands[0]);
    expect(evaluation.successRate).toBeGreaterThanOrEqual(20);
    expect(evaluation.successRate).toBeLessThanOrEqual(96);
    expect(evaluation.headline).toContain("수비 기준선");
  });
});
