"use client";

import { useEffect, useState } from "react";
import { MATCH_DEFINITIONS, TEAMS } from "../data";
import { sortedStandings } from "../engine/campaign";
import type {
  CampaignState,
  MatchState,
  Side,
  TacticLoadout,
  TacticPresetId,
} from "../types";
import { PlayerComparisonDialog } from "./PlayerComparisonDialog";
import { TacticalBoard } from "./TacticalBoard";
import { TeamRosterPanel } from "./TeamRosterPanel";
import { TacticPresetSelector } from "./TacticPresetSelector";

interface LandingScreenProps {
  hasSavedCampaign: boolean;
  onNewCampaign: () => void;
  onContinue: () => void;
}

export function LandingScreen({
  hasSavedCampaign,
  onNewCampaign,
  onContinue,
}: LandingScreenProps) {
  const [confirmNewCampaign, setConfirmNewCampaign] = useState(false);
  useEffect(() => {
    if (!confirmNewCampaign) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmNewCampaign(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmNewCampaign]);

  return (
    <main className="landing-shell">
      <div className="landing-grid" aria-hidden="true" />
      <header className="landing-header">
        <div className="brand-lockup">
          <span className="brand-mark">잠.물.마</span>
          <span className="brand-kicker">WORLD CUP TACTICAL SIMULATION</span>
        </div>
        <span className="status-pill">
          <span className="status-dot" />
          캠페인 준비 완료
        </span>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">180초의 작전 · 실제 최대 60초</p>
          <h1>
            다 말할 시간은 없다.
            <br />
            <span>중요한 것부터.</span>
          </h1>
          <p className="hero-description">
            경기를 읽고, 문제를 기억하고, 물을 마시는 짧은 순간에 가장
            중요한 지시부터 전달하십시오. 말하지 못한 전술은 경기장에
            존재하지 않습니다.
          </p>
          <div className="hero-actions">
            <button
              className="button button-primary"
              onClick={() => {
                if (hasSavedCampaign) setConfirmNewCampaign(true);
                else onNewCampaign();
              }}
            >
              새 캠페인 시작
              <span aria-hidden="true">→</span>
            </button>
            {hasSavedCampaign && (
              <button className="button button-ghost" onClick={onContinue}>
                저장된 작전 계속
              </button>
            )}
          </div>
          <div className="hero-rules">
            <div>
              <strong>01</strong>
              <span>경기 중에는 관찰과 메모</span>
            </div>
            <div>
              <strong>02</strong>
              <span>브레이크에서만 전술 전달</span>
            </div>
            <div>
              <strong>03</strong>
              <span>선택의 효과와 대가 확인</span>
            </div>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="timer-orbit timer-orbit-one" />
          <div className="timer-orbit timer-orbit-two" />
          <div className="hero-timer">
            <span className="hero-timer-label">BREAK TIMER</span>
            <strong>180</strong>
            <span className="hero-timer-unit">초</span>
            <small>실제 1초마다 3초 감소</small>
          </div>
          <div className="floating-card floating-card-left">
            <span>수비 코치</span>
            <strong>오른쪽 측면 수적 열세</strong>
          </div>
          <div className="floating-card floating-card-right">
            <span>개인 지시</span>
            <strong>예상 차감 12~18초</strong>
          </div>
        </div>
      </section>
      {confirmNewCampaign && (
        <div
          className="new-campaign-backdrop"
          onPointerDown={() => setConfirmNewCampaign(false)}
        >
          <section
            className="new-campaign-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="새 캠페인 시작 확인"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <span>저장 데이터 확인</span>
            <h2>현재 캠페인을 처음부터 시작할까요?</h2>
            <p>기존 경기 결과와 선수 상태가 새 캠페인으로 교체됩니다.</p>
            <div>
              <button
                type="button"
                className="button button-ghost"
                autoFocus
                onClick={() => setConfirmNewCampaign(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={onNewCampaign}
              >
                새 캠페인 시작
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

interface CampaignHubProps {
  campaign: CampaignState;
  onPrepareMatch: () => void;
  onBackToTitle: () => void;
}

export function CampaignHub({
  campaign,
  onPrepareMatch,
  onBackToTitle,
}: CampaignHubProps) {
  const standings = sortedStandings(campaign);
  const nextDefinition = MATCH_DEFINITIONS[campaign.currentRound];
  const opponent = nextDefinition
    ? TEAMS[nextDefinition.opponentId]
    : undefined;

  return (
    <main className="page-shell campaign-page">
      <header className="app-header">
        <button className="brand-button" onClick={onBackToTitle}>
          잠.물.마
        </button>
        <div className="campaign-progress">
          {MATCH_DEFINITIONS.map((definition, index) => (
            <div
              key={definition.id}
              className={`progress-step ${
                index < campaign.currentRound
                  ? "is-complete"
                  : index === campaign.currentRound
                    ? "is-current"
                    : ""
              }`}
            >
              <span>{index + 1}</span>
              <small>{index < campaign.currentRound ? "종료" : `${index + 1}차전`}</small>
            </div>
          ))}
        </div>
        <div className="header-metrics">
          <span>사기 {campaign.morale}</span>
          <span>신뢰 {campaign.managerTrust}</span>
        </div>
      </header>

      <section className="campaign-layout">
        <div className="campaign-main">
          <p className="eyebrow">GROUP STAGE · KOREA CAMPAIGN</p>
          <h1>{nextDefinition?.title ?? "조별리그 종료"}</h1>
          <p className="section-lead">{nextDefinition?.challenge}</p>

          {nextDefinition && opponent && (
            <article className="next-match-card">
              <div className="match-versus">
                <div className="team-crest korea">KOR</div>
                <div>
                  <span>GROUP {nextDefinition.round}</span>
                  <strong>VS</strong>
                  <small>
                    {nextDefinition.weather} · 주심 {nextDefinition.referee}
                  </small>
                </div>
                <div
                  className="team-crest"
                  style={{
                    background: opponent.color,
                    color: opponent.accent,
                  }}
                >
                  {opponent.shortName}
                </div>
              </div>
              <div className="opponent-summary">
                <div>
                  <span>상대 스타일</span>
                  <strong>{opponent.styleName}</strong>
                  <p>{opponent.styleDescription}</p>
                </div>
                <ul>
                  {nextDefinition.briefing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <button
                className="button button-primary button-wide"
                onClick={onPrepareMatch}
              >
                작전실 입장
                <span aria-hidden="true">→</span>
              </button>
            </article>
          )}
        </div>

        <aside className="standings-panel">
          <div className="panel-heading">
            <span>현재 순위</span>
            <strong>GROUP TABLE</strong>
          </div>
          <div className="standings-table">
            <div className="standings-row headings">
              <span>순위</span>
              <span>팀</span>
              <span>경기</span>
              <span>득실</span>
              <span>승점</span>
            </div>
            {standings.map((row, index) => (
              <div
                key={row.teamId}
                className={`standings-row ${row.teamId === "KOR" ? "is-korea" : ""}`}
              >
                <strong>{index + 1}</strong>
                <span>{TEAMS[row.teamId].shortName}</span>
                <span>{row.played}</span>
                <span>
                  {row.goalsFor - row.goalsAgainst > 0 ? "+" : ""}
                  {row.goalsFor - row.goalsAgainst}
                </span>
                <strong>{row.points}</strong>
              </div>
            ))}
          </div>
          <div className="campaign-note">
            <span>캠페인 누적</span>
            <p>
              체력, 카드, 부상, 팀 사기와 감독 신뢰가 다음 경기에
              이어집니다.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

interface PreMatchScreenProps {
  match: MatchState;
  selectedPlayerId?: string;
  onSelectPlayer: (playerId: string) => void;
  onMovePlayer: (playerId: string, x: number, y: number) => void;
  onSwapPlayers: (
    firstPlayerId: string,
    secondPlayerId: string,
    firstOriginX: number,
    firstOriginY: number,
  ) => void;
  onSubstitute: (outgoingPlayerId: string, incomingPlayerId: string) => void;
  onConfigureTactic: (
    slot: keyof TacticLoadout,
    presetId: TacticPresetId,
  ) => void;
  onStart: () => void;
  onBack: () => void;
}

export function PreMatchScreen({
  match,
  selectedPlayerId,
  onSelectPlayer,
  onMovePlayer,
  onSwapPlayers,
  onSubstitute,
  onConfigureTactic,
  onStart,
  onBack,
}: PreMatchScreenProps) {
  const [viewSide, setViewSide] = useState<Side>("home");
  const [awaySelectedPlayerId, setAwaySelectedPlayerId] = useState<
    string | undefined
  >();
  const [compareBasePlayerId, setCompareBasePlayerId] = useState<string>();
  const viewedTeam = viewSide === "home" ? match.homeTeam : match.awayTeam;
  const viewedSelectedPlayerId =
    viewSide === "home" ? selectedPlayerId : awaySelectedPlayerId;
  const selectViewedPlayer = (playerId: string) => {
    if (viewSide === "home") onSelectPlayer(playerId);
    else setAwaySelectedPlayerId(playerId);
  };

  return (
    <main className="page-shell prep-page">
      <header className="app-header">
        <button className="brand-button" onClick={onBack}>
          잠.물.마
        </button>
        <div className="phase-chip">경기 전 준비</div>
        <div className="header-matchup">
          KOR <span>vs</span> {match.awayTeam.shortName}
        </div>
      </header>

      <section className="prep-layout">
        <aside className="prep-sidebar">
          <p className="eyebrow">OPPONENT REPORT</p>
          <h1>{match.awayTeam.name} 분석</h1>
          <div className="style-callout">
            <span>예상 전술</span>
            <strong>{match.awayTeam.formationName} · {match.awayTeam.styleName}</strong>
            <p>{match.awayTeam.styleDescription}</p>
          </div>
          <ul className="briefing-list">
            {match.definition.briefing.map((item, index) => (
              <li key={item}>
                <span>0{index + 1}</span>
                {item}
              </li>
            ))}
          </ul>
          <TacticPresetSelector
            match={match}
            onAssign={onConfigureTactic}
            compact
          />
        </aside>

        <section className="prep-board-panel">
          <div className="panel-title-row">
            <div>
              <span>{viewSide === "home" ? "MY TACTICS" : "OPPONENT VIEW"}</span>
              <h2>
                {viewSide === "home"
                  ? "대한민국 전술 배치"
                  : `${match.awayTeam.name} 예상 배치`}
              </h2>
            </div>
            <div className="prematch-team-toggle" aria-label="전술판 팀 전환">
              <button
                type="button"
                className={viewSide === "home" ? "is-active" : ""}
                onClick={() => {
                  setViewSide("home");
                  onSelectPlayer("");
                }}
              >
                우리 팀
              </button>
              <button
                type="button"
                className={viewSide === "away" ? "is-active" : ""}
                onClick={() => {
                  setViewSide("away");
                  setAwaySelectedPlayerId(undefined);
                }}
              >
                상대 보기
              </button>
            </div>
          </div>
          <TacticalBoard
            match={match}
            selectedPlayerId={viewedSelectedPlayerId}
            editable={viewSide === "home"}
            selectableSide={viewSide}
            focusSide={viewSide}
            onSelectPlayer={selectViewedPlayer}
            onMovePlayer={onMovePlayer}
            onSwapPlayers={viewSide === "home" ? onSwapPlayers : undefined}
          />
          <p className="board-edit-note">
            {viewSide === "home"
              ? "빈 공간에 놓으면 위치가 바뀌고, 다른 선수 위에 놓으면 두 선수의 위치가 교환됩니다."
              : "상대 전술은 스카우팅 예상치이며 열람만 가능합니다."}
          </p>
        </section>

        <aside className="squad-panel">
          <div className="panel-heading">
            <span>{viewSide === "home" ? "우리 팀" : "상대 팀"} · {viewedTeam.name}</span>
            <strong>{viewedTeam.formationName}</strong>
          </div>
          <TeamRosterPanel
            key={viewSide}
            match={match}
            side={viewSide}
            selectedPlayerId={viewedSelectedPlayerId}
            onSelectPlayer={selectViewedPlayer}
            allowSubstitution={viewSide === "home"}
            substitutionMode="lineup"
            onSubstitute={onSubstitute}
            onComparePlayer={setCompareBasePlayerId}
          />
          <button
            className="button button-primary button-wide"
            onClick={onStart}
          >
            경기 시작
          </button>
        </aside>
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
