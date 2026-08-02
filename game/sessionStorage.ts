import type {
  CampaignState,
  CommandKind,
  MatchResult,
  MatchState,
} from "./types";

export type AppScreen =
  | "landing"
  | "campaign"
  | "prematch"
  | "match"
  | "fulltime"
  | "report"
  | "final";

export type HydrationPhase = Extract<
  MatchState["phase"],
  "HYDRATION_FIRST" | "HYDRATION_SECOND"
>;

export interface HydrationProgress {
  phase: HydrationPhase;
  countdownStartsAtMs: number;
  spentCommandSeconds: number;
  deliveredKinds: CommandKind[];
}

export interface SavedSession {
  version: 1;
  screen: AppScreen;
  campaign: CampaignState;
  campaignStarted: boolean;
  match?: MatchState;
  lastResult?: MatchResult;
  memo: string;
  playbackSpeed: 1 | 2 | 4;
  acknowledgedBreakPhase?: MatchState["phase"];
  hydrationProgress?: HydrationProgress;
}

const APP_SCREENS = new Set<AppScreen>([
  "landing",
  "campaign",
  "prematch",
  "match",
  "fulltime",
  "report",
  "final",
]);

const MATCH_SCREENS = new Set<AppScreen>(["prematch", "match", "fulltime"]);
const HYDRATION_PHASES = new Set<HydrationPhase>([
  "HYDRATION_FIRST",
  "HYDRATION_SECOND",
]);
const COMMAND_KINDS = new Set<CommandKind>([
  "PREPARED_PLAN",
  "PRESS_HIGHER",
  "LOWER_LINE",
  "ATTACK_WIDE",
  "COMPACT_POSSESSION",
  "LONG_BALL",
  "SHORT_PASSING",
  "WINGER_TRACK",
  "CENTRAL_RUN",
  "CONSERVE_ENERGY",
  "CAPTAIN_RALLY",
  "HALFTIME_RECOVERY",
]);

const parseHydrationProgress = (
  value: unknown,
  match?: MatchState,
): HydrationProgress | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const progress = value as Partial<HydrationProgress>;
  if (
    !progress.phase ||
    !HYDRATION_PHASES.has(progress.phase) ||
    progress.phase !== match?.phase ||
    typeof progress.countdownStartsAtMs !== "number" ||
    !Number.isFinite(progress.countdownStartsAtMs) ||
    typeof progress.spentCommandSeconds !== "number" ||
    !Number.isFinite(progress.spentCommandSeconds) ||
    progress.spentCommandSeconds < 0 ||
    !Array.isArray(progress.deliveredKinds)
  ) {
    return undefined;
  }

  return {
    phase: progress.phase,
    countdownStartsAtMs: progress.countdownStartsAtMs,
    spentCommandSeconds: progress.spentCommandSeconds,
    deliveredKinds: progress.deliveredKinds.filter(
      (kind): kind is CommandKind =>
        typeof kind === "string" && COMMAND_KINDS.has(kind as CommandKind),
    ),
  };
};

export const latestGoalEventId = (match?: MatchState): string | undefined =>
  match?.events.find((event) => event.type === "GOAL")?.id;

export const parseSavedSession = (raw: string | null): SavedSession | undefined => {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedSession>;
    if (
      parsed.version !== 1 ||
      !parsed.screen ||
      !APP_SCREENS.has(parsed.screen) ||
      !parsed.campaign ||
      !Array.isArray(parsed.campaign.results) ||
      !parsed.campaign.standings ||
      (MATCH_SCREENS.has(parsed.screen) && !parsed.match) ||
      (parsed.screen === "report" && !parsed.lastResult)
    ) {
      return undefined;
    }

    return {
      version: 1,
      screen: parsed.screen,
      campaign: parsed.campaign,
      campaignStarted:
        typeof parsed.campaignStarted === "boolean"
          ? parsed.campaignStarted
          : parsed.screen !== "landing" || parsed.campaign.currentRound > 0,
      match: parsed.match,
      lastResult: parsed.lastResult,
      memo: typeof parsed.memo === "string" ? parsed.memo : "",
      playbackSpeed:
        parsed.playbackSpeed === 2 || parsed.playbackSpeed === 4
          ? parsed.playbackSpeed
          : 1,
      acknowledgedBreakPhase: parsed.acknowledgedBreakPhase,
      hydrationProgress: parseHydrationProgress(
        parsed.hydrationProgress,
        parsed.match,
      ),
    };
  } catch {
    return undefined;
  }
};
