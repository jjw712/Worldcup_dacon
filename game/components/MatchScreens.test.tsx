import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MATCH_DEFINITIONS } from "../data";
import { createNewCampaign } from "../engine/campaign";
import {
  createMatch,
  skipObservationSegment,
  startMatch,
} from "../engine/matchEngine";
import { HydrationScreen, ObservationScreen } from "./MatchScreens";

describe("HydrationScreen", () => {
  it("renders the break without crashing when memo lines repeat", () => {
    const match = skipObservationSegment(
      startMatch(createMatch(MATCH_DEFINITIONS[0], createNewCampaign())),
    );
    const html = renderToStaticMarkup(
      <HydrationScreen
        match={match}
        memo={"같은 메모\n같은 메모"}
        onApplyCommand={vi.fn()}
        onQueueSubstitution={vi.fn()}
        onCancelSubstitution={vi.fn()}
        onSwitchSubTactic={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    expect(match.phase).toBe("HYDRATION_FIRST");
    expect(html).toContain("행동 선택");
    expect(html).toContain("누구에게 말할 것인가");
  });

  it("renders the paused live-substitution workspace", () => {
    const match = startMatch(
      createMatch(MATCH_DEFINITIONS[0], createNewCampaign()),
    );
    const html = renderToStaticMarkup(
      <ObservationScreen
        match={match}
        selectedPlayerId={match.players[0].id}
        memo=""
        playbackSpeed={2}
        isPaused
        onSelectPlayer={vi.fn()}
        onMemoChange={vi.fn()}
        onPlaybackSpeedChange={vi.fn()}
        onPauseChange={vi.fn()}
        onSubstitute={vi.fn()}
        onSwitchSubTactic={vi.fn()}
        onSkipToDecision={vi.fn()}
      />,
    );

    expect(html).toContain("경기 재개");
    expect(html).toContain("경기 중 선수 교체");
    expect(html).toContain("교체 명단 15");
  });
});
