export type TeamId = "KOR" | "CZE" | "MEX" | "RSA";
export type Side = "home" | "away";
export type Position = "GK" | "DF" | "MF" | "FW";
export type DetailedPosition =
  | "GK"
  | "RB"
  | "CB"
  | "LB"
  | "RWB"
  | "LWB"
  | "DM"
  | "CM"
  | "AM"
  | "RM"
  | "LM"
  | "RW"
  | "LW"
  | "SS"
  | "ST";
export type PreferredFoot = "LEFT" | "RIGHT" | "BOTH" | "UNKNOWN";
export type AttackSide = "left" | "center" | "right";
export type TacticPresetId =
  | "BALANCED_433"
  | "CONTROL_4231"
  | "COUNTER_442"
  | "PRESS_343"
  | "BLOCK_541"
  | "BUILD_352"
  | "SHADOW_3421"
  | "COMPACT_4141";

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
  | "CAPTAIN_RALLY"
  | "HALFTIME_RECOVERY";

export interface PlayerAttributes {
  passing: number;
  shooting: number;
  defending: number;
  pace: number;
  stamina: number;
  tacticalUnderstanding: number;
  roleFamiliarity: number;
}

export interface PlayerCoreAbilities {
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface PlayerAdvancedAbilities {
  ballControl?: number;
  firstTouch?: number;
  finishing?: number;
  crossing?: number;
  longShots?: number;
  setPieces?: number;
  acceleration?: number;
  stamina?: number;
  strength?: number;
  aerial?: number;
  positioning?: number;
  decisions?: number;
  pressing?: number;
  defensiveAwareness?: number;
  offBall?: number;
  composure?: number;
  aggression?: number;
  leadership?: number;
  consistency?: number;
  recovery?: number;
  tacticalAdaptability?: number;
  injuryRisk?: number;
  gkReflexes?: number;
  gkHandling?: number;
  gkDistribution?: number;
  gkPositioning?: number;
  gkAerialCommand?: number;
  gkOneOnOnes?: number;
}

export interface RosterPlayer {
  id: string;
  teamId: TeamId;
  name: string;
  originalName: string;
  shirtNumber: number;
  position: Position;
  detailedPosition: DetailedPosition;
  secondaryPositions: DetailedPosition[];
  club: string;
  clubCountry: string;
  dateOfBirth: string;
  birthYear: number;
  age: number;
  heightCm: number;
  weightKg?: number;
  weightSource?: string;
  weightSourceUrl?: string;
  weightNote?: string;
  caps: number;
  goals: number;
  preferredFoot: PreferredFoot;
  coreAbilities: PlayerCoreAbilities;
  advancedAbilities: PlayerAdvancedAbilities;
  gameAttributes: PlayerAttributes;
  confidenceScore: number;
  confidenceGrade: string;
  isExpectedStarter: boolean;
  squadRole: string;
  strengths: string;
  weakness: string;
  traits: string[];
  ratingBasis: string;
  ratingEstimated: boolean;
  /** Match-day values used by lineup and comparison UIs for bench players. */
  currentStamina?: number;
  condition?: number;
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
  /** Portion of currentStamina granted by a recovery/energy instruction. */
  bonusStamina: number;
  condition: number;
  managerTrust: number;
  card: "NONE" | "YELLOW" | "RED";
  injuryRisk: number;
  injured: boolean;
  onField: boolean;
}

export interface TacticState {
  formation:
    | "4-3-3"
    | "4-2-3-1"
    | "4-4-2"
    | "3-4-3"
    | "5-4-1"
    | "3-5-2"
    | "3-4-2-1"
    | "4-1-4-1";
  presetId?: TacticPresetId;
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
  formationName: string;
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
  | "SUBSTITUTION"
  | "CORNER"
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
  homeShotsOnTarget?: number;
  awayShotsOnTarget?: number;
  homeFouls?: number;
  awayFouls?: number;
  homeCards?: number;
  awayCards?: number;
  homeCorners?: number;
  awayCorners?: number;
  homePossessionSeconds?: number;
  awayPossessionSeconds?: number;
}

export interface AppliedCommand {
  id: string;
  kind: CommandKind;
  label: string;
  targetPlayerId?: string;
  attackSide?: AttackSide;
  cost: number;
  minute: number;
  effect: string;
  tradeoff: string;
  baseline: {
    metrics: MatchMetrics;
    defensiveLine: number;
    pressing: number;
    width: number;
    averageHomeStamina: number;
    targetStamina?: number;
  };
}

export interface CommandEvaluation {
  commandId: string;
  successRate: number;
  status: "정착 중" | "적용 중" | "잘 작동함" | "효과 미미";
  headline: string;
  detail: string;
}

export interface PendingSubstitution {
  id: string;
  outgoingPlayerId: string;
  incomingPlayerId: string;
  requestedPhase: MatchPhase;
  requestedMinute: number;
  targetPhase?: Extract<
    MatchPhase,
    "HYDRATION_FIRST" | "HALF_TIME" | "HYDRATION_SECOND"
  >;
}

export interface TacticLoadout {
  main: TacticPresetId;
  sub1: TacticPresetId;
  sub2: TacticPresetId;
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
  substitutionsUsed: number;
  substitutedOutPlayerIds: string[];
  pendingSubstitutions: PendingSubstitution[];
  tacticLoadout: TacticLoadout;
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
  commandEvaluations: CommandEvaluation[];
  metrics: MatchMetrics;
  playerStates: MatchPlayer[];
}

export interface CampaignState {
  currentRound: number;
  /** Changes opponent scouting estimates between new campaign playthroughs. */
  scoutingSeed: number;
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
  targetPositions?: Position[];
  effect: string;
  tradeoff: string;
}
