import type { CampaignState, MatchResult, MatchState } from "./types";

export type AppScreen =
  | "landing"
  | "campaign"
  | "prematch"
  | "match"
  | "fulltime"
  | "report"
  | "final";

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
    };
  } catch {
    return undefined;
  }
};
