export type TeamId = "KOR" | "CZE" | "MEX" | "RSA";
export type Side = "home" | "away";
export type Position = "GK" | "DF" | "MF" | "FW";
export type DetailedPosition =
  | "GK"
  | "RB"
  | "CB"
  | "LB"
  | "DM"
  | "CM"
  | "AM"
  | "RW"
  | "LW"
  | "ST";
export type PreferredFoot = "LEFT" | "RIGHT" | "BOTH" | "UNKNOWN";
export type AttackSide = "left" | "center" | "right";

export type MatchPhase =
  | "PRE_MATCH"
  | "OBSERVE_0_22"
  | "HYDRATION_FIRST"
  | "OBSERVE_22_45"
  | "HALF_TIME"
  | "OBSERVE_45_67"
  | "HYDRATION_SECOND"
  | "OBSERVE_67_90"
  | "FINISHED";

export type CommandKind =
  | "PREPARED_PLAN"
  | "PRESS_HIGHER"
  | "LOWER_LINE"
  | "ATTACK_WIDE"
  | "WINGER_TRACK"
  | "CENTRAL_RUN"
  | "CONSERVE_ENERGY"
  | "CAPTAIN_RALLY";

export interface PlayerAttributes {
  passing: number;
  shooting: number;
  defending: number;
  pace: number;
  stamina: number;
  tacticalUnderstanding: number;
  roleFamiliarity: number;
}

export interface RosterPlayer {
  id: string;
  teamId: TeamId;
  name: string;
  shirtNumber: number;
  position: Position;
  detailedPosition: DetailedPosition;
  club: string;
  birthYear: number;
  preferredFoot: PreferredFoot;
}

export interface CarryPlayerState {
  stamina: number;
  condition: number;
  yellowCards: number;
  suspendedMatches: number;
  injuryMatchesRemaining: number;
  managerTrust: number;
}

export interface MatchPlayer extends RosterPlayer {
  /** Match UI compatibility alias. Canonical roster field is shirtNumber. */
  number: number;
  attributes: PlayerAttributes;
  side: Side;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  targetX: number;
  targetY: number;
  currentStamina: number;
  condition: number;
  managerTrust: number;
  card: "NONE" | "YELLOW" | "RED";
  injuryRisk: number;
  injured: boolean;
  onField: boolean;
}

export interface TacticState {
  formation: "4-3-3";
  pressing: number;
  defensiveLine: number;
  tempo: number;
  width: number;
  attackSide: AttackSide;
  preparedPlan: string;
  preparedPlanActive: boolean;
}

export interface TeamDefinition {
  id: TeamId;
  name: string;
  shortName: string;
  color: string;
  accent: string;
  styleName: string;
  styleDescription: string;
  coachHint: string;
  defaultTactic: TacticState;
  roster: RosterPlayer[];
}

export interface MatchDefinition {
  id: string;
  round: 1 | 2 | 3;
  opponentId: Exclude<TeamId, "KOR">;
  title: string;
  challenge: string;
  briefing: string[];
  seed: number;
  weather: "맑음" | "고온" | "비";
  referee: "관대함" | "균형" | "엄격함";
  secondaryFixture: {
    home: Exclude<TeamId, "KOR">;
    away: Exclude<TeamId, "KOR">;
    homeGoals: number;
    awayGoals: number;
  };
}

export interface BallState {
  x: number;
  y: number;
  ownerSide: Side;
  ownerPlayerId?: string;
  zone: number;
}

export type MatchEventType =
  | "KICK_OFF"
  | "PASS"
  | "TURNOVER"
  | "SHOT"
  | "GOAL"
  | "FOUL"
  | "CARD"
  | "INJURY"
  | "TACTIC";

export interface MatchEvent {
  id: string;
  minute: number;
  type: MatchEventType;
  side: Side;
  text: string;
  emphasis?: "normal" | "important" | "danger";
}

export interface CoachFeedback {
  id: string;
  coach: "전술" | "공격" | "수비" | "피지컬" | "의료";
  severity: "정보" | "주의" | "긴급";
  text: string;
  minute: number;
}

export interface MatchMetrics {
  homePassAttempts: number;
  homePassSuccess: number;
  awayPassAttempts: number;
  awayPassSuccess: number;
  homeShots: number;
  awayShots: number;
  homeTurnovers: number;
  awayTurnovers: number;
  homeRightThreat: number;
  awayRightThreat: number;
  tacticalWins: number;
}

export interface AppliedCommand {
  id: string;
  kind: CommandKind;
  label: string;
  targetPlayerId?: string;
  cost: number;
  minute: number;
  effect: string;
  tradeoff: string;
}

export interface MatchState {
  id: string;
  definition: MatchDefinition;
  homeTeam: TeamDefinition;
  awayTeam: TeamDefinition;
  phase: MatchPhase;
  phaseElapsed: number;
  gameMinute: number;
  score: { home: number; away: number };
  players: MatchPlayer[];
  ball: BallState;
  possession: Side;
  homeTactic: TacticState;
  awayTactic: TacticState;
  events: MatchEvent[];
  feedback: CoachFeedback[];
  metrics: MatchMetrics;
  commands: AppliedCommand[];
  randomState: number;
  eventCooldown: number;
  feedbackCooldown: number;
  halfTimeAp: number;
}

export interface StandingRow {
  teamId: TeamId;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface MatchResult {
  matchId: string;
  round: number;
  opponentId: TeamId;
  homeGoals: number;
  awayGoals: number;
  pointsEarned: number;
  commands: AppliedCommand[];
  metrics: MatchMetrics;
  playerStates: MatchPlayer[];
}

export interface CampaignState {
  currentRound: number;
  standings: Record<TeamId, StandingRow>;
  playerCarry: Record<string, CarryPlayerState>;
  morale: number;
  managerTrust: number;
  results: MatchResult[];
  completed: boolean;
}

export interface CommandDefinition {
  kind: CommandKind;
  label: string;
  category: string;
  description: string;
  minCost: number;
  maxCost: number;
  needsPlayer: boolean;
  effect: string;
  tradeoff: string;
}
