import rawDatabase from "./data/wc26_group_a_game_data_v2.json";
import rawLocalization from "./data/wc26_group_a_player_localization.json";
import type {
  DetailedPosition,
  PlayerAdvancedAbilities,
  PlayerAttributes,
  PlayerCoreAbilities,
  Position,
  PreferredFoot,
  RosterPlayer,
  TeamId,
} from "./types";

interface RawAdvancedAbilities {
  [key: string]: number | null | undefined;
}

interface RawPlayer {
  id: string;
  country_code: TeamId;
  squad_no: number;
  name: string;
  name_ko: string | null;
  official_position: Position;
  primary_position: DetailedPosition;
  secondary_positions: DetailedPosition[];
  date_of_birth: string;
  age: number;
  club: string;
  club_country: string;
  height_cm: number;
  weight_kg?: number | null;
  caps_fifa_pdf_2026_07_19: number;
  goals_fifa_pdf_2026_07_19: number;
  preferred_foot: "R" | "L" | "Both";
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  confidence_score: number;
  confidence_grade: string;
  is_expected_starter: boolean;
  squad_role: string;
  strengths: string;
  weakness: string;
  traits: string[];
  rating_basis: string;
  ea_fc26_ovr_is_estimated: boolean;
  advanced: RawAdvancedAbilities;
}

interface RawTeam {
  country_code: TeamId;
  formation: string;
  expected_starting_xi: Array<{
    slot: string;
    player_id: string;
  }>;
}

interface RawDatabase {
  metadata: {
    disclaimer: string;
    rating_snapshot: string;
    schema_version: string;
  };
  teams: RawTeam[];
  players: RawPlayer[];
}

interface PlayerLocalization {
  name_ko: string;
  original_name: string;
  weight_kg: number;
  weight_source: string;
  weight_url: string;
  weight_note: string;
}

const database = rawDatabase as unknown as RawDatabase;
const localization = rawLocalization as unknown as {
  players: Record<string, PlayerLocalization>;
};

const ability = (value: number | null | undefined, fallback = 65): number =>
  Math.max(0, Math.min(100, Math.round(value ?? fallback)));

const optionalAbility = (
  value: number | null | undefined,
): number | undefined =>
  typeof value === "number" && Number.isFinite(value)
    ? ability(value)
    : undefined;

const average = (...values: Array<number | null | undefined>): number => {
  const available = values.filter(
    (value): value is number => typeof value === "number",
  );
  return ability(
    available.reduce((sum, value) => sum + value, 0) / available.length,
  );
};

const preferredFoot = (foot: RawPlayer["preferred_foot"]): PreferredFoot => {
  if (foot === "L") return "LEFT";
  if (foot === "R") return "RIGHT";
  if (foot === "Both") return "BOTH";
  return "UNKNOWN";
};

const advancedAbilities = (
  advanced: RawAdvancedAbilities,
): PlayerAdvancedAbilities => ({
  ballControl: optionalAbility(advanced.ball_control),
  firstTouch: optionalAbility(advanced.first_touch),
  finishing: optionalAbility(advanced.finishing),
  crossing: optionalAbility(advanced.crossing),
  longShots: optionalAbility(advanced.long_shots),
  setPieces: optionalAbility(advanced.set_pieces),
  acceleration: optionalAbility(advanced.acceleration),
  stamina: optionalAbility(advanced.stamina),
  strength: optionalAbility(advanced.strength),
  aerial: optionalAbility(advanced.aerial),
  positioning: optionalAbility(advanced.positioning),
  decisions: optionalAbility(advanced.decisions),
  pressing: optionalAbility(advanced.pressing),
  defensiveAwareness: optionalAbility(advanced.defensive_awareness),
  offBall: optionalAbility(advanced.off_ball),
  composure: optionalAbility(advanced.composure),
  aggression: optionalAbility(advanced.aggression),
  leadership: optionalAbility(advanced.leadership),
  consistency: optionalAbility(advanced.consistency),
  recovery: optionalAbility(advanced.recovery),
  tacticalAdaptability: optionalAbility(advanced.tactical_adaptability),
  injuryRisk: optionalAbility(advanced.injury_risk),
  gkReflexes: optionalAbility(advanced.gk_reflexes),
  gkHandling: optionalAbility(advanced.gk_handling),
  gkDistribution: optionalAbility(advanced.gk_distribution),
  gkPositioning: optionalAbility(advanced.gk_positioning),
  gkAerialCommand: optionalAbility(advanced.gk_aerial_command),
  gkOneOnOnes: optionalAbility(advanced.gk_one_on_ones),
});

const mapPlayer = (player: RawPlayer): RosterPlayer => {
  const localized = localization.players[player.id];
  const coreAbilities: PlayerCoreAbilities = {
    overall: ability(player.overall),
    pace: ability(player.pace),
    shooting: ability(player.shooting),
    passing: ability(player.passing),
    dribbling: ability(player.dribbling),
    defending: ability(player.defending),
    physical: ability(player.physical),
  };
  const advanced = advancedAbilities(player.advanced);
  const gameAttributes: PlayerAttributes = {
    passing: coreAbilities.passing,
    shooting: coreAbilities.shooting,
    defending: coreAbilities.defending,
    pace: coreAbilities.pace,
    stamina: ability(advanced.stamina, coreAbilities.physical),
    tacticalUnderstanding: average(
      advanced.decisions,
      advanced.positioning,
      advanced.tacticalAdaptability,
    ),
    roleFamiliarity: average(
      advanced.positioning,
      advanced.consistency,
      advanced.tacticalAdaptability,
    ),
  };

  return {
    id: player.id,
    teamId: player.country_code,
    name: localized?.name_ko ?? player.name_ko ?? player.name,
    originalName: localized?.original_name ?? player.name,
    shirtNumber: player.squad_no,
    position: player.official_position,
    detailedPosition: player.primary_position,
    secondaryPositions: player.secondary_positions,
    club: player.club,
    clubCountry: player.club_country,
    dateOfBirth: player.date_of_birth,
    birthYear: Number(player.date_of_birth.slice(0, 4)),
    age: player.age,
    heightCm: player.height_cm,
    weightKg: localized?.weight_kg ??
      (typeof player.weight_kg === "number" ? player.weight_kg : undefined),
    weightSource: localized?.weight_source,
    weightSourceUrl: localized?.weight_url,
    weightNote: localized?.weight_note,
    caps: player.caps_fifa_pdf_2026_07_19,
    goals: player.goals_fifa_pdf_2026_07_19,
    preferredFoot: preferredFoot(player.preferred_foot),
    coreAbilities,
    advancedAbilities: advanced,
    gameAttributes,
    confidenceScore: player.confidence_score,
    confidenceGrade: player.confidence_grade,
    isExpectedStarter: player.is_expected_starter,
    squadRole: player.squad_role,
    strengths: player.strengths,
    weakness: player.weakness,
    traits: player.traits,
    ratingBasis: player.rating_basis,
    ratingEstimated: player.ea_fc26_ovr_is_estimated,
  };
};

export const GROUP_A_ROSTERS_2026 = Object.fromEntries(
  (["KOR", "CZE", "MEX", "RSA"] as TeamId[]).map((teamId) => [
    teamId,
    database.players
      .filter((player) => player.country_code === teamId)
      .sort((a, b) => a.squad_no - b.squad_no)
      .map(mapPlayer),
  ]),
) as Record<TeamId, RosterPlayer[]>;

export const GROUP_A_EXPECTED_XI_2026 = Object.fromEntries(
  database.teams.map((team) => [team.country_code, team.expected_starting_xi]),
) as Record<TeamId, RawTeam["expected_starting_xi"]>;

export const GROUP_A_FORMATIONS_2026 = Object.fromEntries(
  database.teams.map((team) => [team.country_code, team.formation]),
) as Record<TeamId, string>;

export const PLAYER_DATABASE_METADATA = database.metadata;
