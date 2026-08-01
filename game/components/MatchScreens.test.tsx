import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MATCH_DEFINITIONS } from "../data";
import { createNewCampaign } from "../engine/campaign";
import {
  continueMatch,
  createMatch,
  skipObservationSegment,
  startMatch,
} from "../engine/matchEngine";
import {
  HalfTimeScreen,
  HydrationScreen,
  ObservationScreen,
  toggleHalfTimeSubTactic,
  toggleHalfTimePlayerTarget,
  updateHalfTimeConserveTargets,
} from "./MatchScreens";

describe("halftime sub-tactic selection", () => {
  it("refunds AP when the selected sub tactic is pressed again", () => {
    const selected = toggleHalfTimeSubTactic(undefined, "sub1", 10);
    expect(selected).toEqual({ selectedSlot: "sub1", remainingAp: 8 });

    const canceled = toggleHalfTimeSubTactic(
      selected.selectedSlot,
      "sub1",
      selected.remainingAp,
    );
    expect(canceled).toEqual({ selectedSlot: undefined, remainingAp: 10 });
  });

  it("charges only the difference when changing the pending sub tactic", () => {
    const changed = toggleHalfTimeSubTactic("sub1", "sub2", 8);
    expect(changed).toEqual({ selectedSlot: "sub2", remainingAp: 6 });
  });
});

describe("halftime personal targets", () => {
  it("selects multiple players for energy conservation", () => {
    const twoPlayers = toggleHalfTimePlayerTarget(
      ["player-1"],
      "player-2",
      true,
    );
    expect(twoPlayers).toEqual(["player-1", "player-2"]);
    expect(
      toggleHalfTimePlayerTarget(twoPlayers, "player-1", true),
    ).toEqual(["player-2"]);
  });

  it("toggles off the final energy-conservation target", () => {
    const selected = ["player-1"];
    expect(toggleHalfTimePlayerTarget(selected, "player-1", true)).toEqual([]);
    expect(
      toggleHalfTimePlayerTarget(selected, "player-2", false),
    ).toEqual(["player-2"]);
  });

  it("charges and refunds one AP for each conserved player", () => {
    const added = updateHalfTimeConserveTargets(
      ["player-1"],
      "player-2",
      7,
    );
    expect(added).toEqual({
      selectedIds: ["player-1", "player-2"],
      remainingAp: 6,
    });

    const removed = updateHalfTimeConserveTargets(
      added.selectedIds,
      "player-1",
      added.remainingAp,
    );
    expect(removed).toEqual({
      selectedIds: ["player-2"],
      remainingAp: 7,
    });
  });

  it("does not add another conserved player without AP", () => {
    const selected = ["player-1"];
    const result = updateHalfTimeConserveTargets(selected, "player-2", 0);
    expect(result.selectedIds).toBe(selected);
    expect(result.remainingAp).toBe(0);
  });
});

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
    expect(html).toContain("팀 전체 지시");
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
        goalEvent={{
          id: "goal-test",
          minute: 18,
          type: "GOAL",
          side: "home",
          text: "골",
          emphasis: "important",
        }}
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
    expect(html).toContain("드래그 교체");
    expect(html).toContain("GOAL");
  });

  it("shows possession and separated shot statistics above the halftime board", () => {
    const firstBreak = skipObservationSegment(
      startMatch(createMatch(MATCH_DEFINITIONS[0], createNewCampaign())),
    );
    const halftime = skipObservationSegment(continueMatch(firstBreak));
    const html = renderToStaticMarkup(
      <HalfTimeScreen
        match={halftime}
        onApplyCommand={vi.fn()}
        onRecovery={vi.fn()}
        onQueueSubstitution={vi.fn()}
        onCancelSubstitution={vi.fn()}
        onSwitchSubTactic={vi.fn()}
        onMovePlayer={vi.fn()}
        onSwapPlayers={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(html).toContain("점유율");
    expect(html).toContain("전체 슈팅");
    expect(html).toContain("유효 슈팅");
    expect(html).toContain("비유효 슈팅");
    expect(html.indexOf("전반 경기 기록")).toBeLessThan(
      html.indexOf("tactical-board"),
    );
    expect(html).toContain("측면 넓게 활용");
    expect(html).toContain("중앙 밀집 점유");
    expect(html).toContain("롱볼 축구");
    expect(html).toContain("숏패스 위주");
    expect(html.indexOf("팀 사기·결속")).toBeLessThan(
      html.indexOf("팀 전체 지시"),
    );
    expect(html.indexOf("팀 전체 지시")).toBeLessThan(
      html.indexOf("개인 지시"),
    );
  });
});
