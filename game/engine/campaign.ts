import { MATCH_DEFINITIONS, TEAMS } from "../data";
import type {
  CampaignState,
  CarryPlayerState,
  MatchPlayer,
  MatchResult,
  StandingRow,
  TeamId,
} from "../types";

const createStanding = (teamId: TeamId): StandingRow => ({
  teamId,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  points: 0,
});

const createCarryState = (): Record<string, CarryPlayerState> =>
  Object.fromEntries(
    TEAMS.KOR.roster.map((player) => [
      player.id,
      {
        stamina: 100,
        condition: 92,
        yellowCards: 0,
        suspendedMatches: 0,
        injuryMatchesRemaining: 0,
        managerTrust: 70 + (player.shirtNumber % 12),
      },
    ]),
  );

export function createNewCampaign(scoutingSeed = 20260731): CampaignState {
  return {
    currentRound: 0,
    scoutingSeed,
    standings: {
      KOR: createStanding("KOR"),
      CZE: createStanding("CZE"),
      MEX: createStanding("MEX"),
      RSA: createStanding("RSA"),
    },
    playerCarry: createCarryState(),
    morale: 66,
    managerTrust: 72,
    results: [],
    completed: false,
  };
}

function applyScore(
  standings: Record<TeamId, StandingRow>,
  homeId: TeamId,
  awayId: TeamId,
  homeGoals: number,
  awayGoals: number,
): Record<TeamId, StandingRow> {
  const next = {
    ...standings,
    [homeId]: { ...standings[homeId] },
    [awayId]: { ...standings[awayId] },
  };
  const home = next[homeId];
  const away = next[awayId];

  home.played += 1;
  away.played += 1;
  home.goalsFor += homeGoals;
  home.goalsAgainst += awayGoals;
  away.goalsFor += awayGoals;
  away.goalsAgainst += homeGoals;

  if (homeGoals > awayGoals) {
    home.won += 1;
    away.lost += 1;
    home.points += 3;
  } else if (homeGoals < awayGoals) {
    away.won += 1;
    home.lost += 1;
    away.points += 3;
  } else {
    home.drawn += 1;
    away.drawn += 1;
    home.points += 1;
    away.points += 1;
  }

  return next;
}

function carryPlayers(
  players: MatchPlayer[],
  previous: Record<string, CarryPlayerState>,
): Record<string, CarryPlayerState> {
  const next = Object.fromEntries(
    Object.entries(previous).map(([playerId, carry]) => [
      playerId,
      {
        ...carry,
        suspendedMatches: Math.max(0, carry.suspendedMatches - 1),
        injuryMatchesRemaining: Math.max(0, carry.injuryMatchesRemaining - 1),
      },
    ]),
  );

  for (const player of players.filter((candidate) => candidate.teamId === "KOR")) {
    const prior = previous[player.id];
    const accumulatedYellows =
      (prior?.yellowCards ?? 0) + (player.card === "YELLOW" ? 1 : 0);
    const yellowSuspension = accumulatedYellows >= 2;
    next[player.id] = {
      stamina: Math.min(100, Math.round(player.currentStamina + 30)),
      condition: Math.max(
        58,
        Math.round(player.condition - (player.injured ? 18 : 2) + 6),
      ),
      yellowCards: yellowSuspension ? 0 : accumulatedYellows,
      suspendedMatches:
        player.card === "RED" || yellowSuspension
          ? 1
          : Math.max(0, (prior?.suspendedMatches ?? 0) - 1),
      injuryMatchesRemaining: player.injured
        ? 1
        : Math.max(0, (prior?.injuryMatchesRemaining ?? 0) - 1),
      managerTrust: Math.min(
        100,
        Math.round(player.managerTrust + (player.onField ? 2 : -1)),
      ),
    };
  }

  return next;
}

export function applyMatchResult(
  campaign: CampaignState,
  result: MatchResult,
): CampaignState {
  const definition = MATCH_DEFINITIONS[result.round - 1];
  let standings = applyScore(
    campaign.standings,
    "KOR",
    result.opponentId,
    result.homeGoals,
    result.awayGoals,
  );
  standings = applyScore(
    standings,
    definition.secondaryFixture.home,
    definition.secondaryFixture.away,
    definition.secondaryFixture.homeGoals,
    definition.secondaryFixture.awayGoals,
  );

  const won = result.homeGoals > result.awayGoals;
  const lost = result.homeGoals < result.awayGoals;
  const nextRound = campaign.currentRound + 1;

  return {
    ...campaign,
    currentRound: nextRound,
    standings,
    playerCarry: {
      ...campaign.playerCarry,
      ...carryPlayers(result.playerStates, campaign.playerCarry),
    },
    morale: Math.min(
      100,
      Math.max(35, campaign.morale + (won ? 8 : lost ? -6 : 2)),
    ),
    managerTrust: Math.min(
      100,
      Math.max(
        35,
        campaign.managerTrust +
          (won ? 6 : lost ? -4 : 1) +
          Math.min(3, result.commands.length),
      ),
    ),
    results: [...campaign.results, result],
    completed: nextRound >= MATCH_DEFINITIONS.length,
  };
}

export function sortedStandings(campaign: CampaignState): StandingRow[] {
  return Object.values(campaign.standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aDifference = a.goalsFor - a.goalsAgainst;
    const bDifference = b.goalsFor - b.goalsAgainst;
    if (bDifference !== aDifference) return bDifference - aDifference;
    return b.goalsFor - a.goalsFor;
  });
}

export function campaignVerdict(campaign: CampaignState): string {
  const rank =
    sortedStandings(campaign).findIndex((row) => row.teamId === "KOR") + 1;
  if (rank === 1) return "조 1위 · 완벽한 우선순위";
  if (rank === 2) return "조 2위 · 다음 라운드 진출";
  return "조별리그 탈락 · 전달하지 못한 시간이 남았습니다";
}
