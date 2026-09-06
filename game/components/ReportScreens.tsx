"use client";

import { TEAMS } from "../data";
import { campaignVerdict, sortedStandings } from "../engine/campaign";
import type { CampaignState, MatchResult } from "../types";
import { CampaignRestartButton } from "./CampaignRestartButton";
import { MatchStatsTable } from "./MatchStatsTable";

interface ReportScreenProps {
  campaign: CampaignState;
  result: MatchResult;
  onContinue: () => void;
  onTitle: () => void;
  onRestartCampaign: () => void;
}

export type DecisionGrade = "A" | "B+" | "B" | "C";

const decisionGrade = (result: MatchResult): DecisionGrade => {
  const evaluations = result.commandEvaluations ?? [];
  const averageExecution = evaluations.length
    ? evaluations.reduce(
        (total, evaluation) => total + evaluation.successRate,
        0,
      ) / evaluations.length
    : 35;
  if (result.pointsEarned === 3 && averageExecution >= 76) return "A";
  if (averageExecution >= 70) return "B+";
  if (averageExecution >= 55) return "B";
  return "C";
};

export function reportHeadline(
  homeGoals: number,
  awayGoals: number,
  grade: DecisionGrade,
): readonly [string, string] {
  const strongGrade = grade === "A" || grade === "B+";

  if (homeGoals > awayGoals) {
    if (strongGrade) return ["탁월한 선택이", "승리를 완성했습니다."];
    if (grade === "B") {
      return ["필요한 순간의 판단이", "승리로 이어졌습니다."];
    }
    return ["승리를 거뒀지만,", "돌아볼 선택도 남았습니다."];
  }

  if (homeGoals === awayGoals) {
    if (strongGrade) return ["좋은 판단으로", "귀중한 승점을 지켜냈습니다."];
    if (grade === "B") {
      return ["치열한 승부 끝에", "승점 1점을 가져왔습니다."];
    }
    return ["승점은 얻었지만,", "아쉬운 선택이 남았습니다."];
  }

  if (strongGrade) {
    return ["결과는 아쉽지만,", "선택의 방향은 분명했습니다."];
  }
  if (grade === "B") {
    return ["패배 속에서도", "다음 경기를 위한 답을 찾았습니다."];
  }
  return ["결과와 선택을", "차분히 되짚어볼 시간입니다."];
}

export function ReportScreen({
  campaign,
  result,
  onContinue,
  onTitle,
  onRestartCampaign,
}: ReportScreenProps) {
  const opponent = TEAMS[result.opponentId];
  const passRate = result.metrics.homePassAttempts
    ? Math.round(
        (result.metrics.homePassSuccess / result.metrics.homePassAttempts) *
          100,
      )
    : 0;
  const grade = decisionGrade(result);
  const headline = reportHeadline(result.homeGoals, result.awayGoals, grade);
  const evaluations = result.commandEvaluations ?? [];
  const averageExecution = evaluations.length
    ? Math.round(
        evaluations.reduce(
          (total, evaluation) => total + evaluation.successRate,
          0,
        ) / evaluations.length,
      )
    : 0;

  return (
    <main className="report-shell">
      <header className="app-header report-header">
        <button className="brand-button" onClick={onTitle}>
          다음 휘슬까지
        </button>
        <div className="phase-chip">경기 후 리포트</div>
        <span>GROUP {result.round} 종료</span>
      </header>

      <section className="report-hero">
        <div>
          <p className="eyebrow">FULL TIME · DECISION REPORT</p>
          <h1>
            {headline[0]}
            <br />
            {headline[1]}
          </h1>
        </div>
        <div className="final-score">
          <span>KOR</span>
          <strong>{result.homeGoals}</strong>
          <i>:</i>
          <strong>{result.awayGoals}</strong>
          <span>{opponent.shortName}</span>
        </div>
        <div className="manager-grade">
          <span>감독 평가</span>
          <strong>{grade}</strong>
        </div>
      </section>

      <section className="report-grid">
        <article className="report-card decision-report">
          <div className="panel-title-row">
            <div>
              <span>YOUR DECISIONS</span>
              <h2>전달한 지시</h2>
            </div>
            <b>{result.commands.length}개</b>
          </div>
          <div className="decision-list">
            {result.commands.length ? (
              result.commands.map((command, index) => (
                <div key={command.id} className="decision-row">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{command.label}</strong>
                    <small>{command.minute}분 · {command.cost ? `${command.cost}초 차감` : "하프타임"}</small>
                    {(() => {
                      const evaluation = evaluations.find(
                        (item) => item.commandId === command.id,
                      );
                      return evaluation ? (
                        <>
                          <div className="evaluation-heading">
                            <b>{evaluation.successRate}%</b>
                            <em>{evaluation.status}</em>
                          </div>
                          <p className="positive">{evaluation.headline}</p>
                          <p>{evaluation.detail}</p>
                        </>
                      ) : (
                        <>
                          <p className="positive">효과 · {command.effect}</p>
                          <p className="negative">대가 · {command.tradeoff}</p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-copy">
                전달된 전술 지시가 없습니다. 기억한 것만으로는 경기장을 바꿀
                수 없습니다.
              </p>
            )}
          </div>
        </article>

        <article className="report-card numbers-report">
          <div className="panel-title-row">
            <div>
              <span>MATCH IMPACT</span>
              <h2>경기 지표</h2>
            </div>
          </div>
          <div className="impact-number-grid">
            <div>
              <span>전술 이행률</span>
              <strong>{averageExecution}%</strong>
              <small>{evaluations.length}개 지시 실측</small>
            </div>
            <div>
              <span>패스 성공률</span>
              <strong>{passRate}%</strong>
              <small>{result.metrics.homePassSuccess}/{result.metrics.homePassAttempts}</small>
            </div>
            <div>
              <span>슈팅</span>
              <strong>{result.metrics.homeShots}</strong>
              <small>상대 {result.metrics.awayShots}</small>
            </div>
            <div>
              <span>공격권 상실</span>
              <strong>{result.metrics.homeTurnovers}</strong>
              <small>관찰 가능한 문제</small>
            </div>
          </div>
          <MatchStatsTable
            metrics={result.metrics}
            awayLabel={opponent.shortName}
            compact
          />
          <div className="causality-note">
            <span>코치 분석</span>
            <p>
              {result.commands.some(
                (command) => command.kind === "WINGER_TRACK",
              )
                ? "윙어의 수비 가담으로 측면 간격은 안정됐지만, 해당 선수의 후반 체력 소모가 증가했습니다."
                : result.metrics.awayRightThreat >= 3
                  ? "상대의 측면 수적 우위가 반복됐지만 직접적인 대응 지시는 전달되지 않았습니다."
                  : "상대의 공격 방향을 비교적 안정적으로 통제했습니다."}
            </p>
          </div>
        </article>

        <article className="report-card campaign-report">
          <div className="panel-title-row">
            <div>
              <span>GROUP TABLE</span>
              <h2>조별리그 현황</h2>
            </div>
          </div>
          <div className="standings-table">
            <div className="standings-row headings">
              <span>순위</span>
              <span>팀</span>
              <span>경기</span>
              <span>득실</span>
              <span>승점</span>
            </div>
            {sortedStandings(campaign).map((row, index) => (
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
          <div className="carry-summary">
            <div>
              <span>팀 사기</span>
              <strong>{campaign.morale}</strong>
            </div>
            <div>
              <span>감독 신뢰</span>
              <strong>{campaign.managerTrust}</strong>
            </div>
            <p>선수 체력은 일부 회복된 뒤 다음 경기에 이어집니다.</p>
          </div>
        </article>
      </section>

      <footer className="report-footer">
        <p>
          {campaign.completed
            ? "세 경기가 모두 끝났습니다. 이제 캠페인 전체 평가를 확인하십시오."
            : `다음 상대는 ${TEAMS[["CZE", "MEX", "RSA"][campaign.currentRound] as "CZE" | "MEX" | "RSA"].name}입니다.`}
        </p>
        <div className="report-footer-actions">
          <CampaignRestartButton onRestart={onRestartCampaign} />
          <button className="button button-primary" onClick={onContinue}>
            {campaign.completed ? "캠페인 최종 평가" : "다음 경기 준비"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </footer>
    </main>
  );
}

interface FinalCampaignScreenProps {
  campaign: CampaignState;
  onRestart: () => void;
  onTitle: () => void;
}

export function FinalCampaignScreen({
  campaign,
  onRestart,
  onTitle,
}: FinalCampaignScreenProps) {
  const standings = sortedStandings(campaign);
  const rank = standings.findIndex((row) => row.teamId === "KOR") + 1;
  const totalCommands = campaign.results.reduce(
    (total, result) => total + result.commands.length,
    0,
  );
  const points = campaign.standings.KOR.points;

  return (
    <main className="final-shell">
      <div className="final-background" aria-hidden="true" />
      <header className="final-header">
        <button className="brand-button light" onClick={onTitle}>
          다음 휘슬까지
        </button>
        <span>CAMPAIGN COMPLETE</span>
      </header>
      <section className="final-content">
        <p className="eyebrow">KOREA · GROUP STAGE RESULT</p>
        <h1>{campaignVerdict(campaign)}</h1>
        <p className="final-lead">
          3경기 동안 당신은 모든 문제를 해결할 수 없었습니다. 대신 어떤
          문제를 먼저 말할지 선택했습니다.
        </p>

        <div className="final-rank">
          <span>최종 순위</span>
          <strong>{rank}</strong>
          <b>위</b>
        </div>

        <div className="final-stat-grid">
          <div>
            <span>승점</span>
            <strong>{points}</strong>
          </div>
          <div>
            <span>전달한 지시</span>
            <strong>{totalCommands}</strong>
          </div>
          <div>
            <span>팀 사기</span>
            <strong>{campaign.morale}</strong>
          </div>
          <div>
            <span>감독 신뢰</span>
            <strong>{campaign.managerTrust}</strong>
          </div>
        </div>

        <div className="final-table">
          {standings.map((row, index) => (
            <div
              key={row.teamId}
              className={row.teamId === "KOR" ? "is-korea" : ""}
            >
              <span>{index + 1}</span>
              <strong>{TEAMS[row.teamId].name}</strong>
              <small>
                {row.won}승 {row.drawn}무 {row.lost}패
              </small>
              <b>{row.points}점</b>
            </div>
          ))}
        </div>

        <div className="final-actions">
          <button className="button button-primary" onClick={onRestart}>
            새 캠페인 시작
          </button>
          <button className="button button-ghost light" onClick={onTitle}>
            타이틀로
          </button>
        </div>
      </section>
    </main>
  );
}
