"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MATCH_DEFINITIONS } from "./data";
import {
  CampaignHub,
  LandingScreen,
  PreMatchScreen,
} from "./components/SetupScreens";
import {
  BreakTransitionScreen,
  FullTimeScreen,
  HalfTimeScreen,
  HydrationScreen,
  ObservationScreen,
} from "./components/MatchScreens";
import {
  FinalCampaignScreen,
  ReportScreen,
} from "./components/ReportScreens";
import { applyMatchResult, createNewCampaign } from "./engine/campaign";
import { applyCommand } from "./engine/commands";
import {
  advanceMatchTicks,
  applyHalfTimeRecovery,
  cancelPendingSubstitution,
  configureTacticLoadout,
  continueMatch,
  createMatch,
  createMatchResult,
  moveHomePlayer,
  queueSubstitution,
  skipObservationSegment,
  startMatch,
  substitutePausedPlayer,
  substitutePreMatchPlayer,
  swapHomePlayerPositions,
  switchToSubTactic,
} from "./engine/matchEngine";
import {
  latestGoalEventId,
  parseSavedSession,
  type AppScreen,
  type HydrationProgress,
  type SavedSession,
} from "./sessionStorage";
import type {
  AttackSide,
  CampaignState,
  CommandKind,
  MatchResult,
  MatchState,
} from "./types";

const STORAGE_KEY = "jammulma-campaign-v4";
const SESSION_STORAGE_KEY = "jammulma-session-v1";
const OBSERVATION_PHASES = new Set([
  "OBSERVE_0_22",
  "OBSERVE_22_45",
  "OBSERVE_45_67",
  "OBSERVE_67_90",
]);

export function GameApp() {
  const [screen, setScreen] = useState<AppScreen>("landing");
  const [campaign, setCampaign] = useState<CampaignState>(() =>
    createNewCampaign(),
  );
  const [campaignStarted, setCampaignStarted] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [match, setMatch] = useState<MatchState>();
  const [lastResult, setLastResult] = useState<MatchResult>();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>();
  const [memo, setMemo] = useState("");
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [goalEvent, setGoalEvent] = useState<MatchState["events"][number]>();
  const [acknowledgedBreakPhase, setAcknowledgedBreakPhase] =
    useState<MatchState["phase"] | undefined>(undefined);
  const [hydrationProgress, setHydrationProgress] =
    useState<HydrationProgress>();
  const handledFinishedMatch = useRef<string | undefined>(undefined);
  const handledGoalEvent = useRef<string | undefined>(undefined);
  const goalPauseActive = useRef(false);
  const goalPauseTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let parsedCampaign: CampaignState | undefined;
    let parsedSession: SavedSession | undefined;
    try {
      parsedSession = parseSavedSession(
        window.localStorage.getItem(SESSION_STORAGE_KEY),
      );
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CampaignState;
        if (parsed.results && parsed.standings) {
          parsedCampaign = parsed;
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    const timer = window.setTimeout(() => {
      if (parsedSession) {
        setScreen(parsedSession.screen);
        setCampaign(parsedSession.campaign);
        setCampaignStarted(parsedSession.campaignStarted);
        setMatch(parsedSession.match);
        setLastResult(parsedSession.lastResult);
        setMemo(parsedSession.memo);
        setPlaybackSpeed(parsedSession.playbackSpeed);
        setAcknowledgedBreakPhase(parsedSession.acknowledgedBreakPhase);
        setHydrationProgress(parsedSession.hydrationProgress);
        handledGoalEvent.current = latestGoalEventId(parsedSession.match);
        setIsPaused(
          parsedSession.screen === "match" &&
            Boolean(
              parsedSession.match &&
                OBSERVATION_PHASES.has(parsedSession.match.phase),
            ),
        );
      } else if (parsedCampaign) {
        setCampaign(parsedCampaign);
        setCampaignStarted(
          parsedCampaign.currentRound > 0 || parsedCampaign.results.length > 0,
        );
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(campaign));
    } catch {
      // The active in-memory game should remain usable if storage is unavailable.
    }
  }, [campaign, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    const timer = window.setTimeout(() => {
      const session: SavedSession = {
        version: 1,
        screen,
        campaign,
        campaignStarted,
        match,
        lastResult,
        memo,
        playbackSpeed,
        acknowledgedBreakPhase,
        hydrationProgress,
      };
      try {
        window.localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify(session),
        );
      } catch {
        // Ignore storage quota/privacy failures and keep the live session running.
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    acknowledgedBreakPhase,
    campaign,
    campaignStarted,
    hydrationProgress,
    lastResult,
    match,
    memo,
    playbackSpeed,
    screen,
    storageReady,
  ]);

  const matchPhase = match?.phase;
  const hasSavedCampaign = campaignStarted;
  useEffect(() => {
    if (
      screen !== "match" ||
      isPaused ||
      !matchPhase ||
      !OBSERVATION_PHASES.has(matchPhase)
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setMatch((current) =>
        current ? advanceMatchTicks(current, playbackSpeed) : current,
      );
    }, 500);
    return () => window.clearInterval(timer);
  }, [isPaused, matchPhase, playbackSpeed, screen]);

  useEffect(() => {
    if (screen !== "match" || !match || !OBSERVATION_PHASES.has(match.phase)) {
      return;
    }
    const latestGoal = match.events.find((event) => event.type === "GOAL");
    if (!latestGoal || handledGoalEvent.current === latestGoal.id) return;
    handledGoalEvent.current = latestGoal.id;
    goalPauseActive.current = true;
    setGoalEvent(latestGoal);
    setIsPaused(true);
    if (goalPauseTimer.current) window.clearTimeout(goalPauseTimer.current);
    goalPauseTimer.current = window.setTimeout(() => {
      goalPauseActive.current = false;
      setGoalEvent(undefined);
      setIsPaused(false);
    }, 500);
  }, [match, screen]);

  useEffect(
    () => () => {
      if (goalPauseTimer.current) window.clearTimeout(goalPauseTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (
      screen !== "match" ||
      !match ||
      match.phase !== "FINISHED" ||
      goalPauseActive.current ||
      goalEvent ||
      handledFinishedMatch.current === match.id
    ) {
      return;
    }
    handledFinishedMatch.current = match.id;
    const result = createMatchResult(match);
    const updatedCampaign = applyMatchResult(campaign, result);
    setCampaign(updatedCampaign);
    setLastResult(result);
    setScreen("fulltime");
  }, [campaign, goalEvent, match, screen]);

  const beginNewCampaign = () => {
    const fresh = createNewCampaign(Date.now() >>> 0);
    setCampaign(fresh);
    setCampaignStarted(true);
    setMatch(undefined);
    setLastResult(undefined);
    setMemo("");
    setIsPaused(false);
    setGoalEvent(undefined);
    setAcknowledgedBreakPhase(undefined);
    setHydrationProgress(undefined);
    handledFinishedMatch.current = undefined;
    handledGoalEvent.current = undefined;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // The campaign still starts even when browser storage is unavailable.
    }
    setScreen("campaign");
  };

  const continueCampaign = () => {
    setScreen(campaign.completed ? "final" : "campaign");
  };

  const prepareMatch = () => {
    const definition = MATCH_DEFINITIONS[campaign.currentRound];
    if (!definition) {
      setScreen("final");
      return;
    }
    const newMatch = createMatch(definition, campaign);
    setMatch(newMatch);
    setMemo("");
    setIsPaused(false);
    setGoalEvent(undefined);
    setAcknowledgedBreakPhase(undefined);
    setHydrationProgress(undefined);
    setSelectedPlayerId(undefined);
    handledFinishedMatch.current = undefined;
    handledGoalEvent.current = undefined;
    setScreen("prematch");
  };

  const beginMatch = () => {
    setMatch((current) => (current ? startMatch(current) : current));
    setIsPaused(false);
    setHydrationProgress(undefined);
    setScreen("match");
  };

  const applyTacticalCommand = useCallback(
    (
      kind: CommandKind,
      targetPlayerId?: string,
      cost = 0,
      randomState?: number,
      attackSide?: Exclude<AttackSide, "center">,
    ) => {
      setMatch((current) => {
        if (!current) return current;
        const updated = applyCommand(
          current,
          kind,
          targetPlayerId,
          cost,
          attackSide,
        );
        return randomState === undefined
          ? updated
          : { ...updated, randomState };
      });
    },
    [],
  );

  const resumeMatch = useCallback(() => {
    setMatch((current) =>
      current ? continueMatch(current, campaign.playerCarry) : current,
    );
    setIsPaused(false);
  }, [campaign.playerCarry]);

  const completeHydration = useCallback(() => {
    setHydrationProgress(undefined);
    resumeMatch();
  }, [resumeMatch]);

  const goAfterReport = () => {
    setScreen(campaign.completed ? "final" : "campaign");
  };

  if (screen === "landing") {
    return (
      <LandingScreen
        hasSavedCampaign={hasSavedCampaign}
        onNewCampaign={beginNewCampaign}
        onContinue={continueCampaign}
      />
    );
  }

  if (screen === "campaign") {
    return (
      <CampaignHub
        campaign={campaign}
        onPrepareMatch={prepareMatch}
        onBackToTitle={() => setScreen("landing")}
      />
    );
  }

  if (screen === "prematch" && match) {
    return (
      <PreMatchScreen
        match={match}
        selectedPlayerId={selectedPlayerId}
        onSelectPlayer={setSelectedPlayerId}
        onMovePlayer={(playerId, x, y) =>
          setMatch((current) =>
            current ? moveHomePlayer(current, playerId, x, y) : current,
          )
        }
        onSwapPlayers={(firstId, secondId, originX, originY) =>
          setMatch((current) =>
            current
              ? swapHomePlayerPositions(
                  current,
                  firstId,
                  secondId,
                  originX,
                  originY,
                )
              : current,
          )
        }
        onSubstitute={(outgoingPlayerId, incomingPlayerId) =>
          setMatch((current) =>
            current
              ? substitutePreMatchPlayer(
                  current,
                  outgoingPlayerId,
                  incomingPlayerId,
                  campaign.playerCarry[incomingPlayerId],
                )
              : current,
          )
        }
        onConfigureTactic={(slot, presetId) =>
          setMatch((current) =>
            current
              ? configureTacticLoadout(current, slot, presetId)
              : current,
          )
        }
        onStart={beginMatch}
        onBack={() => setScreen("campaign")}
      />
    );
  }

  if (screen === "match" && match) {
    if (
      (match.phase === "HYDRATION_FIRST" ||
        match.phase === "HALF_TIME" ||
        match.phase === "HYDRATION_SECOND") &&
      acknowledgedBreakPhase !== match.phase
    ) {
      return (
        <BreakTransitionScreen
          match={match}
          onContinue={() => setAcknowledgedBreakPhase(match.phase)}
        />
      );
    }
    if (
      match.phase === "HYDRATION_FIRST" ||
      match.phase === "HYDRATION_SECOND"
    ) {
      return (
        <HydrationScreen
          key={match.phase}
          match={match}
          memo={memo}
          progress={hydrationProgress}
          onProgressChange={setHydrationProgress}
          onApplyCommand={(kind, playerId, cost, randomState, attackSide) =>
            applyTacticalCommand(
              kind,
              playerId,
              cost,
              randomState,
              attackSide,
            )
          }
          onQueueSubstitution={(outgoingPlayerId, incomingPlayerId) =>
            setMatch((current) =>
              current
                ? queueSubstitution(current, outgoingPlayerId, incomingPlayerId)
                : current,
            )
          }
          onCancelSubstitution={(pendingId) =>
            setMatch((current) =>
              current ? cancelPendingSubstitution(current, pendingId) : current,
            )
          }
          onSwitchSubTactic={(slot) =>
            setMatch((current) =>
              current ? switchToSubTactic(current, slot) : current,
            )
          }
          onComplete={completeHydration}
        />
      );
    }

    if (match.phase === "HALF_TIME") {
      return (
        <HalfTimeScreen
          match={match}
          onApplyCommand={(kind, playerId, cost, attackSide) =>
            applyTacticalCommand(kind, playerId, cost, undefined, attackSide)
          }
          onRecovery={() =>
            setMatch((current) =>
              current ? applyHalfTimeRecovery(current) : current,
            )
          }
          onQueueSubstitution={(outgoingPlayerId, incomingPlayerId) =>
            setMatch((current) =>
              current
                ? queueSubstitution(current, outgoingPlayerId, incomingPlayerId)
                : current,
            )
          }
          onCancelSubstitution={(pendingId) =>
            setMatch((current) =>
              current ? cancelPendingSubstitution(current, pendingId) : current,
            )
          }
          onSwitchSubTactic={(slot) =>
            setMatch((current) =>
              current ? switchToSubTactic(current, slot) : current,
            )
          }
          onMovePlayer={(playerId, x, y) =>
            setMatch((current) =>
              current ? moveHomePlayer(current, playerId, x, y) : current,
            )
          }
          onSwapPlayers={(firstId, secondId, originX, originY) =>
            setMatch((current) =>
              current
                ? swapHomePlayerPositions(
                    current,
                    firstId,
                    secondId,
                    originX,
                    originY,
                  )
                : current,
            )
          }
          onContinue={resumeMatch}
        />
      );
    }

    return (
      <ObservationScreen
        match={match}
        selectedPlayerId={selectedPlayerId}
        memo={memo}
        playbackSpeed={playbackSpeed}
        isPaused={isPaused}
        goalEvent={goalEvent}
        onSelectPlayer={setSelectedPlayerId}
        onMemoChange={setMemo}
        onPlaybackSpeedChange={setPlaybackSpeed}
        onPauseChange={(paused) => {
          if (goalEvent) return;
          setIsPaused(paused);
          if (paused) setSelectedPlayerId(undefined);
        }}
        onSubstitute={(outgoingPlayerId, incomingPlayerId) =>
          setMatch((current) =>
            current
              ? substitutePausedPlayer(
                  current,
                  outgoingPlayerId,
                  incomingPlayerId,
                  campaign.playerCarry[incomingPlayerId],
                )
              : current,
          )
        }
        onQueueSubstitution={(outgoingPlayerId, incomingPlayerId, targetPhase) =>
          setMatch((current) =>
            current
              ? queueSubstitution(
                  current,
                  outgoingPlayerId,
                  incomingPlayerId,
                  targetPhase,
                )
              : current,
          )
        }
        onCancelSubstitution={(pendingId) =>
          setMatch((current) =>
            current ? cancelPendingSubstitution(current, pendingId) : current,
          )
        }
        onSwitchSubTactic={(slot) =>
          setMatch((current) =>
            current ? switchToSubTactic(current, slot) : current,
          )
        }
        onSkipToDecision={() =>
          setMatch((current) =>
            current ? skipObservationSegment(current) : current,
          )
        }
      />
    );
  }

  if (screen === "fulltime" && match) {
    return <FullTimeScreen match={match} onContinue={() => setScreen("report")} />;
  }

  if (screen === "report" && lastResult) {
    return (
      <ReportScreen
        campaign={campaign}
        result={lastResult}
        onContinue={goAfterReport}
        onTitle={() => setScreen("landing")}
      />
    );
  }

  return (
    <FinalCampaignScreen
      campaign={campaign}
      onRestart={beginNewCampaign}
      onTitle={() => setScreen("landing")}
    />
  );
}
