import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MATCH_DEFINITIONS } from "../data";
import { createNewCampaign } from "../engine/campaign";
import { createMatch } from "../engine/matchEngine";
import { PlayerComparisonDialog } from "./PlayerComparisonDialog";
import { PreMatchScreen } from "./SetupScreens";

describe("PreMatchScreen", () => {
  it("shows the inline team toggle, bench and player information", () => {
    const match = createMatch(
      MATCH_DEFINITIONS[0],
      createNewCampaign(987_654),
    );
    const html = renderToStaticMarkup(
      <PreMatchScreen
        match={match}
        onSelectPlayer={vi.fn()}
        onMovePlayer={vi.fn()}
        onSwapPlayers={vi.fn()}
        onSubstitute={vi.fn()}
        onConfigureTactic={vi.fn()}
        onStart={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(html).toContain(match.awayTeam.formationName);
    expect(html).toContain("우리 팀");
    expect(html).toContain("상대 보기");
    expect(html).toContain("드래그 교체");
    expect(html).toContain("선발</strong><span>11명");
    expect(html).toContain("교체 명단</strong><span>15명");
    expect(html).toContain("선수를 클릭하면 능력치와 상세 정보가 표시됩니다");
    expect(html).toContain("전술 프리셋");
    expect(html).toContain("주전술");
  });

  it("compares a selected player with home and opponent roster values", () => {
    const match = createMatch(
      MATCH_DEFINITIONS[0],
      createNewCampaign(135_790),
    );
    const basePlayer = match.players.find((player) => player.side === "home")!;
    const html = renderToStaticMarkup(
      <PlayerComparisonDialog
        match={match}
        basePlayerId={basePlayer.id}
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain("선수 능력치 비교");
    expect(html).toContain("우리 팀");
    expect(html).toContain("상대 팀");
    expect(html).toContain("골 결정력");
    expect(html).toContain("차이");
  });
});
