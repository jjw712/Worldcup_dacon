import { describe, expect, it } from "vitest";
import { MATCH_DEFINITIONS } from "./data";
import { createNewCampaign } from "./engine/campaign";
import { createMatch } from "./engine/matchEngine";
import { parseSavedSession } from "./sessionStorage";

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
});
