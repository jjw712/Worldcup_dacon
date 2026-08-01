import type { MatchMetrics } from "../types";

const possession = (metrics: MatchMetrics): [number, number] => {
  const homeSeconds = metrics.homePossessionSeconds ?? 0;
  const awaySeconds = metrics.awayPossessionSeconds ?? 0;
  const totalSeconds = homeSeconds + awaySeconds;
  if (totalSeconds > 0) {
    const home = Math.round((homeSeconds / totalSeconds) * 100);
    return [home, 100 - home];
  }
  const totalPasses = metrics.homePassAttempts + metrics.awayPassAttempts;
  const home = totalPasses
    ? Math.round((metrics.homePassAttempts / totalPasses) * 100)
    : 50;
  return [home, 100 - home];
};

export function MatchStatsTable({
  metrics,
  homeLabel = "KOR",
  awayLabel,
  compact = false,
}: {
  metrics: MatchMetrics;
  homeLabel?: string;
  awayLabel: string;
  compact?: boolean;
}) {
  const [homePossession, awayPossession] = possession(metrics);
  const rows = [
    ["점유율", `${homePossession}%`, `${awayPossession}%`],
    ["슈팅", metrics.homeShots, metrics.awayShots],
    [
      "유효 슈팅",
      metrics.homeShotsOnTarget ?? 0,
      metrics.awayShotsOnTarget ?? 0,
    ],
    ["경고", metrics.homeCards ?? 0, metrics.awayCards ?? 0],
    ["파울", metrics.homeFouls ?? 0, metrics.awayFouls ?? 0],
    ["코너킥", metrics.homeCorners ?? 0, metrics.awayCorners ?? 0],
  ] as const;

  return (
    <div className={`match-stats-table ${compact ? "is-compact" : ""}`}>
      <div className="match-stats-head">
        <strong>{homeLabel}</strong>
        <span>경기 통계</span>
        <strong>{awayLabel}</strong>
      </div>
      {rows.map(([label, home, away]) => (
        <div className="match-stat-row" key={label}>
          <b>{home}</b>
          <span>{label}</span>
          <b>{away}</b>
        </div>
      ))}
    </div>
  );
}
