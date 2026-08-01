"use client";

import { useMemo, useState } from "react";
import type { MatchState, RosterPlayer, Side } from "../types";

interface TeamRosterPanelProps {
  match: MatchState;
  side: Side;
  selectedPlayerId?: string;
  onSelectPlayer: (playerId: string) => void;
  allowSubstitution?: boolean;
  substitutionMode?: "lineup" | "immediate" | "queue";
  onSubstitute?: (outgoingPlayerId: string, incomingPlayerId: string) => void;
  onCancelSubstitution?: (pendingId: string) => void;
  onComparePlayer?: (playerId: string) => void;
}

const footLabel = {
  LEFT: "왼발",
  RIGHT: "오른발",
  BOTH: "양발",
  UNKNOWN: "정보 없음",
} as const;

const conditionGrade = (condition: number) => {
  if (condition >= 92) return { arrow: "↑", label: "상", tone: "top" };
  if (condition >= 84) return { arrow: "↗", label: "중상", tone: "high" };
  if (condition >= 72) return { arrow: "→", label: "중", tone: "mid" };
  if (condition >= 60) return { arrow: "↘", label: "중하", tone: "low" };
  return { arrow: "↓", label: "하", tone: "bottom" };
};

const positionOrder: Record<RosterPlayer["position"], number> = {
  GK: 0,
  DF: 1,
  MF: 2,
  FW: 3,
};

const sortByPosition = <T extends RosterPlayer>(players: T[]): T[] =>
  players.slice().sort(
    (first, second) =>
      positionOrder[first.position] - positionOrder[second.position] ||
      first.shirtNumber - second.shirtNumber,
  );

const reservationLabel = (
  phase: MatchState["pendingSubstitutions"][number]["targetPhase"],
) =>
  phase === "HYDRATION_FIRST"
    ? "22분 하이드레이션 적용"
    : phase === "HALF_TIME"
      ? "하프타임 적용"
      : phase === "HYDRATION_SECOND"
        ? "67분 하이드레이션 적용"
        : "경기 재개 시 적용";

const mainAbilities = (player: RosterPlayer): Array<[string, number]> =>
  player.position === "GK"
    ? [
        ["반사 신경", player.advancedAbilities.gkReflexes ?? 0],
        ["핸들링", player.advancedAbilities.gkHandling ?? 0],
        ["배급", player.advancedAbilities.gkDistribution ?? 0],
        ["위치 선정", player.advancedAbilities.gkPositioning ?? 0],
        ["공중볼", player.advancedAbilities.gkAerialCommand ?? 0],
        ["일대일", player.advancedAbilities.gkOneOnOnes ?? 0],
      ]
    : [
        ["슈팅", player.coreAbilities.shooting],
        [
          "볼 컨트롤",
          player.advancedAbilities.ballControl ?? player.coreAbilities.dribbling,
        ],
        ["패스", player.coreAbilities.passing],
        ["수비", player.coreAbilities.defending],
        ["속도", player.coreAbilities.pace],
        ["피지컬", player.coreAbilities.physical],
      ];

const detailedAbilities = (
  player: RosterPlayer,
): Array<[string, number | undefined]> => [
  ["드리블", player.coreAbilities.dribbling],
  ["퍼스트 터치", player.advancedAbilities.firstTouch],
  ["골 결정력", player.advancedAbilities.finishing],
  ["크로스", player.advancedAbilities.crossing],
  ["중거리 슛", player.advancedAbilities.longShots],
  ["세트피스", player.advancedAbilities.setPieces],
  ["가속", player.advancedAbilities.acceleration],
  ["스태미나", player.advancedAbilities.stamina],
  ["힘", player.advancedAbilities.strength],
  ["제공권", player.advancedAbilities.aerial],
  ["위치 선정", player.advancedAbilities.positioning],
  ["판단력", player.advancedAbilities.decisions],
  ["압박", player.advancedAbilities.pressing],
  ["수비 인식", player.advancedAbilities.defensiveAwareness],
  ["오프 더 볼", player.advancedAbilities.offBall],
  ["침착성", player.advancedAbilities.composure],
  ["적극성", player.advancedAbilities.aggression],
  ["리더십", player.advancedAbilities.leadership],
  ["꾸준함", player.advancedAbilities.consistency],
  ["회복력", player.advancedAbilities.recovery],
  ["전술 적응", player.advancedAbilities.tacticalAdaptability],
  ["부상 위험", player.advancedAbilities.injuryRisk],
  ["GK 반사 신경", player.advancedAbilities.gkReflexes],
  ["GK 핸들링", player.advancedAbilities.gkHandling],
  ["GK 배급", player.advancedAbilities.gkDistribution],
  ["GK 위치 선정", player.advancedAbilities.gkPositioning],
  ["GK 공중볼", player.advancedAbilities.gkAerialCommand],
  ["GK 일대일", player.advancedAbilities.gkOneOnOnes],
];

export function TeamRosterPanel({
  match,
  side,
  selectedPlayerId,
  onSelectPlayer,
  allowSubstitution = false,
  substitutionMode = "immediate",
  onSubstitute,
  onCancelSubstitution,
  onComparePlayer,
}: TeamRosterPanelProps) {
  const [listMode, setListMode] = useState<"starting" | "bench">("starting");
  const [showDetails, setShowDetails] = useState(false);
  const [outgoingPlayerId, setOutgoingPlayerId] = useState<string>();
  const [substitutionMessage, setSubstitutionMessage] = useState<string>();
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const startingPlayers = useMemo(
    () =>
      match.players.filter(
        (player) => player.side === side && player.onField,
      ),
    [match.players, side],
  );
  const startingIds = new Set(startingPlayers.map((player) => player.id));
  const substitutedOutIds = new Set(match.substitutedOutPlayerIds ?? []);
  const pendingSubstitutions =
    side === "home" ? (match.pendingSubstitutions ?? []) : [];
  const pendingIncomingIds = new Set(
    pendingSubstitutions.map((item) => item.incomingPlayerId),
  );
  const pendingOutgoingIds = new Set(
    pendingSubstitutions.map((item) => item.outgoingPlayerId),
  );
  const benchPlayers = team.roster.filter(
    (player) =>
      !startingIds.has(player.id) &&
      (side !== "home" ||
        (!substitutedOutIds.has(player.id) &&
          !pendingIncomingIds.has(player.id))),
  );
  const displayedPlayers = sortByPosition(
    listMode === "starting" ? startingPlayers : benchPlayers,
  );
  const selected =
    displayedPlayers.find((player) => player.id === selectedPlayerId) ??
    startingPlayers.find((player) => player.id === selectedPlayerId) ??
    benchPlayers.find((player) => player.id === selectedPlayerId);
  const outgoing = startingPlayers.find(
    (player) => player.id === outgoingPlayerId,
  );
  const selectedIsBench = selected && !startingIds.has(selected.id);
  const substitutionLimitReached =
    (match.substitutionsUsed ?? 0) + pendingSubstitutions.length >= 5;

  const selectPlayer = (player: RosterPlayer) => {
    onSelectPlayer(player.id);
    setShowDetails(false);
    setSubstitutionMessage(undefined);
    if (
      listMode === "starting" &&
      allowSubstitution &&
      !pendingOutgoingIds.has(player.id)
    ) {
      setOutgoingPlayerId(player.id);
    }
  };

  const performSubstitution = () => {
    if (!outgoing || !selected || !selectedIsBench || !onSubstitute) return;
    onSubstitute(outgoing.id, selected.id);
    setSubstitutionMessage(
      substitutionMode === "queue"
        ? `${outgoing.name} → ${selected.name} 교체를 예약했습니다.`
        : substitutionMode === "lineup"
          ? `${outgoing.name} → ${selected.name} 선발 변경을 적용했습니다. 경기 시작은 별도 버튼으로 진행하십시오.`
          : `${outgoing.name} → ${selected.name} 교체만 적용했습니다. 경기 재개는 별도 버튼으로 진행하십시오.`,
    );
    onSelectPlayer(selected.id);
    setOutgoingPlayerId(undefined);
    setListMode("starting");
  };

  return (
    <div className="embedded-roster-panel">
      <div className="roster-list-tabs">
        <button
          type="button"
          className={listMode === "starting" ? "is-active" : ""}
          onClick={() => setListMode("starting")}
        >
          선발 11명
        </button>
        <button
          type="button"
          className={listMode === "bench" ? "is-active" : ""}
          onClick={() => setListMode("bench")}
        >
          교체 명단 {benchPlayers.length}
        </button>
        {allowSubstitution && match.phase !== "PRE_MATCH" && (
          <span className="substitution-count">
            교체 {match.substitutionsUsed ?? 0}/5
            {pendingSubstitutions.length > 0 &&
              ` · 예약 ${pendingSubstitutions.length}명`}
          </span>
        )}
      </div>

      {pendingSubstitutions.length > 0 && (
        <div className="pending-substitution-list">
          <span>교체 예약</span>
          {pendingSubstitutions.map((pending) => {
            const pendingOutgoing = startingPlayers.find(
              (player) => player.id === pending.outgoingPlayerId,
            );
            const pendingIncoming = team.roster.find(
              (player) => player.id === pending.incomingPlayerId,
            );
            return (
              <p key={pending.id}>
                <strong>{pendingOutgoing?.name ?? "선발 선수"}</strong>
                <i>→</i>
                <strong>{pendingIncoming?.name ?? "교체 선수"}</strong>
                <small>{reservationLabel(pending.targetPhase)}</small>
                {onCancelSubstitution && (
                  <button
                    type="button"
                    onClick={() => onCancelSubstitution(pending.id)}
                  >
                    예약 취소
                  </button>
                )}
              </p>
            );
          })}
        </div>
      )}

      {allowSubstitution && outgoing && (
        <div className="substitution-target">
          교체 대상 <strong>{outgoing.name}</strong>
          <button type="button" onClick={() => setOutgoingPlayerId(undefined)}>
            취소
          </button>
        </div>
      )}

      <div className="roster-column-head" aria-hidden="true">
        <span>선수</span>
        <div><b>능력</b><b>컨디션</b></div>
      </div>

      <div className="embedded-roster-list">
        {displayedPlayers.map((player) => {
          const condition = conditionGrade(player.condition ?? 92);
          return (
            <button
              type="button"
              key={player.id}
              className={`${selected?.id === player.id ? "is-selected" : ""} ${
                pendingOutgoingIds.has(player.id) ? "is-pending" : ""
              }`}
              onClick={() => selectPlayer(player)}
            >
              <i>{player.shirtNumber}</i>
              <span>
                <strong>{player.name}</strong>
                <small>{player.detailedPosition} · {player.club}</small>
              </span>
              <div className="roster-row-metrics">
                <b title="종합 능력치">{player.coreAbilities.overall}</b>
                {pendingOutgoingIds.has(player.id) ? (
                  <em className="is-reserved">예약</em>
                ) : (
                  <em className={`condition-${condition.tone}`} title="컨디션">
                    {condition.arrow} {condition.label}
                  </em>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!selected && (
        <p className="player-selection-prompt">
          명단이나 전술판에서 선수를 클릭하면 능력치와 상세 정보가 표시됩니다.
        </p>
      )}

      {substitutionMessage && (
        <p className="substitution-result-message" role="status">
          {substitutionMessage}
        </p>
      )}

      {selected && (
        <div className="embedded-player-detail">
          <header>
            <div>
              <span>{selected.originalName}</span>
              <strong>{selected.name}</strong>
              <small>{selected.club} · {selected.clubCountry}</small>
            </div>
            <b>{selected.coreAbilities.overall}</b>
          </header>
          <div className="compact-profile-grid">
            <p><span>나이</span><b>{selected.age}세</b></p>
            <p><span>주 포지션</span><b>{selected.detailedPosition}</b></p>
            <p><span>키·체중</span><b>{selected.heightCm}cm · {selected.weightKg ? `${selected.weightKg}kg` : "정보 없음"}</b></p>
            <p><span>주발</span><b>{footLabel[selected.preferredFoot]}</b></p>
            <p><span>부 포지션</span><b>{selected.secondaryPositions.join(" · ") || "없음"}</b></p>
            <p><span>A매치</span><b>{selected.caps}경기 · {selected.goals}골</b></p>
          </div>
          <div className="compact-ability-grid">
            {mainAbilities(selected).map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <b>{value || "-"}</b>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="embedded-detail-toggle"
            aria-expanded={showDetails}
            onClick={() => setShowDetails((current) => !current)}
          >
            {showDetails ? "세부 능력치 접기" : "세부 능력치 보기"}
            <span>{showDetails ? "−" : "+"}</span>
          </button>
          {onComparePlayer && (
            <button
              type="button"
              className="compare-player-button"
              onClick={() => onComparePlayer(selected.id)}
            >
              이 선수를 기준으로 비교
            </button>
          )}
          {showDetails && (
            <div className="embedded-detail-content">
              <div className="embedded-detail-grid">
                {detailedAbilities(selected)
                  .filter(
                    (entry): entry is [string, number] =>
                      typeof entry[1] === "number",
                  )
                  .map(([label, value]) => (
                    <p key={label}><span>{label}</span><b>{value}</b></p>
                  ))}
              </div>
              <p><strong>강점</strong>{selected.strengths}</p>
              <p><strong>약점</strong>{selected.weakness}</p>
              <p><strong>특성</strong>{selected.traits.join(" · ")}</p>
              {selected.weightSource && (
                <small>체중 출처 · {selected.weightSource}</small>
              )}
            </div>
          )}
          {allowSubstitution && selectedIsBench && (
            <button
              type="button"
              className="substitution-button"
              disabled={!outgoing || substitutionLimitReached}
              onClick={performSubstitution}
            >
              {substitutionLimitReached
                ? "교체 5명을 모두 사용했습니다"
                : outgoing
                  ? substitutionMode === "queue"
                    ? `${outgoing.name} → ${selected.name} 교체 예약`
                    : substitutionMode === "lineup"
                      ? `${outgoing.name} → ${selected.name} 선발 변경`
                      : `${outgoing.name} ↔ ${selected.name} 즉시 교체`
                  : "먼저 선발 명단에서 교체 대상을 선택하십시오"}
            </button>
          )}
          {!allowSubstitution && listMode === "bench" && (
            <p className="read-only-note">상대 명단은 분석만 가능하며 수정할 수 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
