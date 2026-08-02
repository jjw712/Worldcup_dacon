"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BREAK_COMMAND_KINDS,
  COMMANDS,
  calculateCommandCost,
  evaluateCommandImpact,
} from "../engine/commands";
import { averageTeamStamina } from "../engine/matchEngine";
import { calculateBreakRemaining } from "../engine/timer";
import type {
  HydrationPhase,
  HydrationProgress,
} from "../sessionStorage";
import type {
  AttackSide,
  CommandKind,
  MatchPlayer,
  MatchPhase,
  MatchState,
  Position,
} from "../types";
import { MatchStatsTable, possessionPercent } from "./MatchStatsTable";
import { PlayerComparisonDialog } from "./PlayerComparisonDialog";
import { TacticalBoard } from "./TacticalBoard";
import { TeamRosterPanel } from "./TeamRosterPanel";
import { SubTacticSwitcher } from "./TacticPresetSelector";

const PHASE_LABELS: Partial<Record<MatchPhase, string>> = {
  OBSERVE_0_22: "전반 0~22분",
  OBSERVE_22_45: "전반 22~45분",
  OBSERVE_45_67: "후반 45~67분",
  OBSERVE_67_90: "후반 67~90분",
};

const DELIVERY_ANIMATION_MS = 800;

const eventIcon = (type: MatchState["events"][number]["type"]) => {
  if (type === "GOAL") return "⚽";
  if (type === "CARD") return "▰";
  if (type === "SUBSTITUTION") return "⇄";
  if (type === "CORNER") return "⚑";
  if (type === "INJURY") return "✚";
  return undefined;
};

const footLabel = {
  LEFT: "왼발",
  RIGHT: "오른발",
  BOTH: "양발",
  UNKNOWN: "확인 전",
} as const;

function PlayerDetailDialog({
  player,
  match,
  onClose,
}: {
  player: MatchPlayer;
  match: MatchState;
  onClose: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const personalCommands = match.commands.filter(
    (command) => command.targetPlayerId === player.id,
  );
  const mainAbilities =
    player.position === "GK"
      ? [
          ["반사 신경", player.advancedAbilities.gkReflexes],
          ["핸들링", player.advancedAbilities.gkHandling],
          ["배급", player.advancedAbilities.gkDistribution],
          ["위치 선정", player.advancedAbilities.gkPositioning],
          ["공중볼", player.advancedAbilities.gkAerialCommand],
          ["일대일", player.advancedAbilities.gkOneOnOnes],
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
  const advancedAbilityGroups = [
    {
      label: "기술",
      values: [
        ["드리블", player.coreAbilities.dribbling],
        ["퍼스트 터치", player.advancedAbilities.firstTouch],
        ["골 결정력", player.advancedAbilities.finishing],
        ["크로스", player.advancedAbilities.crossing],
        ["중거리 슛", player.advancedAbilities.longShots],
        ["세트피스", player.advancedAbilities.setPieces],
      ],
    },
    {
      label: "움직임 · 전술",
      values: [
        ["가속", player.advancedAbilities.acceleration],
        ["스태미나", player.advancedAbilities.stamina],
        ["위치 선정", player.advancedAbilities.positioning],
        ["판단력", player.advancedAbilities.decisions],
        ["압박", player.advancedAbilities.pressing],
        ["수비 인식", player.advancedAbilities.defensiveAwareness],
        ["오프 더 볼", player.advancedAbilities.offBall],
        ["전술 적응", player.advancedAbilities.tacticalAdaptability],
      ],
    },
    {
      label: "피지컬 · 멘탈",
      values: [
        ["힘", player.advancedAbilities.strength],
        ["제공권", player.advancedAbilities.aerial],
        ["침착성", player.advancedAbilities.composure],
        ["적극성", player.advancedAbilities.aggression],
        ["리더십", player.advancedAbilities.leadership],
        ["꾸준함", player.advancedAbilities.consistency],
        ["회복력", player.advancedAbilities.recovery],
        ["부상 위험", player.advancedAbilities.injuryRisk],
      ],
    },
  ];
  return (
    <div className="player-dialog-backdrop" onMouseDown={onClose}>
      <section
        className="player-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${player.name} 선수 상세`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div className="player-dialog-number">{player.number}</div>
          <div>
            <span>{player.club}</span>
            <h2>
              {player.name} <b className="player-overall">{player.coreAbilities.overall}</b>
            </h2>
            <p>
              {player.position} · {player.detailedPosition} ·{" "}
              {player.age}세 · {player.heightCm}cm · {footLabel[player.preferredFoot]}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="선수 상세 닫기">
            ×
          </button>
        </header>
        <div className="player-live-grid">
          <div>
            <span>현재 체력</span>
            <strong>{Math.round(player.currentStamina)}</strong>
          </div>
          <div>
            <span>추가 체력</span>
            <strong className="bonus-value">
              +{Math.round(player.bonusStamina)}
            </strong>
          </div>
          <div>
            <span>컨디션</span>
            <strong>{Math.round(player.condition)}</strong>
          </div>
          <div>
            <span>카드</span>
            <strong>{player.card === "NONE" ? "없음" : player.card}</strong>
          </div>
        </div>
        <div className="player-order-list">
          <span>개인 지시</span>
          {personalCommands.length ? (
            personalCommands.map((command) => {
              const evaluation = evaluateCommandImpact(match, command);
              return (
                <article key={command.id}>
                  <div>
                    <strong>{command.label}</strong>
                    <small>{evaluation.status}</small>
                  </div>
                  <b>{evaluation.successRate}%</b>
                </article>
              );
            })
          ) : (
            <p>현재 전달된 개인 지시가 없습니다.</p>
          )}
        </div>
        <div className="player-abilities">
          <div className="ability-heading">
            <div>
              <span>PLAYER ATTRIBUTES</span>
              <strong>핵심 능력치</strong>
            </div>
            <small>게임 설계 추정치 · 신뢰도 {player.confidenceGrade}</small>
          </div>
          <div className="main-ability-grid">
            {mainAbilities.map(([label, rawValue]) => {
              const value = typeof rawValue === "number" ? rawValue : 0;
              return (
                <div key={label as string}>
                  <span>{label}</span>
                  <strong>{value || "-"}</strong>
                  <i><b style={{ width: `${value}%` }} /></i>
                </div>
              );
            })}
          </div>
          <button
            className="advanced-toggle"
            type="button"
            aria-expanded={showAdvanced}
            onClick={() => setShowAdvanced((current) => !current)}
          >
            {showAdvanced ? "세부 능력치 접기" : "세부 능력치 보기"}
            <span>{showAdvanced ? "−" : "+"}</span>
          </button>
          {showAdvanced && (
            <div className="advanced-ability-panel">
              {advancedAbilityGroups.map((group) => {
                const values = group.values.filter(
                  (entry): entry is [string, number] => typeof entry[1] === "number",
                );
                return (
                  <section key={group.label}>
                    <h3>{group.label}</h3>
                    <div>
                      {values.map(([label, value]) => (
                        <p key={label}>
                          <span>{label}</span>
                          <b>{value}</b>
                        </p>
                      ))}
                    </div>
                  </section>
                );
              })}
              <div className="player-scout-note">
                <p><span>강점</span>{player.strengths}</p>
                <p><span>약점</span>{player.weakness}</p>
                <p><span>평가 근거</span>{player.ratingBasis}</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const breakHeadline = (match: MatchState): string => {
  const lowest = match.players
    .filter((player) => player.side === "home" && player.onField)
    .sort((a, b) => a.currentStamina - b.currentStamina)[0];
  if (
    match.metrics.awayRightThreat + (match.metrics.awayLeftThreat ?? 0) >= 3
  )
    return "상대의 측면 공략이 반복되고 있습니다.";
  if (match.metrics.homeShots === 0)
    return "점유에 비해 결정적인 침투가 부족합니다.";
  if (lowest && lowest.currentStamina < 58)
    return `${lowest.name}의 체력 저하가 가장 큰 위험입니다.`;
  return "경기 흐름이 팽팽합니다.";
};

interface ObservationScreenProps {
  match: MatchState;
  selectedPlayerId?: string;
  memo: string;
  playbackSpeed: 1 | 2 | 4;
  isPaused: boolean;
  goalEvent?: MatchState["events"][number];
  onSelectPlayer: (playerId: string) => void;
  onMemoChange: (memo: string) => void;
  onPlaybackSpeedChange: (speed: 1 | 2 | 4) => void;
  onPauseChange: (paused: boolean) => void;
  onSubstitute: (outgoingPlayerId: string, incomingPlayerId: string) => void;
  onQueueSubstitution?: (
    outgoingPlayerId: string,
    incomingPlayerId: string,
    targetPhase: Extract<
      MatchPhase,
      "HYDRATION_FIRST" | "HALF_TIME" | "HYDRATION_SECOND"
    >,
  ) => void;
  onCancelSubstitution?: (pendingId: string) => void;
  onSwitchSubTactic: (slot: "sub1" | "sub2") => void;
  onSkipToDecision: () => void;
}

export function ObservationScreen({
  match,
  selectedPlayerId,
  memo,
  playbackSpeed,
  isPaused,
  goalEvent,
  onSelectPlayer,
  onMemoChange,
  onPlaybackSpeedChange,
  onPauseChange,
  onSubstitute,
  onQueueSubstitution,
  onCancelSubstitution,
  onSwitchSubTactic,
  onSkipToDecision,
}: ObservationScreenProps) {
  const [homePossession] = possessionPercent(match.metrics);
  const [staffTab, setStaffTab] = useState<"feedback" | "commands">(
    "feedback",
  );
  const [detailPlayerId, setDetailPlayerId] = useState<string>();
  const [compareBasePlayerId, setCompareBasePlayerId] = useState<string>();
  const [pauseTool, setPauseTool] = useState<"substitution" | "tactic">(
    "substitution",
  );
  const [pauseSubMode, setPauseSubMode] = useState<"immediate" | "queue">(
    "immediate",
  );
  const nextBreak =
    match.phase === "OBSERVE_0_22"
      ? ({ phase: "HYDRATION_FIRST", label: "22분 하이드레이션" } as const)
      : match.phase === "OBSERVE_22_45"
        ? ({ phase: "HALF_TIME", label: "하프타임" } as const)
        : match.phase === "OBSERVE_45_67"
          ? ({ phase: "HYDRATION_SECOND", label: "67분 하이드레이션" } as const)
          : undefined;
  const pendingOutgoingIds = new Set(
    (match.pendingSubstitutions ?? []).map(
      (substitution) => substitution.outgoingPlayerId,
    ),
  );
  const selectedPlayer = match.players.find(
    (player) =>
      player.id === selectedPlayerId && !pendingOutgoingIds.has(player.id),
  );
  const quickMemos = [
    "측면 수비 확인",
    "중앙 침투 검토",
    "체력 낮은 선수",
    "예비 전술 준비",
  ];

  const appendMemo = (text: string) => {
    if (memo.includes(text)) return;
    onMemoChange(memo ? `${memo}\n• ${text}` : `• ${text}`);
  };

  return (
    <main className="match-shell">
      <header className="match-header">
        <div className="brand-lockup compact">
          <span className="brand-mark">잠.물.마</span>
          <span className="live-indicator">
            <span /> LIVE
          </span>
        </div>
        <div className="scoreboard">
          <span>KOR</span>
          <strong>{match.score.home}</strong>
          <div>
            <b>{String(Math.floor(match.gameMinute)).padStart(2, "0")}′</b>
            <small>{PHASE_LABELS[match.phase]}</small>
          </div>
          <strong>{match.score.away}</strong>
          <span>{match.awayTeam.shortName}</span>
        </div>
        <div className="match-header-actions">
          <div className="speed-control" aria-label="경기 진행 속도">
            <button
              type="button"
              className={playbackSpeed === 1 ? "is-active" : ""}
              aria-pressed={playbackSpeed === 1}
              onClick={() => onPlaybackSpeedChange(1)}
              disabled={isPaused}
            >
              1×
            </button>
            <button
              type="button"
              className={playbackSpeed === 2 ? "is-active" : ""}
              aria-pressed={playbackSpeed === 2}
              onClick={() => onPlaybackSpeedChange(2)}
              disabled={isPaused}
            >
              2×
            </button>
            <button
              type="button"
              className={playbackSpeed === 4 ? "is-active" : ""}
              aria-pressed={playbackSpeed === 4}
              onClick={() => onPlaybackSpeedChange(4)}
              disabled={isPaused}
            >
              4×
            </button>
          </div>
          <button
            type="button"
            className={`pause-match-button ${isPaused ? "is-paused" : ""}`}
            aria-pressed={isPaused}
            onClick={() => onPauseChange(!isPaused)}
          >
            {isPaused ? "경기 재개" : "경기 중지"}
          </button>
          <div className="observation-lock">
            <button
              type="button"
              className="skip-segment-button"
              onClick={onSkipToDecision}
              disabled={isPaused}
            >
              다음 결정까지 스킵
            </button>
          </div>
        </div>
      </header>

      <section className="match-layout">
        <aside className="match-left-column">
          <div className="match-panel feed-panel">
            <div className="panel-title-row tight">
              <div>
                <span>MATCH FEED</span>
                <h2>문자 중계</h2>
              </div>
              <span className="possession-chip">
                {match.possession === "home" ? "한국 소유" : "상대 소유"}
              </span>
            </div>
            <div className="event-feed">
              {match.events.slice(0, 9).map((event) => (
                <article
                  key={event.id}
                  className={`event-row event-${event.type.toLowerCase()} emphasis-${event.emphasis ?? "normal"}`}
                >
                  <time>{event.minute}′</time>
                  {eventIcon(event.type) && (
                    <span className="event-icon" aria-hidden="true">
                      {eventIcon(event.type)}
                    </span>
                  )}
                  <p>{event.text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="match-panel coach-panel">
            <div className="panel-title-row tight">
              <div>
                <span>STAFF ROOM</span>
                <h2>{staffTab === "feedback" ? "코치 피드백" : "지시 추적"}</h2>
              </div>
              <div className="staff-tabs">
                <button
                  className={staffTab === "feedback" ? "is-active" : ""}
                  onClick={() => setStaffTab("feedback")}
                >
                  코치
                </button>
                <button
                  className={staffTab === "commands" ? "is-active" : ""}
                  onClick={() => setStaffTab("commands")}
                >
                  지시 {match.commands.length}
                </button>
              </div>
            </div>
            {staffTab === "feedback" ? (
              <div className="coach-list">
                {match.feedback.slice(0, 4).map((feedback) => (
                  <article key={feedback.id} className="coach-row">
                    <span className={`severity severity-${feedback.severity}`}>
                      {feedback.severity}
                    </span>
                    <div>
                      <strong>{feedback.coach} 코치</strong>
                      <p>{feedback.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="command-tracker">
                {match.commands.length ? (
                  match.commands
                    .slice()
                    .reverse()
                    .map((command) => {
                      const evaluation = evaluateCommandImpact(match, command);
                      return (
                        <article key={command.id}>
                          <div>
                            <strong>{command.label}</strong>
                            <small>{evaluation.status}</small>
                          </div>
                          <b>{evaluation.successRate}%</b>
                          <p>{evaluation.headline}</p>
                        </article>
                      );
                    })
                ) : (
                  <p className="muted">아직 전달한 지시가 없습니다.</p>
                )}
              </div>
            )}
          </div>
        </aside>

        <section className="board-stage">
          <div className="board-stage-heading">
            <div>
              <span>TACTICAL VIEW</span>
              <strong>
                {match.possession === "home"
                  ? "공격 전개 관찰 중"
                  : "수비 전환 관찰 중"}
              </strong>
            </div>
            <div className="match-stats-mini">
              <span>
                점유율 <b>{homePossession}%</b>
              </span>
              <span>
                슈팅 <b>{match.metrics.homeShots}</b> · 유효{" "}
                <b>{match.metrics.homeShotsOnTarget ?? 0}</b>
              </span>
            </div>
          </div>
          <TacticalBoard
            match={match}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={onSelectPlayer}
          />
          {goalEvent && (
            <div className="goal-board-overlay" role="status" aria-live="assertive">
              <span>GOAL</span>
              <strong>
                {goalEvent.side === "home" ? "대한민국 득점" : `${match.awayTeam.name} 득점`}
              </strong>
            </div>
          )}
          {isPaused && (
            <div className="match-paused-overlay" role="status">
              <span>경기 중지</span>
              <strong>전술과 교체를 정비하십시오.</strong>
              <small>오른쪽 패널에서 변경한 뒤 경기를 재개하십시오.</small>
            </div>
          )}
          <div className="board-legend">
            <span>
              <i
                className="legend-player"
                style={{
                  background: match.homeTeam.color,
                  borderColor: match.homeTeam.accent,
                }}
              /> 대한민국
            </span>
            <span>
              <i
                className="legend-player"
                style={{ background: match.awayTeam.color }}
              />{" "}
              {match.awayTeam.name}
            </span>
            <span>
              <i className="legend-danger" /> 위험 지역
            </span>
          </div>
        </section>

        <aside className={`match-right-column ${isPaused ? "is-paused" : ""}`}>
          {isPaused && (
            <div className="match-panel pause-substitution-panel">
              <div className="panel-title-row tight">
                <div>
                  <span>PAUSED · LIVE SUBSTITUTION</span>
                  <h2>경기 중 선수 교체</h2>
                </div>
              </div>
              <div className="pause-tools-tabs">
                <button
                  type="button"
                  className={pauseTool === "substitution" ? "is-active" : ""}
                  onClick={() => setPauseTool("substitution")}
                >
                  선수 교체
                </button>
                <button
                  type="button"
                  className={pauseTool === "tactic" ? "is-active" : ""}
                  onClick={() => setPauseTool("tactic")}
                >
                  서브 전술
                </button>
              </div>
              {pauseTool === "substitution" ? (
                <>
                  <div className="substitution-timing-toggle">
                    <button
                      type="button"
                      className={pauseSubMode === "immediate" ? "is-active" : ""}
                      onClick={() => setPauseSubMode("immediate")}
                    >
                      즉시 교체
                    </button>
                    <button
                      type="button"
                      className={pauseSubMode === "queue" ? "is-active" : ""}
                      disabled={!nextBreak}
                      onClick={() => setPauseSubMode("queue")}
                    >
                      {nextBreak ? `${nextBreak.label} 예약` : "예약 구간 없음"}
                    </button>
                  </div>
                  <TeamRosterPanel
                    match={match}
                    side="home"
                    selectedPlayerId={selectedPlayerId}
                    onSelectPlayer={onSelectPlayer}
                    allowSubstitution
                    substitutionMode={pauseSubMode}
                    onSubstitute={(outgoingPlayerId, incomingPlayerId) => {
                      if (pauseSubMode === "queue" && nextBreak) {
                        onQueueSubstitution?.(
                          outgoingPlayerId,
                          incomingPlayerId,
                          nextBreak.phase,
                        );
                      } else {
                        onSubstitute(outgoingPlayerId, incomingPlayerId);
                      }
                    }}
                    onCancelSubstitution={onCancelSubstitution}
                    onComparePlayer={setCompareBasePlayerId}
                  />
                </>
              ) : (
                <SubTacticSwitcher
                  match={match}
                  onSwitch={onSwitchSubTactic}
                />
              )}
              <button
                type="button"
                className="button button-primary button-wide"
                onClick={() => onPauseChange(false)}
              >
                경기 재개
              </button>
            </div>
          )}
          <div className="match-panel player-monitor">
            <div className="panel-title-row tight">
              <div>
                <span>SQUAD MONITOR</span>
                <h2>선수 상태</h2>
              </div>
            </div>
            <div className="monitor-list">
              {match.players
                .filter((player) => player.side === "home" && player.onField)
                .map((player) => (
                  <button
                    key={player.id}
                    className={`monitor-row ${
                      selectedPlayerId === player.id ? "is-selected" : ""
                    }`}
                    onClick={() => onSelectPlayer(player.id)}
                  >
                    <span className="jersey-number">{player.number}</span>
                    <span className="monitor-name">
                      <strong>{player.name}</strong>
                      <small>{player.position}</small>
                    </span>
                    <span className="stamina-bar">
                      <i
                        className="stamina-base"
                        style={{
                          width: `${Math.max(0, player.currentStamina - player.bonusStamina)}%`,
                          background:
                            player.currentStamina < 45
                              ? "#ef6b62"
                              : player.currentStamina < 65
                                ? "#f0be4b"
                                : "#bfe855",
                        }}
                      />
                      {player.bonusStamina > 0 && (
                        <i
                          className="stamina-bonus"
                          style={{
                            left: `${Math.max(0, player.currentStamina - player.bonusStamina)}%`,
                            width: `${player.bonusStamina}%`,
                          }}
                        />
                      )}
                    </span>
                    <b>{Math.round(player.currentStamina)}</b>
                    {player.card !== "NONE" && (
                      <em className={`card-mark ${player.card.toLowerCase()}`} />
                    )}
                  </button>
                ))}
            </div>
          </div>

          <div className="match-panel memo-panel">
            <div className="panel-title-row tight">
              <div>
                <span>MY NOTES</span>
                <h2>브레이크 메모</h2>
              </div>
              <small>자동 실행되지 않음</small>
            </div>
            <textarea
              value={memo}
              onChange={(event) => onMemoChange(event.target.value)}
              placeholder="다음 브레이크에서 전달할 내용을 기록하십시오."
              aria-label="브레이크 메모"
            />
            <div className="quick-memos">
              {quickMemos.map((item) => (
                <button key={item} onClick={() => appendMemo(item)}>
                  + {item}
                </button>
              ))}
            </div>
          </div>
          {selectedPlayer && (
            <div className="selected-strip">
              <span>{selectedPlayer.number}</span>
              <div>
                <strong>{selectedPlayer.name}</strong>
                <small>
                  {selectedPlayer.detailedPosition} · 체력{" "}
                  {Math.round(selectedPlayer.currentStamina)}
                </small>
              </div>
              <button
                type="button"
                onClick={() => setDetailPlayerId(selectedPlayer.id)}
              >
                자세히
              </button>
            </div>
          )}
        </aside>
      </section>
      {detailPlayerId && (
        <PlayerDetailDialog
          player={
            match.players.find((player) => player.id === detailPlayerId) ??
            match.players[0]
          }
          match={match}
          onClose={() => setDetailPlayerId(undefined)}
        />
      )}
      {compareBasePlayerId && (
        <PlayerComparisonDialog
          match={match}
          basePlayerId={compareBasePlayerId}
          onClose={() => setCompareBasePlayerId(undefined)}
        />
      )}
    </main>
  );
}

export function BreakTransitionScreen({
  match,
  onContinue,
}: {
  match: MatchState;
  onContinue: () => void;
}) {
  const isHalfTime = match.phase === "HALF_TIME";
  const title = isHalfTime
    ? "전반전이 종료되었습니다."
    : `${match.phase === "HYDRATION_FIRST" ? "전반" : "후반"} 하이드레이션 브레이크입니다.`;
  return (
    <main className="phase-transition-shell">
      <section>
        <span>{isHalfTime ? "HALF TIME" : "HYDRATION BREAK"}</span>
        <div className="transition-score">
          <strong>KOR</strong>
          <b>{match.score.home}</b>
          <i>:</i>
          <b>{match.score.away}</b>
          <strong>{match.awayTeam.shortName}</strong>
        </div>
        <h1>{title}</h1>
        <p>
          {isHalfTime
            ? "전반 통계를 확인한 뒤 전술, 포지션, 교체 계획을 정비하십시오."
            : "현재 흐름을 확인한 뒤 제한 시간 안에 지시와 교체 계획을 정비하십시오."}
        </p>
        <button className="button button-primary" onClick={onContinue}>
          {isHalfTime ? "하프타임 전술실 입장" : "브레이크 전술실 입장"}
          <span aria-hidden="true">→</span>
        </button>
      </section>
    </main>
  );
}

export function FullTimeScreen({
  match,
  onContinue,
}: {
  match: MatchState;
  onContinue: () => void;
}) {
  return (
    <main className="fulltime-shell">
      <header>
        <span className="brand-mark">잠.물.마</span>
        <b>FULL TIME</b>
      </header>
      <section className="fulltime-content">
        <div className="fulltime-score">
          <div>
            <span>KOR</span>
            <strong>{match.score.home}</strong>
          </div>
          <i>:</i>
          <div>
            <span>{match.awayTeam.shortName}</span>
            <strong>{match.score.away}</strong>
          </div>
        </div>
        <div>
          <p className="eyebrow">MATCH SUMMARY</p>
          <h1>경기가 종료되었습니다.</h1>
          <p className="fulltime-lead">
            최종 기록을 확인한 뒤 감독 평가로 이동하십시오.
          </p>
          <MatchStatsTable
            metrics={match.metrics}
            awayLabel={match.awayTeam.shortName}
          />
          <button className="button button-primary button-wide" onClick={onContinue}>
            감독 평가 확인
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </main>
  );
}

interface HydrationScreenProps {
  match: MatchState;
  memo: string;
  progress?: HydrationProgress;
  onProgressChange?: (progress: HydrationProgress) => void;
  onApplyCommand: (
    kind: CommandKind,
    targetPlayerId: string | undefined,
    cost: number,
    randomState: number,
    attackSide?: Exclude<AttackSide, "center">,
  ) => void;
  onQueueSubstitution: (
    outgoingPlayerId: string,
    incomingPlayerId: string,
  ) => void;
  onCancelSubstitution: (pendingId: string) => void;
  onSwitchSubTactic: (slot: "sub1" | "sub2") => void;
  onComplete: () => void;
}

export function defaultPositionFilterForCommand(
  kind?: CommandKind,
): "ALL" | Position {
  if (!kind) return "ALL";
  const definition = COMMANDS[kind];
  if (!definition.needsPlayer || definition.targetDetailedPositions) return "ALL";
  return definition.targetPositions?.length === 1
    ? definition.targetPositions[0]
    : "ALL";
}

type HydrationSubTacticSlot = "sub1" | "sub2";

export function toggleHydrationSubTacticSelection(
  selectedSlot: HydrationSubTacticSlot | undefined,
  requestedSlot: HydrationSubTacticSlot,
): HydrationSubTacticSlot | undefined {
  return selectedSlot === requestedSlot ? undefined : requestedSlot;
}

const hydrationSubTacticCost = (slot: HydrationSubTacticSlot) =>
  slot === "sub1" ? 18 : 32;

export function confirmHydrationSubTacticSelection(
  selectedSlot: HydrationSubTacticSlot | undefined,
  remainingSeconds: number,
): { slot: HydrationSubTacticSlot; cost: number } | undefined {
  if (!selectedSlot) return undefined;
  const cost = hydrationSubTacticCost(selectedSlot);
  return remainingSeconds >= cost ? { slot: selectedSlot, cost } : undefined;
}

export function HydrationScreen({
  match,
  memo,
  progress,
  onProgressChange,
  onApplyCommand,
  onQueueSubstitution,
  onCancelSubstitution,
  onSwitchSubTactic,
  onComplete,
}: HydrationScreenProps) {
  const hydrationPhase: HydrationPhase =
    match.phase === "HYDRATION_SECOND"
      ? "HYDRATION_SECOND"
      : "HYDRATION_FIRST";
  const restoredProgress =
    progress?.phase === hydrationPhase ? progress : undefined;
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>();
  const [detailPlayerId, setDetailPlayerId] = useState<string>();
  const [selectedCommand, setSelectedCommand] = useState<CommandKind>();
  const [attackDirection, setAttackDirection] = useState<
    Exclude<AttackSide, "center"> | undefined
  >(undefined);
  const [positionFilter, setPositionFilter] = useState<"ALL" | Position>(
    "ALL",
  );
  const [deliveredKinds, setDeliveredKinds] = useState<CommandKind[]>(
    () => restoredProgress?.deliveredKinds ?? [],
  );
  const [breakTool, setBreakTool] = useState<
    "commands" | "roster" | "tactics"
  >(
    "commands",
  );
  const [selectedBreakSubTactic, setSelectedBreakSubTactic] =
    useState<HydrationSubTacticSlot>();
  const [rosterSide, setRosterSide] = useState<"home" | "away">("home");
  const [rosterPlayerId, setRosterPlayerId] = useState<string>();
  const [compareBasePlayerId, setCompareBasePlayerId] = useState<string>();
  const [spentCommandSeconds, setSpentCommandSeconds] = useState(
    () => restoredProgress?.spentCommandSeconds ?? 0,
  );
  const [now, setNow] = useState(() => Date.now());
  const [countdownStartsAtMs] = useState(
    () => restoredProgress?.countdownStartsAtMs ?? Date.now() + 3000,
  );
  const [pendingDelivery, setPendingDelivery] = useState<{
    id: string;
    kind: CommandKind;
    targetPlayerId?: string;
    cost: number;
    randomState: number;
    attackSide?: Exclude<AttackSide, "center">;
    startedAt: number;
  }>();
  const [message, setMessage] = useState(
    "메모와 코치 피드백을 확인하고 중요한 지시부터 선택하십시오.",
  );
  const completeOnce = useRef(false);
  const completedDeliveryIds = useRef(new Set<string>());

  const briefingReady = now >= countdownStartsAtMs;
  const remaining = briefingReady
    ? calculateBreakRemaining(
        countdownStartsAtMs,
        now,
        spentCommandSeconds,
      )
    : 180;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 120);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    onProgressChange?.({
      phase: hydrationPhase,
      countdownStartsAtMs,
      spentCommandSeconds,
      deliveredKinds,
    });
  }, [
    countdownStartsAtMs,
    deliveredKinds,
    hydrationPhase,
    onProgressChange,
    spentCommandSeconds,
  ]);

  useEffect(() => {
    if (
      briefingReady &&
      remaining <= 0 &&
      !pendingDelivery &&
      !completeOnce.current
    ) {
      completeOnce.current = true;
      const timeout = window.setTimeout(onComplete, 650);
      return () => window.clearTimeout(timeout);
    }
  }, [briefingReady, remaining, onComplete, pendingDelivery]);

  const hydrationPendingOutgoingIds = new Set(
    (match.pendingSubstitutions ?? []).map(
      (substitution) => substitution.outgoingPlayerId,
    ),
  );
  const selectedPlayer = match.players.find(
    (player) =>
      player.id === selectedPlayerId &&
      !hydrationPendingOutgoingIds.has(player.id),
  );
  const definition = selectedCommand
    ? COMMANDS[selectedCommand]
    : undefined;
  const homePlayers = match.players.filter(
    (player) => player.side === "home" && player.onField,
  );
  const allowedPositions = definition?.targetPositions;
  const allowedDetailedPositions = definition?.targetDetailedPositions;
  const eligiblePlayers = homePlayers.filter(
    (player) =>
      !hydrationPendingOutgoingIds.has(player.id) &&
      (!allowedPositions || allowedPositions.includes(player.position)) &&
      (!allowedDetailedPositions ||
        allowedDetailedPositions.includes(player.detailedPosition)) &&
      (positionFilter === "ALL" || player.position === positionFilter),
  );
  const averageUnderstanding =
    homePlayers.reduce(
      (total, player) => total + player.attributes.tacticalUnderstanding,
      0,
    ) / homePlayers.length;
  const averageTrust =
    homePlayers.reduce((total, player) => total + player.managerTrust, 0) /
    homePlayers.length;
  const selectedCost =
    definition && (!definition.needsPlayer || selectedPlayer)
      ? calculateCommandCost(definition, {
          player: definition.needsPlayer ? selectedPlayer : undefined,
          averageUnderstanding,
          averageTrust,
          prepared: definition.kind === "PREPARED_PLAN",
          randomState: match.randomState + match.commands.length * 97,
        })
      : undefined;
  const deliveryElapsed = pendingDelivery
    ? Math.max(0, now - pendingDelivery.startedAt)
    : 0;
  const deliveryProgress = pendingDelivery
    ? Math.min(100, (deliveryElapsed / DELIVERY_ANIMATION_MS) * 100)
    : 0;

  useEffect(() => {
    if (
      !pendingDelivery ||
      deliveryProgress < 100 ||
      completedDeliveryIds.current.has(pendingDelivery.id)
    ) {
      return;
    }
    completedDeliveryIds.current.add(pendingDelivery.id);
    setSpentCommandSeconds(
      (current) => current + pendingDelivery.cost,
    );
    onApplyCommand(
      pendingDelivery.kind,
      pendingDelivery.targetPlayerId,
      pendingDelivery.cost,
      pendingDelivery.randomState,
      pendingDelivery.attackSide,
    );
    const deliveredDefinition = COMMANDS[pendingDelivery.kind];
    const target = match.players.find(
      (player) => player.id === pendingDelivery.targetPlayerId,
    );
    setMessage(
      `${target ? `${target.name}에게 ` : ""}${deliveredDefinition.label} 전달 완료 · ${pendingDelivery.cost}초 소요`,
    );
    setPendingDelivery(undefined);
    setDeliveredKinds((current) =>
      current.includes(pendingDelivery.kind)
        ? current
        : [...current, pendingDelivery.kind],
    );
    setSelectedCommand(undefined);
  }, [
    deliveryProgress,
    match.players,
    onApplyCommand,
    pendingDelivery,
  ]);

  const commitCommand = () => {
    if (!definition) {
      setMessage("전달할 지시를 먼저 선택하십시오.");
      return;
    }
    if (definition.needsPlayer && !selectedPlayer) {
      setMessage("이 지시를 전달할 선수를 전술판에서 선택하십시오.");
      return;
    }
    if (definition.kind === "ATTACK_WIDE" && !attackDirection) {
      setMessage("공격할 측면을 왼쪽, 오른쪽 또는 양쪽으로 지정하십시오.");
      return;
    }
    if (!briefingReady || pendingDelivery) return;
    const result = selectedCost;
    if (!result) return;
    if (result.cost > remaining) {
      setMessage(
        `전달 시간이 부족합니다. 최소 ${definition.minCost}초 이상 확보해야 합니다.`,
      );
      return;
    }

    setPendingDelivery({
      id: `${definition.kind}-${now}`,
      kind: definition.kind,
      targetPlayerId: definition.needsPlayer ? selectedPlayer?.id : undefined,
      cost: result.cost,
      randomState: result.randomState,
      attackSide:
        definition.kind === "ATTACK_WIDE" ? attackDirection : undefined,
      startedAt: now,
    });
    setMessage(
      `${definition.needsPlayer && selectedPlayer ? `${selectedPlayer.name}에게 ` : ""}${definition.label} 전달 중 · ${result.cost}초 필요`,
    );
  };

  const selectBreakTactic = (slot: HydrationSubTacticSlot) => {
    const next = toggleHydrationSubTacticSelection(
      selectedBreakSubTactic,
      slot,
    );
    setSelectedBreakSubTactic(next);
    setMessage(
      next
        ? `${slot === "sub1" ? "서브 전술 1" : "서브 전술 2"} 선택 · 적용을 눌러야 전환됩니다.`
        : "서브 전술 선택을 취소했습니다.",
    );
  };

  const applyBreakTactic = () => {
    if (!selectedBreakSubTactic) {
      setMessage("적용할 서브 전술을 먼저 선택하십시오.");
      return;
    }
    const confirmed = confirmHydrationSubTacticSelection(
      selectedBreakSubTactic,
      remaining,
    );
    if (pendingDelivery || !confirmed) {
      setMessage(
        `전술 전환에 필요한 ${hydrationSubTacticCost(selectedBreakSubTactic)}초가 부족합니다.`,
      );
      return;
    }
    setSpentCommandSeconds((current) => current + confirmed.cost);
    onSwitchSubTactic(confirmed.slot);
    setMessage(
      `${confirmed.slot === "sub1" ? "서브 전술 1" : "서브 전술 2"} 전환 완료 · ${confirmed.cost}초 소요`,
    );
    setSelectedBreakSubTactic(undefined);
  };

  return (
    <main className="break-shell">
      <header className="break-header">
        <div>
          <span className="brand-mark">잠.물.마</span>
          <strong>
            {match.phase === "HYDRATION_FIRST" ? "전반" : "후반"} 하이드레이션
            브레이크
          </strong>
        </div>
        <div className={`break-timer ${remaining <= 45 ? "is-urgent" : ""}`}>
          <span>BREAK TIMER</span>
          <strong>{String(remaining).padStart(3, "0")}</strong>
          <b>초</b>
          <small>실제 1초마다 3초 감소</small>
        </div>
        <div className="break-score">
          <span>
            KOR <b>{match.score.home}</b>
          </span>
          <i />
          <span>
            <b>{match.score.away}</b> {match.awayTeam.shortName}
          </span>
        </div>
      </header>

      <section className="break-layout">
        <aside className="break-context">
          <div className="break-section">
            <div className="situation-summary">
              <span>구간 요약</span>
              <strong>{breakHeadline(match)}</strong>
              <div>
                <p>
                  슈팅 <b>{match.metrics.homeShots}</b> :{" "}
                  <b>{match.metrics.awayShots}</b>
                </p>
                <p>
                  패스{" "}
                  <b>
                    {match.metrics.homePassAttempts
                      ? Math.round(
                          (match.metrics.homePassSuccess /
                            match.metrics.homePassAttempts) *
                            100,
                        )
                      : 0}
                    %
                  </b>
                </p>
                <p>
                  평균 체력 <b>{Math.round(averageTeamStamina(match))}</b>
                </p>
              </div>
            </div>
            <div className="panel-title-row tight">
              <div>
                <span>YOUR NOTES</span>
                <h2>경기 메모</h2>
              </div>
            </div>
            <div className="memo-paper">
              {memo ? (
                memo
                  .split("\n")
                  .map((line, index) => <p key={`${index}-${line}`}>{line}</p>)
              ) : (
                <p className="muted">작성한 메모가 없습니다.</p>
              )}
            </div>
          </div>
          <div className="break-section">
            <div className="panel-title-row tight">
              <div>
                <span>STAFF PRIORITY</span>
                <h2>긴급 피드백</h2>
              </div>
            </div>
            {match.feedback.slice(0, 3).map((feedback) => (
              <article key={feedback.id} className="break-feedback">
                <span className={`severity severity-${feedback.severity}`}>
                  {feedback.severity}
                </span>
                <div>
                  <strong>{feedback.coach} 코치</strong>
                  <p>{feedback.text}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="delivered-list">
            <span>전달 완료 {match.commands.length}</span>
            {match.commands.slice(-3).map((command) => (
              <p key={command.id}>
                <b>{command.cost}초</b> {command.label}
              </p>
            ))}
          </div>
        </aside>

        <section className="break-board">
          <div className="panel-title-row">
            <div>
              <span>SELECT TARGET</span>
              <h2>
                {definition?.needsPlayer ? "지시 대상 선수" : "팀 전체 지시"}
              </h2>
            </div>
            {selectedPlayer && (
              <div className="selected-target">
                <span>{selectedPlayer.number}</span>
                <strong>{selectedPlayer.name}</strong>
                <button
                  type="button"
                  onClick={() => setDetailPlayerId(selectedPlayer.id)}
                >
                  자세히
                </button>
              </div>
            )}
          </div>
          <div className="position-filter" aria-label="선수 포지션 필터">
            {(["ALL", "GK", "DF", "MF", "FW"] as const).map((position) => {
              const unavailable =
                position !== "ALL" &&
                Boolean(allowedPositions && !allowedPositions.includes(position));
              return (
                <button
                  type="button"
                  key={position}
                  disabled={unavailable || !definition?.needsPlayer}
                  className={positionFilter === position ? "is-active" : ""}
                  onClick={() => {
                    setPositionFilter(position);
                    setSelectedPlayerId(undefined);
                  }}
                >
                  {position === "ALL" ? "전체" : position}
                </button>
              );
            })}
          </div>
          <TacticalBoard
            match={match}
            selectedPlayerId={selectedPlayerId}
            highlightedPlayerIds={
              definition?.needsPlayer
                ? eligiblePlayers.map((player) => player.id)
                : undefined
            }
            onSelectPlayer={(playerId) => {
              if (!definition?.needsPlayer) return;
              setSelectedPlayerId(playerId);
            }}
          />
          <div className="break-player-chips">
            {(definition?.needsPlayer ? eligiblePlayers : homePlayers).map((player) => (
              <button
                type="button"
                key={player.id}
                disabled={!definition?.needsPlayer}
                className={selectedPlayerId === player.id ? "is-selected" : ""}
                onClick={() => {
                  if (definition?.needsPlayer) setSelectedPlayerId(player.id);
                }}
              >
                <span>{player.number}</span>
                {player.name}
                <b>{Math.round(player.currentStamina)}</b>
              </button>
            ))}
          </div>
        </section>

        <aside className={`command-panel ${breakTool !== "commands" ? "is-roster-mode" : ""}`}>
          <div className="break-tools-tabs">
            <button
              type="button"
              className={breakTool === "commands" ? "is-active" : ""}
              onClick={() => setBreakTool("commands")}
            >
              전술 지시
            </button>
            <button
              type="button"
              className={breakTool === "roster" ? "is-active" : ""}
              onClick={() => setBreakTool("roster")}
            >
              선수·교체
            </button>
            <button
              type="button"
              className={breakTool === "tactics" ? "is-active" : ""}
              onClick={() => setBreakTool("tactics")}
            >
              서브 전술
            </button>
          </div>
          {breakTool === "commands" ? (
            <>
              <div className="panel-title-row">
                <div>
                  <span>DELIVER MESSAGE</span>
                  <h2>행동 선택</h2>
                </div>
              </div>
              <div className="command-list">
            {BREAK_COMMAND_KINDS.map((kind) => {
              const command = COMMANDS[kind];
              const unavailable = remaining < command.minCost;
              const delivered = deliveredKinds.includes(kind);
              return (
                <button
                  key={kind}
                  disabled={unavailable || Boolean(pendingDelivery)}
                  className={`${selectedCommand === kind ? "is-selected" : ""} ${delivered ? "is-delivered" : ""}`}
                  onClick={() => {
                    const next = selectedCommand === kind ? undefined : kind;
                    setSelectedCommand(next);
                    setSelectedPlayerId(undefined);
                    setPositionFilter(defaultPositionFilterForCommand(next));
                    if (next !== "ATTACK_WIDE") setAttackDirection(undefined);
                  }}
                >
                  <span>
                    <small>
                      {command.category}
                      {delivered ? " · 전달 완료" : ""}
                    </small>
                    <strong>{command.label}</strong>
                    <em>{command.effect}</em>
                  </span>
                  <b>
                    {command.minCost}~{command.maxCost}초
                  </b>
                </button>
              );
            })}
              </div>
              <div className="command-confirm">
            {definition ? (
              <>
                <span>선택한 지시</span>
                <strong>{definition.label}</strong>
                <p>{definition.description}</p>
                <div className="effect-tradeoff">
                  <small>효과 · {definition.effect}</small>
                  <small>대가 · {definition.tradeoff}</small>
                </div>
                {definition.kind === "ATTACK_WIDE" && (
                  <div className="attack-direction-picker">
                    <span>공격 방향을 지정하십시오</span>
                    <div>
                      <button
                        type="button"
                        className={attackDirection === "left" ? "is-active" : ""}
                        onClick={() => setAttackDirection("left")}
                      >
                        ← 왼쪽 측면
                      </button>
                      <button
                        type="button"
                        className={attackDirection === "both" ? "is-active" : ""}
                        onClick={() => setAttackDirection("both")}
                      >
                        ↔ 양쪽 측면
                      </button>
                      <button
                        type="button"
                        className={attackDirection === "right" ? "is-active" : ""}
                        onClick={() => setAttackDirection("right")}
                      >
                        오른쪽 측면 →
                      </button>
                    </div>
                  </div>
                )}
                {definition.needsPlayer && (
                  <label className="command-target-select">
                    <span>대상 선수</span>
                    <select
                      value={selectedPlayerId ?? ""}
                      onChange={(event) =>
                        setSelectedPlayerId(event.target.value || undefined)
                      }
                      disabled={Boolean(pendingDelivery)}
                    >
                      <option value="">선수를 선택하십시오</option>
                      {eligiblePlayers.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.number}. {player.name} · {player.detailedPosition}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {selectedCost && (
                  <div className="estimated-cost">
                    예상 전달 시간 <b>{selectedCost.cost}초</b>
                  </div>
                )}
              </>
            ) : (
              <p className="muted">목록에서 전달할 행동을 선택하십시오.</p>
            )}
            <button
              className="button button-primary button-wide"
              onClick={commitCommand}
              disabled={
                !definition ||
                !briefingReady ||
                Boolean(pendingDelivery) ||
                (definition.needsPlayer && !selectedPlayer)
                || (definition.kind === "ATTACK_WIDE" && !attackDirection)
              }
            >
              {pendingDelivery ? "전달 중" : "전달하기"}
              {selectedCost && !pendingDelivery && (
                <span>
                  {selectedCost.cost}초 소요
                </span>
              )}
            </button>
            {pendingDelivery && (
              <div className="delivery-progress" aria-live="polite">
                <i style={{ width: `${deliveryProgress}%` }} />
                <span>
                  {COMMANDS[pendingDelivery.kind].label}{" "}
                  {Math.round(deliveryProgress)}%
                </span>
              </div>
            )}
            <p className="command-message" role="status">
              {message}
            </p>
              </div>
            </>
          ) : breakTool === "roster" ? (
            <div className="break-roster-tools">
              <div className="panel-title-row tight">
                <div>
                  <span>PLAYER DATABASE · SUBSTITUTION</span>
                  <h2>선수 정보와 교체 예약</h2>
                </div>
              </div>
              <div className="prematch-team-toggle">
                <button
                  type="button"
                  className={rosterSide === "home" ? "is-active" : ""}
                  onClick={() => {
                    setRosterSide("home");
                    setRosterPlayerId(undefined);
                  }}
                >
                  우리 팀
                </button>
                <button
                  type="button"
                  className={rosterSide === "away" ? "is-active" : ""}
                  onClick={() => {
                    setRosterSide("away");
                    setRosterPlayerId(undefined);
                  }}
                >
                  상대 보기
                </button>
              </div>
              <TeamRosterPanel
                key={rosterSide}
                match={match}
                side={rosterSide}
                selectedPlayerId={rosterPlayerId}
                onSelectPlayer={setRosterPlayerId}
                allowSubstitution={rosterSide === "home"}
                substitutionMode="queue"
                onSubstitute={onQueueSubstitution}
                onCancelSubstitution={onCancelSubstitution}
                onComparePlayer={setCompareBasePlayerId}
              />
            </div>
          ) : (
            <>
              <SubTacticSwitcher
                match={match}
                costType="seconds"
                disabled={Boolean(pendingDelivery)}
                availableBudget={remaining}
                selectionMode
                selectedSlot={selectedBreakSubTactic}
                onSwitch={selectBreakTactic}
              />
              {selectedBreakSubTactic && (
                <div className="command-confirm">
                  <span>선택한 서브 전술</span>
                  <strong>
                    {selectedBreakSubTactic === "sub1"
                      ? "서브 전술 1"
                      : "서브 전술 2"}
                  </strong>
                  <p>적용을 누르면 전술이 전환되고 시간이 차감됩니다.</p>
                  <button
                    type="button"
                    className="button button-primary button-wide"
                    onClick={applyBreakTactic}
                    disabled={
                      Boolean(pendingDelivery) ||
                      remaining <
                        hydrationSubTacticCost(selectedBreakSubTactic)
                    }
                  >
                    적용
                    <span>
                      {hydrationSubTacticCost(selectedBreakSubTactic)}초 소요
                    </span>
                  </button>
                  <p className="command-message" role="status">
                    {message}
                  </p>
                </div>
              )}
            </>
          )}
        </aside>
      </section>
      {detailPlayerId && (
        <PlayerDetailDialog
          player={
            match.players.find((player) => player.id === detailPlayerId) ??
            match.players[0]
          }
          match={match}
          onClose={() => setDetailPlayerId(undefined)}
        />
      )}
      {compareBasePlayerId && (
        <PlayerComparisonDialog
          match={match}
          basePlayerId={compareBasePlayerId}
          onClose={() => setCompareBasePlayerId(undefined)}
        />
      )}
    </main>
  );
}

interface HalfTimeScreenProps {
  match: MatchState;
  onApplyCommand: (
    kind: CommandKind,
    targetPlayerId?: string,
    cost?: number,
    attackSide?: Exclude<AttackSide, "center">,
  ) => void;
  onRecovery: () => void;
  onQueueSubstitution: (
    outgoingPlayerId: string,
    incomingPlayerId: string,
  ) => void;
  onCancelSubstitution: (pendingId: string) => void;
  onSwitchSubTactic: (slot: "sub1" | "sub2") => void;
  onMovePlayer: (playerId: string, x: number, y: number) => void;
  onSwapPlayers: (
    firstPlayerId: string,
    secondPlayerId: string,
    firstOriginX: number,
    firstOriginY: number,
  ) => void;
  onContinue: () => void;
}

type HalfTimeSubTacticSlot = "sub1" | "sub2";
type HalfTimeActionCategory = "team-spirit" | "team-tactic" | "individual";

interface HalfTimeAction {
  id: string;
  category: HalfTimeActionCategory;
  label: string;
  detail: string;
  cost: number;
  kind?: CommandKind;
  recovery?: boolean;
  needsPlayer?: boolean;
  exclusiveGroup?: string;
  available: boolean;
}

const halfTimeTacticCost = (slot: HalfTimeSubTacticSlot) =>
  slot === "sub1" ? 2 : 4;

export function toggleHalfTimeSubTactic(
  selectedSlot: HalfTimeSubTacticSlot | undefined,
  requestedSlot: HalfTimeSubTacticSlot,
  remainingAp: number,
): { selectedSlot: HalfTimeSubTacticSlot | undefined; remainingAp: number } {
  if (selectedSlot === requestedSlot) {
    return {
      selectedSlot: undefined,
      remainingAp: remainingAp + halfTimeTacticCost(requestedSlot),
    };
  }

  const refundableAp = selectedSlot ? halfTimeTacticCost(selectedSlot) : 0;
  const requestedCost = halfTimeTacticCost(requestedSlot);
  if (remainingAp + refundableAp < requestedCost) {
    return { selectedSlot, remainingAp };
  }

  return {
    selectedSlot: requestedSlot,
    remainingAp: remainingAp + refundableAp - requestedCost,
  };
}

export function toggleHalfTimePlayerTarget(
  selectedIds: string[],
  playerId: string,
  allowMultiple: boolean,
): string[] {
  if (!allowMultiple) return [playerId];
  const alreadySelected = selectedIds.includes(playerId);
  return alreadySelected
    ? selectedIds.filter((id) => id !== playerId)
    : [...selectedIds, playerId];
}

export function updateHalfTimeConserveTargets(
  selectedIds: string[],
  playerId: string,
  remainingAp: number,
): { selectedIds: string[]; remainingAp: number } {
  const alreadySelected = selectedIds.includes(playerId);
  if (!alreadySelected && remainingAp < 1) {
    return { selectedIds, remainingAp };
  }
  return {
    selectedIds: toggleHalfTimePlayerTarget(selectedIds, playerId, true),
    remainingAp: remainingAp + (alreadySelected ? 1 : -1),
  };
}

export function HalfTimeScreen({
  match,
  onApplyCommand,
  onRecovery,
  onQueueSubstitution,
  onCancelSubstitution,
  onSwitchSubTactic,
  onMovePlayer,
  onSwapPlayers,
  onContinue,
}: HalfTimeScreenProps) {
  const [remainingAp, setRemainingAp] = useState(match.halfTimeAp ?? 10);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedSubTactic, setSelectedSubTactic] =
    useState<HalfTimeSubTacticSlot>();
  const [isCommitting, setIsCommitting] = useState(false);
  const commitOnce = useRef(false);
  const [halftimeView, setHalftimeView] = useState<
    "actions" | "players" | "tactics"
  >(
    "actions",
  );
  const [rosterSide, setRosterSide] = useState<"home" | "away">("home");
  const [rosterPlayerId, setRosterPlayerId] = useState<string>();
  const [compareBasePlayerId, setCompareBasePlayerId] = useState<string>();
  const [actionTargets, setActionTargets] = useState<Record<string, string[]>>(
    {},
  );
  const [targetingActionId, setTargetingActionId] = useState<string>();
  const [halfTimeAttackSide, setHalfTimeAttackSide] =
    useState<Exclude<AttackSide, "center">>("both");
  const pendingOutgoingIds = useMemo(
    () =>
      new Set(
        (match.pendingSubstitutions ?? []).map(
          (substitution) => substitution.outgoingPlayerId,
        ),
      ),
    [match.pendingSubstitutions],
  );
  const homePlayers = useMemo(
    () =>
      match.players.filter(
        (player) =>
          player.side === "home" &&
          player.onField &&
          !pendingOutgoingIds.has(player.id),
      ),
    [match.players, pendingOutgoingIds],
  );
  const eligiblePlayersFor = (kind?: CommandKind) => {
    if (!kind) return [];
    const definition = COMMANDS[kind];
    return homePlayers.filter(
      (player) =>
        (!definition.targetPositions ||
          definition.targetPositions.includes(player.position)) &&
        (!definition.targetDetailedPositions ||
          definition.targetDetailedPositions.includes(player.detailedPosition)),
    );
  };
  const selectedTargetLabel = (actionId: string) => {
    const names = (actionTargets[actionId] ?? [])
      .map((playerId) =>
        match.players.find((player) => player.id === playerId)?.name,
      )
      .filter(Boolean);
    if (!names.length) return undefined;
    return names.length === 1 ? names[0] : `${names[0]} 외 ${names.length - 1}명`;
  };
  const actions: HalfTimeAction[] = [
    {
      id: "speech",
      category: "team-spirit",
      label: "팀 전체 연설",
      detail: "집중력과 결속을 강화합니다.",
      cost: 5,
      kind: "CAPTAIN_RALLY",
      available: true,
    },
    {
      id: "recover",
      category: "team-spirit",
      label: "휴식·회복 집중",
      detail: "후반전에 사용할 추가 체력을 확보합니다.",
      cost: 3,
      recovery: true,
      available: true,
    },
    {
      id: "adjust",
      category: "team-tactic",
      label: "측면 넓게 활용",
      detail: `${halfTimeAttackSide === "left" ? "왼쪽" : halfTimeAttackSide === "right" ? "오른쪽" : "양쪽"} 측면의 폭을 넓혀 공격합니다.`,
      cost: 2,
      kind: "ATTACK_WIDE",
      available: true,
    },
    {
      id: "compact",
      category: "team-tactic",
      label: "중앙 밀집 점유",
      detail: "선수 간격을 좁혀 중앙 점유율을 높입니다.",
      cost: 2,
      kind: "COMPACT_POSSESSION",
      available: true,
    },
    {
      id: "short-passing",
      category: "team-tactic",
      label: "숏패스 위주",
      detail: "가까운 동료를 활용해 소유권을 안정시킵니다.",
      cost: 2,
      kind: "SHORT_PASSING",
      exclusiveGroup: "passing-style",
      available: true,
    },
    {
      id: "long-ball",
      category: "team-tactic",
      label: "롱볼 축구",
      detail: "후방에서 전방으로 긴 패스를 빠르게 투입합니다.",
      cost: 2,
      kind: "LONG_BALL",
      exclusiveGroup: "passing-style",
      available: true,
    },
    {
      id: "press",
      category: "team-tactic",
      label: "전방 압박 강화",
      detail: "상대 진영부터 공을 되찾도록 지시하십시오.",
      cost: 2,
      kind: "PRESS_HIGHER",
      available: true,
    },
    {
      id: "lower",
      category: "team-tactic",
      label: "수비 라인 조정",
      detail: "수비 기준선을 내려 뒷공간을 보호하십시오.",
      cost: 2,
      kind: "LOWER_LINE",
      available: true,
    },
    {
      id: "individual",
      category: "individual",
      label: "중앙 침투",
      detail: `${selectedTargetLabel("individual") ?? "공격수"}에게 중앙 침투를 지시합니다.`,
      cost: 2,
      kind: "CENTRAL_RUN",
      needsPlayer: true,
      available: eligiblePlayersFor("CENTRAL_RUN").length > 0,
    },
    {
      id: "track",
      category: "individual",
      label: "윙어 수비 가담",
      detail: `${selectedTargetLabel("track") ?? "측면 선수"}에게 풀백 추적을 지시합니다.`,
      cost: 2,
      kind: "WINGER_TRACK",
      needsPlayer: true,
      available: eligiblePlayersFor("WINGER_TRACK").length > 0,
    },
    {
      id: "conserve",
      category: "individual",
      label: "개인 체력 안배",
      detail: `${selectedTargetLabel("conserve") ?? "선수"}의 체력 소모를 줄입니다. 여러 명을 선택할 수 있으며 별도의 경기력 페널티는 없습니다.`,
      cost: 1,
      kind: "CONSERVE_ENERGY",
      needsPlayer: true,
      available: eligiblePlayersFor("CONSERVE_ENERGY").length > 0,
    },
  ];

  const handleAction = (action: HalfTimeAction) => {
    if (selectedActions.includes(action.id)) {
      const refund =
        action.kind === "CONSERVE_ENERGY"
          ? Math.max(1, actionTargets[action.id]?.length ?? 0)
          : action.cost;
      setRemainingAp((current) => current + refund);
      setSelectedActions((current) =>
        current.filter((actionId) => actionId !== action.id),
      );
      if (action.needsPlayer) {
        setActionTargets((current) => ({ ...current, [action.id]: [] }));
      }
      if (targetingActionId === action.id) setTargetingActionId(undefined);
      return;
    }
    const exclusiveActions = action.exclusiveGroup
      ? actions.filter(
          (candidate) =>
            candidate.exclusiveGroup === action.exclusiveGroup &&
            selectedActions.includes(candidate.id),
        )
      : [];
    const refundableAp = exclusiveActions.reduce(
      (total, candidate) => total + candidate.cost,
      0,
    );
    if (!action.available || remainingAp + refundableAp < action.cost) return;
    setRemainingAp((current) => current + refundableAp - action.cost);
    setSelectedActions((current) => [
      ...current.filter(
        (actionId) =>
          !exclusiveActions.some((candidate) => candidate.id === actionId),
      ),
      action.id,
    ]);
    if (action.needsPlayer) {
      const eligiblePlayers = eligiblePlayersFor(action.kind);
      const currentTargets = actionTargets[action.id] ?? [];
      if (
        !currentTargets.length ||
        currentTargets.some(
          (playerId) =>
            !eligiblePlayers.some((player) => player.id === playerId),
        )
      ) {
        setActionTargets((current) => ({
          ...current,
          [action.id]: [eligiblePlayers[0].id],
        }));
      }
      setTargetingActionId(action.id);
    }
  };

  const commitHalfTime = () => {
    if (commitOnce.current) return;
    commitOnce.current = true;
    setIsCommitting(true);
    if (selectedSubTactic) onSwitchSubTactic(selectedSubTactic);
    actions
      .filter((action) => selectedActions.includes(action.id))
      .filter((action) => action.available)
      .forEach((action) => {
        if (action.recovery) {
          onRecovery();
          return;
        }
        if (!action.kind) return;
        const targetIds = action.needsPlayer
          ? (actionTargets[action.id] ?? [])
          : [undefined];
        targetIds.forEach((targetPlayerId) =>
          onApplyCommand(
            action.kind!,
            targetPlayerId,
            0,
            action.kind === "ATTACK_WIDE" ? halfTimeAttackSide : undefined,
          ),
        );
      });
    onContinue();
  };

  const switchHalfTimeTactic = (slot: "sub1" | "sub2") => {
    const next = toggleHalfTimeSubTactic(
      selectedSubTactic,
      slot,
      remainingAp,
    );
    setSelectedSubTactic(next.selectedSlot);
    setRemainingAp(next.remainingAp);
  };

  const targetingAction = actions.find(
    (action) => action.id === targetingActionId,
  );
  const targetingEligiblePlayers = eligiblePlayersFor(targetingAction?.kind);
  const selectedActionTargetIds = targetingAction
    ? (actionTargets[targetingAction.id] ?? [])
    : [];
  const selectedActionTargetId = selectedActionTargetIds[0];
  const selectActionTarget = (playerId: string) => {
    if (
      !targetingAction ||
      !targetingEligiblePlayers.some((player) => player.id === playerId)
    ) {
      return;
    }
    if (targetingAction.kind === "CONSERVE_ENERGY") {
      const selectedIds = actionTargets[targetingAction.id] ?? [];
      const next = updateHalfTimeConserveTargets(
        selectedIds,
        playerId,
        remainingAp,
      );
      if (next.selectedIds === selectedIds) return;
      setActionTargets((current) => ({
        ...current,
        [targetingAction.id]: next.selectedIds,
      }));
      setRemainingAp(next.remainingAp);
      if (!next.selectedIds.length) {
        setSelectedActions((current) =>
          current.filter((actionId) => actionId !== targetingAction.id),
        );
        setTargetingActionId(undefined);
      }
      return;
    }
    setActionTargets((current) => {
      const selectedIds = current[targetingAction.id] ?? [];
      const nextIds = toggleHalfTimePlayerTarget(
        selectedIds,
        playerId,
        false,
      );
      if (nextIds === selectedIds) return current;
      return {
        ...current,
        [targetingAction.id]: nextIds,
      };
    });
  };
  const actionGroups: Array<{
    category: HalfTimeActionCategory;
    label: string;
    description: string;
  }> = [
    {
      category: "team-spirit",
      label: "팀 사기·결속",
      description: "선수단의 집중력, 결속과 회복을 관리합니다.",
    },
    {
      category: "team-tactic",
      label: "팀 전체 지시",
      description: "후반전의 팀 단위 운영 방식을 정합니다.",
    },
    {
      category: "individual",
      label: "개인 지시",
      description: "선택한 선수에게 구체적인 역할을 전달합니다.",
    },
  ];
  const selectedPersonalActions = actions.filter(
    (action) =>
      action.category === "individual" && selectedActions.includes(action.id),
  );

  return (
    <main className="halftime-shell">
      <header className="halftime-header">
        <span className="brand-mark">잠.물.마</span>
        <div>
          <p className="eyebrow">HALF TIME · TEAM TALK</p>
          <h1>하프타임 전술 조정</h1>
        </div>
        <div className="ap-counter">
          <span>남은 액션 포인트</span>
          <strong>{remainingAp}</strong>
          <b>/ 10 AP</b>
        </div>
      </header>

      <section className="halftime-layout">
        <div className="halftime-analysis">
          <div className="score-card">
            <span>전반 종료</span>
            <div>
              <strong>KOR</strong>
              <b>{match.score.home}</b>
              <i>:</i>
              <b>{match.score.away}</b>
              <strong>{match.awayTeam.shortName}</strong>
            </div>
          </div>
          <div className="halftime-stat-block">
            <span>전반 경기 기록</span>
            <MatchStatsTable
              metrics={match.metrics}
              awayLabel={match.awayTeam.shortName}
              compact
            />
          </div>
          <TacticalBoard
            match={match}
            compact
            selectedPlayerId={
              halftimeView === "players"
                ? rosterPlayerId
                : halftimeView === "actions"
                  ? selectedActionTargetId
                  : undefined
            }
            selectedPlayerIds={
              halftimeView === "actions" && targetingAction
                ? selectedActionTargetIds
                : undefined
            }
            selectableSide={halftimeView === "actions" ? "home" : rosterSide}
            focusSide={
              halftimeView === "players"
                ? rosterSide
                : halftimeView === "actions" && targetingAction
                  ? "home"
                  : undefined
            }
            highlightedPlayerIds={
              halftimeView === "actions" && targetingAction
                ? targetingEligiblePlayers.map((player) => player.id)
                : undefined
            }
            editable={halftimeView === "players" && rosterSide === "home"}
            onSelectPlayer={
              halftimeView === "players"
                ? setRosterPlayerId
                : halftimeView === "actions" && targetingAction
                  ? selectActionTarget
                  : undefined
            }
            onMovePlayer={
              halftimeView === "players" && rosterSide === "home"
                ? onMovePlayer
                : undefined
            }
            onSwapPlayers={
              halftimeView === "players" && rosterSide === "home"
                ? onSwapPlayers
                : undefined
            }
          />
          {halftimeView === "players" && rosterSide === "home" && (
            <p className="halftime-position-note">
              빈 공간에 놓으면 이동하고, 다른 선수 위에 놓으면 위치를 서로 바꿉니다.
            </p>
          )}
        </div>

        <div className="halftime-actions">
          <div className="halftime-view-tabs">
            <button
              type="button"
              className={halftimeView === "actions" ? "is-active" : ""}
              onClick={() => setHalftimeView("actions")}
            >
              전술 조정
            </button>
            <button
              type="button"
              className={halftimeView === "players" ? "is-active" : ""}
              onClick={() => setHalftimeView("players")}
            >
              선수·포지션
            </button>
            <button
              type="button"
              className={halftimeView === "tactics" ? "is-active" : ""}
              onClick={() => setHalftimeView("tactics")}
            >
              서브 전술
            </button>
          </div>
          {halftimeView === "actions" ? (
            <>
              <div className="panel-title-row">
                <div>
                  <span>ALLOCATE ACTION POINTS</span>
                  <h2>후반전 운영 선택</h2>
                </div>
              </div>
              <div className="halftime-action-groups">
                {actionGroups.map((group) => (
                  <section key={group.category} className="halftime-action-group">
                    <header>
                      <strong>{group.label}</strong>
                      <span>{group.description}</span>
                    </header>
                    <div className="ap-action-grid">
                      {actions
                        .filter((action) => action.category === group.category)
                        .map((action) => {
                          const used = selectedActions.includes(action.id);
                          const refundableAp = action.exclusiveGroup
                            ? actions
                                .filter(
                                  (candidate) =>
                                    candidate.exclusiveGroup ===
                                      action.exclusiveGroup &&
                                    selectedActions.includes(candidate.id),
                                )
                                .reduce(
                                  (total, candidate) => total + candidate.cost,
                                  0,
                                )
                            : 0;
                          return (
                            <button
                              type="button"
                              key={action.id}
                              disabled={
                                !action.available ||
                                (!used &&
                                  remainingAp + refundableAp < action.cost)
                              }
                              className={used ? "is-used" : ""}
                              onClick={() => handleAction(action)}
                            >
                              <span>
                                {used
                                  ? action.kind === "CONSERVE_ENERGY"
                                    ? `${actionTargets[action.id]?.length ?? 0}명 · ${actionTargets[action.id]?.length ?? 0} AP · 재클릭하여 전체 취소`
                                    : "선택됨 · 재클릭하여 취소"
                                  : action.kind === "CONSERVE_ENERGY"
                                    ? "선수당 1 AP"
                                    : `${action.cost} AP`}
                              </span>
                              <strong>{action.label}</strong>
                              <p>{action.detail}</p>
                            </button>
                          );
                        })}
                    </div>
                  </section>
                ))}
              </div>
              {selectedActions.includes("adjust") && (
                <div className="halftime-action-config">
                  <div className="attack-direction-picker">
                    <span>활용할 측면을 선택하십시오</span>
                    <div>
                      <button
                        type="button"
                        className={halfTimeAttackSide === "left" ? "is-active" : ""}
                        onClick={() => setHalfTimeAttackSide("left")}
                      >
                        ← 왼쪽
                      </button>
                      <button
                        type="button"
                        className={halfTimeAttackSide === "both" ? "is-active" : ""}
                        onClick={() => setHalfTimeAttackSide("both")}
                      >
                        ↔ 양쪽 모두
                      </button>
                      <button
                        type="button"
                        className={halfTimeAttackSide === "right" ? "is-active" : ""}
                        onClick={() => setHalfTimeAttackSide("right")}
                      >
                        오른쪽 →
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {selectedPersonalActions.length > 0 && (
                <div className="halftime-action-config halftime-target-config">
                  <span>개인 지시 대상 선택</span>
                  <div className="halftime-target-tabs">
                    {selectedPersonalActions.map((action) => (
                      <button
                        type="button"
                        key={action.id}
                        className={
                          targetingActionId === action.id ? "is-active" : ""
                        }
                        onClick={() => setTargetingActionId(action.id)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                  {targetingAction && (
                    <>
                      <p>
                        전술판이나 아래 명단에서 {targetingAction.label} 대상을
                        선택하십시오.
                        {targetingAction.kind === "CONSERVE_ENERGY" &&
                          " 체력 안배는 여러 명을 동시에 선택할 수 있습니다."}
                      </p>
                      <div className="break-player-chips">
                        {targetingEligiblePlayers.map((player) => (
                          <button
                            type="button"
                            key={player.id}
                            className={
                              selectedActionTargetIds.includes(player.id)
                                ? "is-selected"
                                : ""
                            }
                            onClick={() => selectActionTarget(player.id)}
                          >
                            <span>{player.number}</span>
                            {player.name}
                            <b>{Math.round(player.currentStamina)}</b>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          ) : halftimeView === "players" ? (
            <div className="halftime-roster-view">
              <div className="prematch-team-toggle">
                <button
                  type="button"
                  className={rosterSide === "home" ? "is-active" : ""}
                  onClick={() => {
                    setRosterSide("home");
                    setRosterPlayerId(undefined);
                  }}
                >
                  우리 팀
                </button>
                <button
                  type="button"
                  className={rosterSide === "away" ? "is-active" : ""}
                  onClick={() => {
                    setRosterSide("away");
                    setRosterPlayerId(undefined);
                  }}
                >
                  상대 보기
                </button>
              </div>
              <TeamRosterPanel
                key={rosterSide}
                match={match}
                side={rosterSide}
                selectedPlayerId={rosterPlayerId}
                onSelectPlayer={setRosterPlayerId}
                allowSubstitution={rosterSide === "home"}
                substitutionMode="queue"
                onSubstitute={onQueueSubstitution}
                onCancelSubstitution={onCancelSubstitution}
                onComparePlayer={setCompareBasePlayerId}
              />
            </div>
          ) : (
            <SubTacticSwitcher
              match={match}
              costType="ap"
              availableBudget={
                remainingAp +
                (selectedSubTactic
                  ? halfTimeTacticCost(selectedSubTactic)
                  : 0)
              }
              pendingSlot={selectedSubTactic}
              onSwitch={switchHalfTimeTactic}
            />
          )}
          <button
            className="button button-primary button-wide"
            onClick={commitHalfTime}
            disabled={isCommitting}
          >
            {isCommitting ? "후반전 준비 중" : "선택 적용 후 후반전 시작"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
      {compareBasePlayerId && (
        <PlayerComparisonDialog
          match={match}
          basePlayerId={compareBasePlayerId}
          onClose={() => setCompareBasePlayerId(undefined)}
        />
      )}
    </main>
  );
}
