"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MATCH_DEFINITIONS } from "./data";
import {
  CampaignHub,
  LandingScreen,
  PreMatchScreen,
} from "./components/SetupScreens";
import {
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
  advanceMatch,
  applyHalfTimeRecovery,
  continueMatch,
  createMatch,
  createMatchResult,
  moveHomePlayer,
  startMatch,
} from "./engine/matchEngine";
import type {
  CampaignState,
  CommandKind,
  MatchResult,
  MatchState,
} from "./types";

type AppScreen =
  | "landing"
  | "campaign"
  | "prematch"
  | "match"
  | "report"
  | "final";

const STORAGE_KEY = "jammulma-campaign-v1";
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
  const [storageReady, setStorageReady] = useState(false);
  const [match, setMatch] = useState<MatchState>();
  const [lastResult, setLastResult] = useState<MatchResult>();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>();
  const [memo, setMemo] = useState("");
  const handledFinishedMatch = useRef<string>();

  useEffect(() => {
    let parsedCampaign: CampaignState | undefined;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CampaignState;
        if (parsed.results && parsed.standings) {
          parsedCampaign = parsed;
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    const timer = window.setTimeout(() => {
      if (parsedCampaign) {
        setCampaign(parsedCampaign);
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(campaign));
  }, [campaign, storageReady]);

  const matchPhase = match?.phase;
  const hasSavedCampaign = campaign.results.length > 0;
  useEffect(() => {
    if (
      screen !== "match" ||
      !matchPhase ||
      !OBSERVATION_PHASES.has(matchPhase)
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setMatch((current) =>
        current ? advanceMatch(current, 0.5) : current,
      );
    }, 500);
    return () => window.clearInterval(timer);
  }, [matchPhase, screen]);

  useEffect(() => {
    if (
      screen !== "match" ||
      !match ||
      match.phase !== "FINISHED" ||
      handledFinishedMatch.current === match.id
    ) {
      return;
    }
    handledFinishedMatch.current = match.id;
    const result = createMatchResult(match);
    const updatedCampaign = applyMatchResult(campaign, result);
    setCampaign(updatedCampaign);
    setLastResult(result);
    setScreen("report");
  }, [campaign, match, screen]);

  const beginNewCampaign = () => {
    const fresh = createNewCampaign();
    setCampaign(fresh);
    setMatch(undefined);
    setLastResult(undefined);
    setMemo("");
    handledFinishedMatch.current = undefined;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
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
    setSelectedPlayerId(
      newMatch.players.find((player) => player.side === "home")?.id,
    );
    handledFinishedMatch.current = undefined;
    setScreen("prematch");
  };

  const beginMatch = () => {
    setMatch((current) => (current ? startMatch(current) : current));
    setScreen("match");
  };

  const applyTacticalCommand = useCallback(
    (
      kind: CommandKind,
      targetPlayerId?: string,
      cost = 0,
      randomState?: number,
    ) => {
      setMatch((current) => {
        if (!current) return current;
        const updated = applyCommand(current, kind, targetPlayerId, cost);
        return randomState === undefined
          ? updated
          : { ...updated, randomState };
      });
    },
    [],
  );

  const resumeMatch = useCallback(() => {
    setMatch((current) => (current ? continueMatch(current) : current));
  }, []);

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
        onStart={beginMatch}
        onBack={() => setScreen("campaign")}
      />
    );
  }

  if (screen === "match" && match) {
    if (
      match.phase === "HYDRATION_FIRST" ||
      match.phase === "HYDRATION_SECOND"
    ) {
      return (
        <HydrationScreen
          key={match.phase}
          match={match}
          memo={memo}
          onApplyCommand={(kind, playerId, cost, randomState) =>
            applyTacticalCommand(kind, playerId, cost, randomState)
          }
          onComplete={resumeMatch}
        />
      );
    }

    if (match.phase === "HALF_TIME") {
      return (
        <HalfTimeScreen
          match={match}
          onApplyCommand={applyTacticalCommand}
          onRecovery={() =>
            setMatch((current) =>
              current ? applyHalfTimeRecovery(current) : current,
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
        onSelectPlayer={setSelectedPlayerId}
        onMemoChange={setMemo}
      />
    );
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
