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
import type { MatchState } from "../types";
import {
  resolveRosterExchange,
  rosterComparisonRows,
  TeamRosterPanel,
} from "./TeamRosterPanel";

const renderHomeRoster = (
  match: MatchState,
  substitutionMode: "lineup" | "queue",
) =>
  renderToStaticMarkup(
    <TeamRosterPanel
      match={match}
      side="home"
      selectedPlayerId={match.players.find((player) => player.side === "home")?.id}
      onSelectPlayer={vi.fn()}
      allowSubstitution
      substitutionMode={substitutionMode}
      onSubstitute={vi.fn()}
    />,
  );

describe("TeamRosterPanel hover comparison", () => {
  it("uses the same hover-comparison contract before the match and at halftime", () => {
    const preMatch = createMatch(
      MATCH_DEFINITIONS[0],
      createNewCampaign(246_810),
    );
    const firstBreak = skipObservationSegment(startMatch(preMatch));
    const halfTime = skipObservationSegment(continueMatch(firstBreak));

    const preMatchHtml = renderHomeRoster(preMatch, "lineup");
    const halfTimeHtml = renderHomeRoster(halfTime, "queue");

    for (const html of [preMatchHtml, halfTimeHtml]) {
      expect(html).toContain('data-hover-comparison="enabled"');
      expect(html).toContain("마우스를 올리면 교체 능력을 비교합니다");
    }
  });

  it("compares a goalkeeper with an outfield player using common abilities", () => {
    const match = createMatch(
      MATCH_DEFINITIONS[0],
      createNewCampaign(246_811),
    );
    const goalkeeper = match.homeTeam.roster.find(
      (player) => player.position === "GK",
    )!;
    const outfieldPlayer = match.homeTeam.roster.find(
      (player) => player.position !== "GK",
    )!;

    const rows = rosterComparisonRows(goalkeeper, outfieldPlayer);

    expect(rows.map((row) => row.label)).toEqual([
      "종합",
      "속도",
      "슈팅",
      "패스",
      "수비",
      "피지컬",
    ]);
    expect(rows.every((row) => row.baseValue >= 0)).toBe(true);
    expect(rows.every((row) => row.candidateValue >= 0)).toBe(true);
  });

  it("offers the same exchange whether the selected player is a starter or substitute", () => {
    const match = createMatch(
      MATCH_DEFINITIONS[0],
      createNewCampaign(246_812),
    );
    const starter = match.players.find(
      (player) => player.side === "home" && player.position !== "GK",
    )!;
    const startingIds = new Set(
      match.players
        .filter((player) => player.side === "home" && player.onField)
        .map((player) => player.id),
    );
    const substitute = match.homeTeam.roster.find(
      (player) =>
        !startingIds.has(player.id) && player.position !== "GK",
    )!;

    expect(resolveRosterExchange(starter, substitute, startingIds)).toEqual({
      outgoing: starter,
      incoming: substitute,
    });
    expect(resolveRosterExchange(substitute, starter, startingIds)).toEqual({
      outgoing: starter,
      incoming: substitute,
    });
  });

  it("keeps comparison but does not offer an exchange for goalkeeper-outfield pairs", () => {
    const match = createMatch(
      MATCH_DEFINITIONS[0],
      createNewCampaign(246_813),
    );
    const startingIds = new Set(
      match.players
        .filter((player) => player.side === "home" && player.onField)
        .map((player) => player.id),
    );
    const goalkeeper = match.homeTeam.roster.find(
      (player) => player.position === "GK" && startingIds.has(player.id),
    )!;
    const substitute = match.homeTeam.roster.find(
      (player) =>
        player.position !== "GK" && !startingIds.has(player.id),
    )!;

    expect(rosterComparisonRows(goalkeeper, substitute)).toHaveLength(6);
    expect(
      resolveRosterExchange(goalkeeper, substitute, startingIds),
    ).toBeUndefined();
  });
});
