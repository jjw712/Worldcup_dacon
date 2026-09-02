"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { canExchangePlayers } from "../playerRules";
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

export const rosterComparisonRows = (
  base: RosterPlayer,
  candidate: RosterPlayer,
) => {
  const row = (label: string, baseValue: number, candidateValue: number) => ({
    label,
    baseValue,
    candidateValue,
  });
  if (base.position === "GK" && candidate.position === "GK") {
    return [
      row("종합", base.coreAbilities.overall, candidate.coreAbilities.overall),
      row(
        "반사 신경",
        base.advancedAbilities.gkReflexes ?? 0,
        candidate.advancedAbilities.gkReflexes ?? 0,
      ),
      row(
        "핸들링",
        base.advancedAbilities.gkHandling ?? 0,
        candidate.advancedAbilities.gkHandling ?? 0,
      ),
      row(
        "배급",
        base.advancedAbilities.gkDistribution ?? 0,
        candidate.advancedAbilities.gkDistribution ?? 0,
      ),
      row(
        "위치 선정",
        base.advancedAbilities.gkPositioning ?? 0,
        candidate.advancedAbilities.gkPositioning ?? 0,
      ),
    ];
  }
  return [
    row("종합", base.coreAbilities.overall, candidate.coreAbilities.overall),
    row("속도", base.coreAbilities.pace, candidate.coreAbilities.pace),
    row("슈팅", base.coreAbilities.shooting, candidate.coreAbilities.shooting),
    row("패스", base.coreAbilities.passing, candidate.coreAbilities.passing),
    row("수비", base.coreAbilities.defending, candidate.coreAbilities.defending),
    row("피지컬", base.coreAbilities.physical, candidate.coreAbilities.physical),
  ];
};

export const resolveRosterExchange = (
  base: RosterPlayer,
  candidate: RosterPlayer,
  startingPlayerIds: ReadonlySet<string>,
) => {
  const baseIsStarting = startingPlayerIds.has(base.id);
  const candidateIsStarting = startingPlayerIds.has(candidate.id);
  if (
    baseIsStarting === candidateIsStarting ||
    !canExchangePlayers(base, candidate)
  ) {
    return undefined;
  }
  return {
    outgoing: baseIsStarting ? base : candidate,
    incoming: baseIsStarting ? candidate : base,
  };
};

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
  const [draggedPlayerId, setDraggedPlayerId] = useState<string>();
  const [hoveredComparison, setHoveredComparison] = useState<{
    playerId: string;
    left: number;
    top: number;
  }>();
  const comparisonHideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const startingPlayers = useMemo(
    () =>
      match.players.filter(
        (player) =>
          player.side === side &&
          (player.onField || (side === "home" && player.injured)),
      ),
    [match.players, side],
  );
  const startingIds = new Set(startingPlayers.map((player) => player.id));
  const matchPlayerIds = new Set(
    match.players
      .filter((player) => player.side === side)
      .map((player) => player.id),
  );
  const substitutedOutIds = new Set(match.substitutedOutPlayerIds ?? []);
  const pendingSubstitutions =
    side === "home" ? (match.pendingSubstitutions ?? []) : [];
  const pendingIncomingIds = new Set(
    pendingSubstitutions.map((item) => item.incomingPlayerId),
  );
  const pendingOutgoingIds = new Set(
    pendingSubstitutions.map((item) => item.outgoingPlayerId),
  );
  const externallySelectedStarter = startingPlayers.find(
    (player) => player.id === selectedPlayerId,
  );
  const externallySelectedStarterId = externallySelectedStarter?.id;
  const externallySelectedStarterPending = pendingOutgoingIds.has(
    externallySelectedStarterId ?? "",
  );
  const benchPlayers = team.roster.filter(
    (player) =>
      !startingIds.has(player.id) &&
      !matchPlayerIds.has(player.id) &&
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
  const effectiveOutgoingPlayerId =
    outgoingPlayerId ??
    (allowSubstitution && !externallySelectedStarterPending
      ? externallySelectedStarterId
      : undefined);
  const outgoing = startingPlayers.find(
    (player) => player.id === effectiveOutgoingPlayerId,
  );
  const comparisonBase = selected;
  const comparisonCandidate = [...startingPlayers, ...benchPlayers].find(
    (player) => player.id === hoveredComparison?.playerId,
  );
  const comparisonRows =
    comparisonBase &&
    comparisonCandidate &&
    comparisonBase.id !== comparisonCandidate.id
      ? rosterComparisonRows(comparisonBase, comparisonCandidate)
      : undefined;
  const selectedIsBench = selected && !startingIds.has(selected.id);
  const substitutionLimitReached =
    (match.substitutionsUsed ?? 0) + pendingSubstitutions.length >= 5;
  const comparisonExchange =
    allowSubstitution && comparisonBase && comparisonCandidate
      ? resolveRosterExchange(
          comparisonBase,
          comparisonCandidate,
          startingIds,
        )
      : undefined;
  const comparisonExchangeUnavailable = Boolean(
    comparisonExchange &&
      (substitutionLimitReached ||
        pendingOutgoingIds.has(comparisonExchange.outgoing.id)),
  );

  const cancelComparisonHide = () => {
    if (comparisonHideTimer.current) {
      clearTimeout(comparisonHideTimer.current);
      comparisonHideTimer.current = undefined;
    }
  };

  const hideComparisonSoon = () => {
    cancelComparisonHide();
    comparisonHideTimer.current = setTimeout(() => {
      setHoveredComparison(undefined);
      comparisonHideTimer.current = undefined;
    }, 140);
  };

  useEffect(
    () => () => {
      if (comparisonHideTimer.current) {
        clearTimeout(comparisonHideTimer.current);
      }
    },
  );

  const selectPlayer = (
    player: RosterPlayer,
    source: "starting" | "bench" = listMode,
  ) => {
    if (
      source === "bench" &&
      !outgoingPlayerId &&
      externallySelectedStarterId &&
      !externallySelectedStarterPending
    ) {
      setOutgoingPlayerId(externallySelectedStarterId);
    }
    onSelectPlayer(player.id);
    setShowDetails(false);
    setSubstitutionMessage(undefined);
    if (
      source === "starting" &&
      allowSubstitution &&
      !pendingOutgoingIds.has(player.id)
    ) {
      setOutgoingPlayerId(player.id);
    }
  };

  const completeSubstitution = (
    outgoingPlayer: RosterPlayer,
    incomingPlayer: RosterPlayer,
  ) => {
    if (!onSubstitute || substitutionLimitReached) return;
    if (!canExchangePlayers(outgoingPlayer, incomingPlayer)) {
      setSubstitutionMessage(
        "골키퍼와 필드 플레이어는 서로 교체할 수 없습니다.",
      );
      return;
    }
    onSubstitute(outgoingPlayer.id, incomingPlayer.id);
    setSubstitutionMessage(
      substitutionMode === "queue"
        ? `${outgoingPlayer.name} → ${incomingPlayer.name} 교체를 예약했습니다.`
        : substitutionMode === "lineup"
          ? `${outgoingPlayer.name} 대신 ${incomingPlayer.name}을 선발로 배치했습니다.`
          : `${outgoingPlayer.name} 대신 ${incomingPlayer.name}을 투입했습니다.`,
    );
    onSelectPlayer(incomingPlayer.id);
    setOutgoingPlayerId(undefined);
    setDraggedPlayerId(undefined);
    setHoveredComparison(undefined);
    setListMode("starting");
  };

  const performSubstitution = () => {
    if (!outgoing || !selected || !selectedIsBench) return;
    completeSubstitution(outgoing, selected);
  };

  const dropPlayer = (
    target: RosterPlayer,
    event: DragEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    const dragged = [...startingPlayers, ...benchPlayers].find(
      (player) => player.id === draggedPlayerId,
    );
    if (!dragged) return;
    const draggedIsStarting = startingIds.has(dragged.id);
    const targetIsStarting = startingIds.has(target.id);
    if (draggedIsStarting === targetIsStarting) return;
    completeSubstitution(
      draggedIsStarting ? dragged : target,
      draggedIsStarting ? target : dragged,
    );
  };

  const showComparison = (player: RosterPlayer, element: HTMLElement) => {
    if (!comparisonBase || comparisonBase.id === player.id) return;
    cancelComparisonHide();
    const bounds = element.getBoundingClientRect();
    const cardWidth = Math.min(300, window.innerWidth - 16);
    const cardHeight = 280;
    const left =
      bounds.right + 12 + cardWidth <= window.innerWidth
        ? bounds.right + 12
        : Math.max(8, bounds.left - cardWidth - 12);
    setHoveredComparison({
      playerId: player.id,
      left,
      top: Math.max(
        8,
        Math.min(bounds.top, window.innerHeight - cardHeight - 8),
      ),
    });
  };

  const renderPlayerButton = (
    player: RosterPlayer,
    source: "starting" | "bench",
  ) => {
    const condition = conditionGrade(player.condition ?? 92);
    const draggedPlayer = [...startingPlayers, ...benchPlayers].find(
      (candidate) => candidate.id === draggedPlayerId,
    );
    const isOppositeDropTarget = Boolean(
      draggedPlayerId &&
        startingIds.has(draggedPlayerId) !== (source === "starting") &&
        draggedPlayer &&
        canExchangePlayers(draggedPlayer, player),
    );
    return (
      <button
        type="button"
        key={player.id}
        draggable={
          allowSubstitution &&
          !substitutionLimitReached &&
          !pendingOutgoingIds.has(player.id)
        }
        className={`${selected?.id === player.id ? "is-selected" : ""} ${
          pendingOutgoingIds.has(player.id) ? "is-pending" : ""
        } ${draggedPlayerId === player.id ? "is-dragging" : ""} ${
          isOppositeDropTarget ? "is-drop-target" : ""
        }`}
        onClick={() => selectPlayer(player, source)}
        onDragStart={(event) => {
          setDraggedPlayerId(player.id);
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", player.id);
        }}
        onDragEnd={() => setDraggedPlayerId(undefined)}
        onMouseEnter={(event) => showComparison(player, event.currentTarget)}
        onMouseLeave={(event) => {
          if (document.activeElement !== event.currentTarget) {
            hideComparisonSoon();
          }
        }}
        onFocus={(event) => showComparison(player, event.currentTarget)}
        onBlur={hideComparisonSoon}
        onDragOver={(event) => {
          if (isOppositeDropTarget) event.preventDefault();
        }}
        onDrop={(event) => dropPlayer(player, event)}
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
          ) : "injured" in player && player.injured ? (
            <em className="is-injured">부상</em>
          ) : (
            <em className={`condition-${condition.tone}`} title="컨디션">
              {condition.arrow} {condition.label}
            </em>
          )}
        </div>
      </button>
    );
  };

  const rosterColumnHead = (
    <div className="roster-column-head" aria-hidden="true">
      <span>선수</span>
      <div><b>능력</b><b>컨디션</b></div>
    </div>
  );

  return (
    <div
      className="embedded-roster-panel"
      data-hover-comparison="enabled"
    >
      {comparisonBase && comparisonCandidate && comparisonRows && (
        <aside
          className="roster-hover-comparison"
          style={{
            left: hoveredComparison?.left,
            top: hoveredComparison?.top,
          }}
          role="status"
          aria-label={`${comparisonBase.name} 선수와 ${comparisonCandidate.name} 선수 능력 비교`}
          onMouseEnter={cancelComparisonHide}
          onMouseLeave={hideComparisonSoon}
        >
          <span>
            {comparisonExchange ? "선수 교체 · 능력 비교" : "선수 능력 비교"}
          </span>
          <header>
            <strong>{comparisonBase.name}</strong>
            <i>↔</i>
            <strong>{comparisonCandidate.name}</strong>
          </header>
          <div>
            {comparisonRows.map(({ label, baseValue, candidateValue }) => {
              const difference = candidateValue - baseValue;
              return (
                <p key={label}>
                  <b>{baseValue}</b>
                  <span>
                    {label}
                    <em
                      className={
                        difference > 0
                          ? "is-plus"
                          : difference < 0
                            ? "is-minus"
                            : ""
                      }
                    >
                      {difference > 0 ? `+${difference}` : difference}
                    </em>
                  </span>
                  <b>{candidateValue}</b>
                </p>
              );
            })}
          </div>
          {comparisonExchange && (
            <button
              type="button"
              disabled={comparisonExchangeUnavailable}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() =>
                completeSubstitution(
                  comparisonExchange.outgoing,
                  comparisonExchange.incoming,
                )
              }
            >
              {comparisonExchangeUnavailable
                ? substitutionLimitReached
                  ? "교체 5명을 모두 사용했습니다"
                  : "이미 교체 예약된 선수입니다"
                : substitutionMode === "queue"
                  ? `${comparisonExchange.outgoing.name} → ${comparisonExchange.incoming.name} 교체 예약`
                  : substitutionMode === "lineup"
                    ? `${comparisonExchange.outgoing.name} → ${comparisonExchange.incoming.name} 선발 변경`
                    : `${comparisonExchange.outgoing.name} → ${comparisonExchange.incoming.name} 즉시 교체`}
            </button>
          )}
        </aside>
      )}
      {!allowSubstitution && <div className="roster-list-tabs">
        <button
          type="button"
          className={listMode === "starting" ? "is-active" : ""}
          onClick={() => setListMode("starting")}
        >
          선발 {startingPlayers.length}명
        </button>
        <button
          type="button"
          className={listMode === "bench" ? "is-active" : ""}
          onClick={() => setListMode("bench")}
        >
          교체 명단 {benchPlayers.length}
        </button>
      </div>}

      {allowSubstitution && (
        <div className="roster-substitution-guide">
          <div>
            <strong>드래그 교체</strong>
            <span>
              선수를 선택한 뒤 다른 선수에 마우스를 올리면 교체 능력을
              비교합니다. 드래그하면 바로 교체됩니다.
            </span>
          </div>
          <b>
            {match.phase === "PRE_MATCH"
              ? "선발 편성"
              : `교체 ${match.substitutionsUsed ?? 0}/5`}
          </b>
        </div>
      )}

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

      {allowSubstitution && outgoing && selected && selectedIsBench && (
        <div className="substitution-quick-action">
          <span>
            <strong>{outgoing.name}</strong>
            <i>→</i>
            <strong>{selected.name}</strong>
          </span>
          <button
            type="button"
            disabled={
              substitutionLimitReached || !canExchangePlayers(outgoing, selected)
            }
            onClick={performSubstitution}
          >
            {substitutionMode === "queue"
              ? "교체 예약"
              : substitutionMode === "lineup"
                ? "선발 변경"
                : "즉시 교체"}
          </button>
        </div>
      )}

      {allowSubstitution ? (
        <div className="roster-drag-lists">
          <section>
            <header><strong>선발</strong><span>{startingPlayers.length}명</span></header>
            <div className="embedded-roster-list">
              {rosterColumnHead}
              {sortByPosition(startingPlayers).map((player) =>
                renderPlayerButton(player, "starting"),
              )}
            </div>
          </section>
          <section>
            <header><strong>교체 명단</strong><span>{benchPlayers.length}명</span></header>
            <div className="embedded-roster-list">
              {rosterColumnHead}
              {sortByPosition(benchPlayers).map((player) =>
                renderPlayerButton(player, "bench"),
              )}
            </div>
          </section>
        </div>
      ) : (
        <>
          <div className="embedded-roster-list">
            {rosterColumnHead}
            {displayedPlayers.map((player) =>
              renderPlayerButton(player, listMode),
            )}
          </div>
        </>
      )}

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
              disabled={
                !outgoing ||
                substitutionLimitReached ||
                !canExchangePlayers(outgoing, selected)
              }
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
