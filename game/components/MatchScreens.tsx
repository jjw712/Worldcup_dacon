"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COMMANDS, calculateCommandCost } from "../engine/commands";
import { averageTeamStamina } from "../engine/matchEngine";
import { calculateBreakRemaining } from "../engine/timer";
import type {
  CommandKind,
  MatchPhase,
  MatchState,
} from "../types";
import { TacticalBoard } from "./TacticalBoard";

const PHASE_LABELS: Partial<Record<MatchPhase, string>> = {
  OBSERVE_0_22: "전반 0~22분",
  OBSERVE_22_45: "전반 22~45분",
  OBSERVE_45_67: "후반 45~67분",
  OBSERVE_67_90: "후반 67~90분",
};

interface ObservationScreenProps {
  match: MatchState;
  selectedPlayerId?: string;
  memo: string;
  onSelectPlayer: (playerId: string) => void;
  onMemoChange: (memo: string) => void;
}

export function ObservationScreen({
  match,
  selectedPlayerId,
  memo,
  onSelectPlayer,
  onMemoChange,
}: ObservationScreenProps) {
  const selectedPlayer = match.players.find(
    (player) => player.id === selectedPlayerId,
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
        <div className="observation-lock">
          <span>관찰 구간</span>
          <strong>전술 변경 잠금</strong>
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
                  className={`event-row emphasis-${event.emphasis ?? "normal"}`}
                >
                  <time>{event.minute}′</time>
                  <p>{event.text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="match-panel coach-panel">
            <div className="panel-title-row tight">
              <div>
                <span>STAFF ROOM</span>
                <h2>코치 피드백</h2>
              </div>
            </div>
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
                슈팅 <b>{match.metrics.homeShots}</b>
              </span>
              <span>
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
              </span>
              <span>
                평균 체력 <b>{Math.round(averageTeamStamina(match))}</b>
              </span>
            </div>
          </div>
          <TacticalBoard
            match={match}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={onSelectPlayer}
          />
          <div className="board-legend">
            <span>
              <i className="legend-player korea" /> 대한민국
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

        <aside className="match-right-column">
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
                        style={{
                          width: `${player.currentStamina}%`,
                          background:
                            player.currentStamina < 45
                              ? "#ef6b62"
                              : player.currentStamina < 65
                                ? "#f0be4b"
                                : "#bfe855",
                        }}
                      />
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
                  전술 이해 {selectedPlayer.attributes.tacticalUnderstanding}
                </small>
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

interface HydrationScreenProps {
  match: MatchState;
  memo: string;
  onApplyCommand: (
    kind: CommandKind,
    targetPlayerId: string | undefined,
    cost: number,
    randomState: number,
  ) => void;
  onComplete: () => void;
}

export function HydrationScreen({
  match,
  memo,
  onApplyCommand,
  onComplete,
}: HydrationScreenProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>();
  const [selectedCommand, setSelectedCommand] = useState<CommandKind>();
  const [deductions, setDeductions] = useState(0);
  const [now, setNow] = useState(() => performance.now());
  const [message, setMessage] = useState(
    "메모와 코치 피드백을 확인하고 중요한 지시부터 선택하십시오.",
  );
  const [startedAt] = useState(() => performance.now());
  const completeOnce = useRef(false);

  const remaining = calculateBreakRemaining(
    startedAt,
    now,
    deductions,
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(performance.now()), 120);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (remaining <= 0 && !completeOnce.current) {
      completeOnce.current = true;
      const timeout = window.setTimeout(onComplete, 650);
      return () => window.clearTimeout(timeout);
    }
  }, [remaining, onComplete]);

  const selectedPlayer = match.players.find(
    (player) => player.id === selectedPlayerId,
  );
  const definition = selectedCommand
    ? COMMANDS[selectedCommand]
    : undefined;
  const homePlayers = match.players.filter(
    (player) => player.side === "home" && player.onField,
  );
  const averageUnderstanding =
    homePlayers.reduce(
      (total, player) => total + player.attributes.tacticalUnderstanding,
      0,
    ) / homePlayers.length;
  const averageTrust =
    homePlayers.reduce((total, player) => total + player.managerTrust, 0) /
    homePlayers.length;

  const commitCommand = () => {
    if (!definition) {
      setMessage("전달할 지시를 먼저 선택하십시오.");
      return;
    }
    if (definition.needsPlayer && !selectedPlayer) {
      setMessage("이 지시를 전달할 선수를 전술판에서 선택하십시오.");
      return;
    }
    const result = calculateCommandCost(definition, {
      player: selectedPlayer,
      averageUnderstanding,
      averageTrust,
      prepared: definition.kind === "PREPARED_PLAN",
      randomState: match.randomState + match.commands.length * 97,
    });
    if (result.cost > remaining) {
      setMessage(
        `전달 시간이 부족합니다. 최소 ${definition.minCost}초 이상 확보해야 합니다.`,
      );
      return;
    }

    setDeductions((current) => current + result.cost);
    onApplyCommand(
      definition.kind,
      selectedPlayer?.id,
      result.cost,
      result.randomState,
    );
    setMessage(
      `${selectedPlayer ? `${selectedPlayer.name}에게 ` : ""}${definition.label} 전달 완료 · ${result.cost}초 차감`,
    );
    setSelectedCommand(undefined);
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
            <div className="panel-title-row tight">
              <div>
                <span>YOUR NOTES</span>
                <h2>내가 본 문제</h2>
              </div>
            </div>
            <div className="memo-paper">
              {memo ? (
                memo.split("\n").map((line) => <p key={line}>{line}</p>)
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
              <h2>누구에게 말할 것인가</h2>
            </div>
            {selectedPlayer && (
              <div className="selected-target">
                <span>{selectedPlayer.number}</span>
                <strong>{selectedPlayer.name}</strong>
              </div>
            )}
          </div>
          <TacticalBoard
            match={match}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
          />
          <div className="break-player-chips">
            {homePlayers.map((player) => (
              <button
                key={player.id}
                className={selectedPlayerId === player.id ? "is-selected" : ""}
                onClick={() => setSelectedPlayerId(player.id)}
              >
                <span>{player.number}</span>
                {player.name}
                <b>{Math.round(player.currentStamina)}</b>
              </button>
            ))}
          </div>
        </section>

        <aside className="command-panel">
          <div className="panel-title-row">
            <div>
              <span>DELIVER MESSAGE</span>
              <h2>행동 선택</h2>
            </div>
          </div>
          <div className="command-list">
            {(Object.keys(COMMANDS) as CommandKind[]).map((kind) => {
              const command = COMMANDS[kind];
              const unavailable = remaining < command.minCost;
              return (
                <button
                  key={kind}
                  disabled={unavailable}
                  className={selectedCommand === kind ? "is-selected" : ""}
                  onClick={() => setSelectedCommand(kind)}
                >
                  <span>
                    <small>{command.category}</small>
                    <strong>{command.label}</strong>
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
              </>
            ) : (
              <p className="muted">목록에서 전달할 행동을 선택하십시오.</p>
            )}
            <button
              className="button button-primary button-wide"
              onClick={commitCommand}
              disabled={!definition}
            >
              전달하기
              {definition && (
                <span>
                  -{definition.minCost}~{definition.maxCost}초
                </span>
              )}
            </button>
            <p className="command-message" role="status">
              {message}
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

interface HalfTimeScreenProps {
  match: MatchState;
  onApplyCommand: (
    kind: CommandKind,
    targetPlayerId?: string,
    cost?: number,
  ) => void;
  onRecovery: () => void;
  onContinue: () => void;
}

export function HalfTimeScreen({
  match,
  onApplyCommand,
  onRecovery,
  onContinue,
}: HalfTimeScreenProps) {
  const [remainingAp, setRemainingAp] = useState(10);
  const [usedActions, setUsedActions] = useState<string[]>([]);
  const forward = useMemo(
    () =>
      match.players.find(
        (player) =>
          player.side === "home" &&
          player.onField &&
          player.position === "FW",
      ),
    [match.players],
  );
  const actions = [
    {
      id: "prepared",
      label: "준비된 예비 전술",
      detail: "측면 전환 플랜 적용",
      cost: 3,
      run: () => onApplyCommand("PREPARED_PLAN", undefined, 0),
    },
    {
      id: "adjust",
      label: "기존 전술 미세 조정",
      detail: "공격 폭과 방향 조정",
      cost: 2,
      run: () => onApplyCommand("ATTACK_WIDE", undefined, 0),
    },
    {
      id: "individual",
      label: "개인 특별 지시",
      detail: `${forward?.name ?? "공격수"} 중앙 침투`,
      cost: 2,
      run: () => onApplyCommand("CENTRAL_RUN", forward?.id, 0),
    },
    {
      id: "recover",
      label: "휴식·회복 집중",
      detail: "후반 체력 회복량 증가",
      cost: 3,
      run: onRecovery,
    },
    {
      id: "speech",
      label: "팀 전체 연설",
      detail: "집중력과 결속 강화",
      cost: 5,
      run: () => onApplyCommand("CAPTAIN_RALLY", undefined, 0),
    },
  ];

  const handleAction = (action: (typeof actions)[number]) => {
    if (remainingAp < action.cost || usedActions.includes(action.id)) return;
    action.run();
    setRemainingAp((current) => current - action.cost);
    setUsedActions((current) => [...current, action.id]);
  };

  return (
    <main className="halftime-shell">
      <header className="halftime-header">
        <span className="brand-mark">잠.물.마</span>
        <div>
          <p className="eyebrow">HALF TIME · STRATEGIC RESET</p>
          <h1>이번에는 시간이 아니라 조합의 문제입니다.</h1>
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
          <TacticalBoard match={match} compact />
          <div className="halftime-metrics">
            <div>
              <span>패스 성공</span>
              <strong>
                {match.metrics.homePassAttempts
                  ? Math.round(
                      (match.metrics.homePassSuccess /
                        match.metrics.homePassAttempts) *
                        100,
                    )
                  : 0}
                %
              </strong>
            </div>
            <div>
              <span>슈팅</span>
              <strong>{match.metrics.homeShots}</strong>
            </div>
            <div>
              <span>평균 체력</span>
              <strong>{Math.round(averageTeamStamina(match))}</strong>
            </div>
          </div>
        </div>

        <div className="halftime-actions">
          <div className="panel-title-row">
            <div>
              <span>ALLOCATE ACTION POINTS</span>
              <h2>무엇에 시간을 더 쓸 것인가</h2>
            </div>
          </div>
          <div className="ap-action-grid">
            {actions.map((action) => {
              const used = usedActions.includes(action.id);
              return (
                <button
                  key={action.id}
                  disabled={remainingAp < action.cost || used}
                  className={used ? "is-used" : ""}
                  onClick={() => handleAction(action)}
                >
                  <span>{used ? "적용 완료" : `${action.cost} AP`}</span>
                  <strong>{action.label}</strong>
                  <p>{action.detail}</p>
                </button>
              );
            })}
          </div>
          <button
            className="button button-primary button-wide"
            onClick={onContinue}
          >
            후반전 시작
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </main>
  );
}
