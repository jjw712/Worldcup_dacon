"use client";

import { useMemo, useState } from "react";
import type {
  MatchState,
  PlayerAdvancedAbilities,
  RosterPlayer,
  Side,
} from "../types";

const advancedLabels: Array<[keyof PlayerAdvancedAbilities, string]> = [
  ["ballControl", "볼 컨트롤"], ["firstTouch", "퍼스트 터치"],
  ["finishing", "골 결정력"], ["crossing", "크로스"],
  ["longShots", "중거리 슛"], ["setPieces", "세트피스"],
  ["acceleration", "가속"], ["stamina", "스태미나"],
  ["strength", "힘"], ["aerial", "제공권"],
  ["positioning", "위치 선정"], ["decisions", "판단력"],
  ["pressing", "압박"], ["defensiveAwareness", "수비 인식"],
  ["offBall", "오프 더 볼"], ["composure", "침착성"],
  ["aggression", "적극성"], ["leadership", "리더십"],
  ["consistency", "꾸준함"], ["recovery", "회복력"],
  ["tacticalAdaptability", "전술 적응"], ["injuryRisk", "부상 위험"],
  ["gkReflexes", "GK 반사 신경"], ["gkHandling", "GK 핸들링"],
  ["gkDistribution", "GK 배급"], ["gkPositioning", "GK 위치 선정"],
  ["gkAerialCommand", "GK 공중볼"], ["gkOneOnOnes", "GK 일대일"],
];

const valueRows = (player: RosterPlayer) => [
  { group: "종합", label: "종합 능력", value: player.coreAbilities.overall },
  { group: "핵심", label: "속도", value: player.coreAbilities.pace },
  { group: "핵심", label: "슈팅", value: player.coreAbilities.shooting },
  { group: "핵심", label: "패스", value: player.coreAbilities.passing },
  { group: "핵심", label: "드리블", value: player.coreAbilities.dribbling },
  { group: "핵심", label: "수비", value: player.coreAbilities.defending },
  { group: "핵심", label: "피지컬", value: player.coreAbilities.physical },
  ...advancedLabels.map(([key, label]) => ({
    group: label.startsWith("GK") ? "골키퍼" : "세부",
    label,
    value: player.advancedAbilities[key],
  })),
];

const resolveRoster = (match: MatchState, side: Side): RosterPlayer[] => {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  return team.roster.map(
    (rosterPlayer) =>
      match.players.find((player) => player.id === rosterPlayer.id) ??
      rosterPlayer,
  );
};

export function PlayerComparisonDialog({
  match,
  basePlayerId,
  onClose,
}: {
  match: MatchState;
  basePlayerId: string;
  onClose: () => void;
}) {
  const allPlayers = useMemo(
    () => [...resolveRoster(match, "home"), ...resolveRoster(match, "away")],
    [match],
  );
  const basePlayer = allPlayers.find((player) => player.id === basePlayerId);
  const [candidateSide, setCandidateSide] = useState<Side>(
    basePlayer?.teamId === "KOR" ? "away" : "home",
  );
  const candidatePlayers = resolveRoster(match, candidateSide);
  const [candidateId, setCandidateId] = useState(
    candidatePlayers.find((player) => player.id !== basePlayerId)?.id,
  );
  const candidate =
    candidatePlayers.find((player) => player.id === candidateId) ??
    candidatePlayers.find((player) => player.id !== basePlayerId);

  if (!basePlayer || !candidate) return null;
  const baseRows = valueRows(basePlayer);
  const candidateRows = valueRows(candidate);

  return (
    <div className="comparison-backdrop" onMouseDown={onClose}>
      <section
        className="comparison-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="선수 능력치 비교"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>PLAYER COMPARISON</span>
            <h2>선수 능력치 비교</h2>
            <p>오른쪽 선수 수치는 먼저 선택한 기준 선수와의 차이입니다.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="선수 비교 닫기">×</button>
        </header>

        <div className="comparison-player-heads">
          <article>
            <span>기준 선수</span>
            <strong>{basePlayer.name}</strong>
            <small>{basePlayer.detailedPosition} · {basePlayer.club}</small>
          </article>
          <div className="comparison-picker">
            <div className="prematch-team-toggle">
              {(["home", "away"] as Side[]).map((side) => (
                <button
                  key={side}
                  type="button"
                  className={candidateSide === side ? "is-active" : ""}
                  onClick={() => {
                    const players = resolveRoster(match, side);
                    setCandidateSide(side);
                    setCandidateId(
                      players.find((player) => player.id !== basePlayerId)?.id,
                    );
                  }}
                >
                  {side === "home" ? "우리 팀" : "상대 팀"}
                </button>
              ))}
            </div>
            <select
              value={candidate.id}
              onChange={(event) => setCandidateId(event.target.value)}
              aria-label="비교할 선수"
            >
              {candidatePlayers
                .filter((player) => player.id !== basePlayerId)
                .map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} · {player.detailedPosition} · {player.club}
                  </option>
                ))}
            </select>
            <article>
              <span>비교 선수</span>
              <strong>{candidate.name}</strong>
              <small>{candidate.detailedPosition} · {candidate.club}</small>
            </article>
          </div>
        </div>

        <div className="comparison-table">
          <div className="comparison-row comparison-table-head">
            <b>능력치</b><b>{basePlayer.name}</b><b>{candidate.name}</b><b>차이</b>
          </div>
          {baseRows.map((baseRow, index) => {
            const candidateRow = candidateRows[index];
            const baseValue = baseRow.value;
            const candidateValue = candidateRow.value;
            const delta =
              typeof baseValue === "number" && typeof candidateValue === "number"
                ? candidateValue - baseValue
                : undefined;
            return (
              <div className="comparison-row" key={`${baseRow.group}-${baseRow.label}`}>
                <span><small>{baseRow.group}</small>{baseRow.label}</span>
                <b>{typeof baseValue === "number" ? baseValue : "-"}</b>
                <b>{typeof candidateValue === "number" ? candidateValue : "-"}</b>
                <em className={delta === undefined ? "" : delta > 0 ? "is-plus" : delta < 0 ? "is-minus" : "is-even"}>
                  {delta === undefined ? "-" : delta > 0 ? `+${delta}` : delta}
                </em>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
