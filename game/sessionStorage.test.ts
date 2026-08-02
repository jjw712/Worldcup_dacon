import { describe, expect, it } from "vitest";
import { MATCH_DEFINITIONS } from "./data";
import { createNewCampaign } from "./engine/campaign";
import {
  createMatch,
  skipObservationSegment,
  startMatch,
} from "./engine/matchEngine";
import { latestGoalEventId, parseSavedSession } from "./sessionStorage";

describe("saved game sessions", () => {
  it("restores a valid in-progress match", () => {
    const campaign = createNewCampaign(870_001);
    const match = createMatch(MATCH_DEFINITIONS[0], campaign);
    const restored = parseSavedSession(
      JSON.stringify({
        version: 1,
        screen: "match",
        campaign,
        match,
        memo: "왼쪽 압박 주의",
        playbackSpeed: 4,
      }),
    );

    expect(restored?.match?.id).toBe(match.id);
    expect(restored?.memo).toBe("왼쪽 압박 주의");
    expect(restored?.playbackSpeed).toBe(4);
  });

  it("rejects a match screen without match data", () => {
    expect(
      parseSavedSession(
        JSON.stringify({
          version: 1,
          screen: "match",
          campaign: createNewCampaign(),
        }),
      ),
    ).toBeUndefined();
  });

  it("rejects malformed JSON and normalizes optional settings", () => {
    expect(parseSavedSession("{broken")).toBeUndefined();

    const restored = parseSavedSession(
      JSON.stringify({
        version: 1,
        screen: "campaign",
        campaign: createNewCampaign(),
        playbackSpeed: 99,
      }),
    );
    expect(restored?.memo).toBe("");
    expect(restored?.playbackSpeed).toBe(1);
  });

  it("restores hydration timing and delivered-command progress", () => {
    const campaign = createNewCampaign(870_004);
    const match = skipObservationSegment(
      startMatch(createMatch(MATCH_DEFINITIONS[0], campaign)),
    );
    const hydrationProgress = {
      phase: "HYDRATION_FIRST" as const,
      countdownStartsAtMs: 1_780_000_000_000,
      spentCommandSeconds: 42,
      deliveredKinds: ["PRESS_HIGHER" as const, "CONSERVE_ENERGY" as const],
    };

    const restored = parseSavedSession(
      JSON.stringify({
        version: 1,
        screen: "match",
        campaign,
        match,
        hydrationProgress,
      }),
    );

    expect(restored?.hydrationProgress).toEqual(hydrationProgress);
  });

  it("ignores hydration progress from another phase", () => {
    const campaign = createNewCampaign(870_005);
    const match = createMatch(MATCH_DEFINITIONS[0], campaign);
    const restored = parseSavedSession(
      JSON.stringify({
        version: 1,
        screen: "match",
        campaign,
        match,
        hydrationProgress: {
          phase: "HYDRATION_FIRST",
          countdownStartsAtMs: Date.now(),
          spentCommandSeconds: 12,
          deliveredKinds: ["PRESS_HIGHER"],
        },
      }),
    );

    expect(restored?.hydrationProgress).toBeUndefined();
  });

  it("marks the newest saved goal as already presented after restoration", () => {
    const campaign = createNewCampaign(870_006);
    const match = createMatch(MATCH_DEFINITIONS[0], campaign);
    const withGoals = {
      ...match,
      events: [
        {
          id: "latest-goal",
          minute: 28,
          type: "GOAL" as const,
          side: "home" as const,
          text: "득점",
        },
        {
          id: "earlier-goal",
          minute: 9,
          type: "GOAL" as const,
          side: "away" as const,
          text: "실점",
        },
        ...match.events,
      ],
    };

    expect(latestGoalEventId(withGoals)).toBe("latest-goal");
  });
});
