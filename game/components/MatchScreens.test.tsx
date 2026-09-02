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
  confirmHydrationSubTacticSelection,
  defaultPositionFilterForCommand,
  toggleHydrationSubTacticSelection,
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
  it("previews a sub tactic until the same card is pressed again", () => {
    const selected = toggleHydrationSubTacticSelection(undefined, "sub1");
    expect(selected).toBe("sub1");
    expect(toggleHydrationSubTacticSelection(selected, "sub1")).toBeUndefined();
    expect(toggleHydrationSubTacticSelection(selected, "sub2")).toBe("sub2");
  });

  it("charges hydration time only when the selected tactic is confirmed", () => {
    expect(confirmHydrationSubTacticSelection(undefined, 180)).toBeUndefined();
    expect(confirmHydrationSubTacticSelection("sub1", 180)).toEqual({
      slot: "sub1",
      cost: 18,
    });
    expect(confirmHydrationSubTacticSelection("sub2", 31)).toBeUndefined();
  });

  it("starts all-position personal commands with the full squad visible", () => {
    expect(defaultPositionFilterForCommand("CONSERVE_ENERGY")).toBe("ALL");
    expect(defaultPositionFilterForCommand("CENTRAL_RUN")).toBe("FW");
    expect(defaultPositionFilterForCommand("WINGER_TRACK")).toBe("ALL");
  });

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

  it("renders restored hydration time and delivered-command state", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"));
    try {
      const match = skipObservationSegment(
        startMatch(createMatch(MATCH_DEFINITIONS[0], createNewCampaign())),
      );
      const html = renderToStaticMarkup(
        <HydrationScreen
          match={match}
          memo=""
          progress={{
            phase: "HYDRATION_FIRST",
            countdownStartsAtMs: Date.now() - 10_000,
            spentCommandSeconds: 12,
            deliveredKinds: ["PRESS_HIGHER"],
          }}
          onApplyCommand={vi.fn()}
          onQueueSubstitution={vi.fn()}
          onCancelSubstitution={vi.fn()}
          onSwitchSubTactic={vi.fn()}
          onComplete={vi.fn()}
        />,
      );

      expect(html).toContain(">138<");
      expect(html).toContain("압박 강도 높이기");
      expect(html).toContain("전달 완료");
    } finally {
      vi.useRealTimers();
    }
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
        onSkipToDecision={vi.fn()}
        onRestartCampaign={vi.fn()}
      />,
    );

    expect(html).toContain("경기 재개");
    expect(html).toContain("경기 중 선수 교체");
    expect(html).toContain("즉시 교체");
    expect(html).toContain("22분 하이드레이션 예약");
    expect(html).not.toContain("서브 전술");
    expect(html).toContain("드래그 교체");
    expect(html).toContain("캠페인 처음부터");
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
    expect(html).toContain("별도의 경기력 페널티는 없습니다");
    expect(html).not.toContain("여러 명을 선택할 수 있으며 대가는 없습니다");
    expect(html.indexOf("팀 사기·결속")).toBeLessThan(
      html.indexOf("팀 전체 지시"),
    );
    expect(html.indexOf("팀 전체 지시")).toBeLessThan(
      html.indexOf("개인 지시"),
    );
  });
});
