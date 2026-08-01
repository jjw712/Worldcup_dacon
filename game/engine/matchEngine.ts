import { FORMATION_433, TEAMS } from "../data";
import { GROUP_A_EXPECTED_XI_2026 } from "../rosters2026";
import { DEFAULT_TACTIC_LOADOUT, tacticPresetById } from "../tactics";
import { canExchangePlayers } from "../playerRules";
import type {
  CampaignState,
  CarryPlayerState,
  CoachFeedback,
  MatchDefinition,
  MatchEvent,
  MatchMetrics,
  MatchPhase,
  MatchPlayer,
  MatchResult,
  MatchState,
  PendingSubstitution,
  RosterPlayer,
  Side,
  TacticState,
  TacticLoadout,
  TacticPresetId,
} from "../types";
import { clamp, nextRandom, randomBetween } from "./random";
import {
  COMMANDS,
  createCommandBaseline,
  evaluateCommandImpact,
} from "./commands";

const OBSERVATION_SECONDS = 60;

const isReplaceableHomePlayer = (player: MatchPlayer) =>
  player.side === "home" && (player.onField || player.injured);

const resolveHomeSubstitution = (
  state: MatchState,
  outgoingPlayerId: string,
  incomingPlayerId: string,
): { outgoing: MatchPlayer; incoming: RosterPlayer } | undefined => {
  const outgoing = state.players.find(
    (player) =>
      player.id === outgoingPlayerId && isReplaceableHomePlayer(player),
  );
  const incoming = state.homeTeam.roster.find(
    (player) => player.id === incomingPlayerId,
  );
  if (
    !outgoing ||
    !incoming ||
    !canExchangePlayers(outgoing, incoming) ||
    state.players.some((player) => player.id === incoming.id) ||
    (state.substitutedOutPlayerIds ?? []).includes(incoming.id)
  ) {
    return undefined;
  }
  return { outgoing, incoming };
};

const PHASE_RANGES: Partial<
  Record<MatchPhase, { start: number; end: number; next: MatchPhase }>
> = {
  OBSERVE_0_22: { start: 0, end: 22, next: "HYDRATION_FIRST" },
  OBSERVE_22_45: { start: 22, end: 45, next: "HALF_TIME" },
  OBSERVE_45_67: { start: 45, end: 67, next: "HYDRATION_SECOND" },
  OBSERVE_67_90: { start: 67, end: 90, next: "FINISHED" },
};

const emptyMetrics = (): MatchMetrics => ({
  homePassAttempts: 0,
  homePassSuccess: 0,
  awayPassAttempts: 0,
  awayPassSuccess: 0,
  homeShots: 0,
  awayShots: 0,
  homeTurnovers: 0,
  awayTurnovers: 0,
  homeRightThreat: 0,
  awayRightThreat: 0,
  homeLeftThreat: 0,
  awayLeftThreat: 0,
  tacticalWins: 0,
  homeShotsOnTarget: 0,
  awayShotsOnTarget: 0,
  homeFouls: 0,
  awayFouls: 0,
  homeCards: 0,
  awayCards: 0,
  homeCorners: 0,
  awayCorners: 0,
  homePossessionSeconds: 0,
  awayPossessionSeconds: 0,
});

const SLOT_COORDINATES: Record<string, { x: number; y: number }> = {
  GK: { x: 0.08, y: 0.5 },
  RB: { x: 0.23, y: 0.84 },
  RCB: { x: 0.19, y: 0.64 },
  CB: { x: 0.17, y: 0.5 },
  LCB: { x: 0.19, y: 0.36 },
  LB: { x: 0.23, y: 0.16 },
  RWB: { x: 0.31, y: 0.84 },
  LWB: { x: 0.31, y: 0.16 },
  DM: { x: 0.38, y: 0.5 },
  RDM: { x: 0.38, y: 0.64 },
  LDM: { x: 0.38, y: 0.36 },
  RCM: { x: 0.42, y: 0.64 },
  CM: { x: 0.4, y: 0.5 },
  LCM: { x: 0.42, y: 0.36 },
  RM: { x: 0.48, y: 0.78 },
  LM: { x: 0.48, y: 0.22 },
  RW: { x: 0.65, y: 0.82 },
  RAM: { x: 0.57, y: 0.66 },
  AM: { x: 0.57, y: 0.5 },
  LAM: { x: 0.57, y: 0.34 },
  LW: { x: 0.65, y: 0.18 },
  SS: { x: 0.62, y: 0.5 },
  ST: { x: 0.71, y: 0.5 },
};

const OPPONENT_FORMATION_VARIANTS = {
  CZE: ["3-4-2-1", "4-2-3-1"],
  MEX: ["4-3-3", "4-2-3-1"],
  RSA: ["4-2-3-1", "4-3-2-1"],
} as const;

const opponentFormationFor = (
  teamId: Exclude<keyof typeof GROUP_A_EXPECTED_XI_2026, "KOR">,
  seed: number,
): string => {
  const variants = OPPONENT_FORMATION_VARIANTS[teamId];
  const random = nextRandom(seed);
  return variants[Math.floor(random.value * variants.length)] ?? variants[0];
};

const coordinatesForFormation = (
  slotName: string | undefined,
  slotIndex: number,
  formationName?: string,
): { x: number; y: number } => {
  const base = SLOT_COORDINATES[slotName ?? ""] ?? FORMATION_433[slotIndex];
  if (!slotName || !formationName) return base;

  if (formationName === "4-3-2-1") {
    if (slotName === "RW" || slotName === "RAM") return { x: 0.58, y: 0.65 };
    if (slotName === "LW" || slotName === "LAM") return { x: 0.58, y: 0.35 };
    if (slotName === "AM") return { x: 0.46, y: 0.5 };
  }

  if (formationName === "4-2-3-1") {
    if (slotName === "RWB") return { x: 0.23, y: 0.84 };
    if (slotName === "LWB") return { x: 0.23, y: 0.16 };
    if (slotName === "RCM" || slotName === "RDM") return { x: 0.38, y: 0.63 };
    if (slotName === "DM" || slotName === "LDM") return { x: 0.38, y: 0.37 };
    if (slotName === "LCM" || slotName === "AM") return { x: 0.55, y: 0.5 };
    if (slotName === "RW") return { x: 0.58, y: 0.82 };
    if (slotName === "LW") return { x: 0.58, y: 0.18 };
  }

  return base;
};

const createMatchPlayer = (
  profile: RosterPlayer,
  side: Side,
  slotIndex: number,
  campaign?: CampaignState,
  slotName?: string,
  formationName?: string,
): MatchPlayer => {
  const slot = coordinatesForFormation(slotName, slotIndex, formationName);
  const homeX = slot.x;
  const x = side === "home" ? homeX : 1 - homeX;
  const carry =
    side === "home" ? campaign?.playerCarry[profile.id] : undefined;

  return {
    ...profile,
    number: profile.shirtNumber,
    attributes: profile.gameAttributes,
    side,
    x,
    y: slot.y,
    baseX: x,
    baseY: slot.y,
    targetX: x,
    targetY: slot.y,
    currentStamina: carry?.stamina ?? 100,
    bonusStamina: 0,
    condition: carry?.condition ?? 92,
    managerTrust: carry?.managerTrust ?? 72,
    card: "NONE",
    injuryRisk: carry?.injuryMatchesRemaining
      ? 0.2
      : (profile.advancedAbilities.injuryRisk ?? 20) / 500,
    injured: false,
    onField: true,
  };
};

const selectExpectedLineup = (
  teamId: keyof typeof GROUP_A_EXPECTED_XI_2026,
  roster: RosterPlayer[],
  campaign?: CampaignState,
  variationSeed?: number,
): Array<{ player: RosterPlayer; slot: string }> => {
  const lineup = GROUP_A_EXPECTED_XI_2026[teamId];
  const used = new Set<string>();

  const selectedLineup = lineup.map(({ player_id: playerId, slot }) => {
    const expected = roster.find((player) => player.id === playerId);
    const expectedUnavailable =
      teamId === "KOR" &&
      expected &&
      campaign?.playerCarry[expected.id] &&
      (campaign.playerCarry[expected.id].suspendedMatches > 0 ||
        campaign.playerCarry[expected.id].injuryMatchesRemaining > 0);
    const replacement = roster.find((player) => {
      const carry = campaign?.playerCarry[player.id];
      return (
        !used.has(player.id) &&
        player.position === expected?.position &&
        (!carry ||
          (carry.suspendedMatches <= 0 && carry.injuryMatchesRemaining <= 0))
      );
    });
    const selected =
      (!expectedUnavailable && expected && !used.has(expected.id)
        ? expected
        : replacement) ?? roster.find((player) => !used.has(player.id));

    if (!selected) {
      throw new Error(`${teamId}의 선발 명단을 구성할 수 없습니다.`);
    }
    used.add(selected.id);
    return { player: selected, slot };
  });

  if (teamId === "KOR" || variationSeed === undefined) {
    return selectedLineup;
  }

  let randomState = variationSeed >>> 0;
  let random = nextRandom(randomState);
  randomState = random.state;
  const changes = random.value < 0.68 ? 1 : 2;
  const changedSlots = new Set<number>();

  for (let change = 0; change < changes; change += 1) {
    const eligible = selectedLineup
      .map((entry, index) => ({ entry, index }))
      .filter(
        ({ entry, index }) =>
          entry.player.position !== "GK" && !changedSlots.has(index),
      );
    if (!eligible.length) break;
    random = nextRandom(randomState);
    randomState = random.state;
    const chosen = eligible[Math.floor(random.value * eligible.length)];
    const replacements = roster.filter(
      (player) =>
        player.position === chosen.entry.player.position &&
        !used.has(player.id),
    );
    if (!replacements.length) continue;
    random = nextRandom(randomState);
    randomState = random.state;
    const replacement =
      replacements[Math.floor(random.value * replacements.length)];
    used.delete(chosen.entry.player.id);
    used.add(replacement.id);
    selectedLineup[chosen.index] = {
      ...chosen.entry,
      player: replacement,
    };
    changedSlots.add(chosen.index);
  }

  return selectedLineup;
};

export function createMatch(
  definition: MatchDefinition,
  campaign: CampaignState,
): MatchState {
  const baseHomeTeam = TEAMS.KOR;
  const homeTeam = {
    ...baseHomeTeam,
    roster: baseHomeTeam.roster.map((player) => ({
      ...player,
      currentStamina: campaign.playerCarry[player.id]?.stamina ?? 100,
      condition: campaign.playerCarry[player.id]?.condition ?? 92,
    })),
  };
  const opponentPlanSeed =
    ((campaign.scoutingSeed ?? definition.seed) ^ definition.seed) >>> 0;
  const baseAwayTeam = TEAMS[definition.opponentId];
  const awayTeam = {
    ...baseAwayTeam,
    roster: baseAwayTeam.roster.map((player) => ({
      ...player,
      currentStamina: 100,
      condition: 92,
    })),
    formationName: opponentFormationFor(
      definition.opponentId,
      opponentPlanSeed,
    ),
  };
  const homePlayers = selectExpectedLineup("KOR", homeTeam.roster, campaign).map(
    ({ player, slot }, index) =>
      createMatchPlayer(
        player,
        "home",
        index,
        campaign,
        slot,
        homeTeam.formationName,
      ),
  );
  const awayPlayers = selectExpectedLineup(
    awayTeam.id,
    awayTeam.roster,
    undefined,
    opponentPlanSeed ^ 0x9e3779b9,
  ).map(({ player, slot }, index) =>
    createMatchPlayer(
      player,
      "away",
      index,
      undefined,
      slot,
      awayTeam.formationName,
    ),
  );

  const kickoff: MatchEvent = {
    id: `${definition.id}-briefing`,
    minute: 0,
    type: "KICK_OFF",
    side: "home",
    text: `${awayTeam.name}전 준비가 완료되었습니다. 관찰할 문제를 기억하십시오.`,
    emphasis: "important",
  };

  return {
    id: `${definition.id}-${definition.seed}`,
    definition,
    homeTeam,
    awayTeam,
    phase: "PRE_MATCH",
    phaseElapsed: 0,
    gameMinute: 0,
    score: { home: 0, away: 0 },
    players: [...homePlayers, ...awayPlayers],
    ball: {
      x: 0.5,
      y: 0.5,
      ownerSide: "home",
      ownerPlayerId: homePlayers.find((player) => player.position === "MF")?.id,
      zone: 0,
    },
    possession: "home",
    homeTactic: tacticStateFromPreset(
      "BALANCED_433",
      homeTeam.defaultTactic,
    ),
    awayTactic: { ...awayTeam.defaultTactic },
    events: [kickoff],
    eventSequence: 1,
    feedback: [
      {
        id: `${definition.id}-initial`,
        coach: "전술",
        severity: "정보",
        text: awayTeam.coachHint,
        minute: 0,
      },
    ],
    metrics: emptyMetrics(),
    commands: [],
    randomState: definition.seed,
    eventCooldown: 1.5,
    feedbackCooldown: 8,
    halfTimeAp: 10,
    substitutionsUsed: 0,
    substitutedOutPlayerIds: [],
    substitutedOutPlayerStates: [],
    pendingSubstitutions: [],
    tacticLoadout: { ...DEFAULT_TACTIC_LOADOUT },
  };
}

const tacticStateFromPreset = (
  presetId: TacticPresetId,
  current: TacticState,
): TacticState => {
  const preset = tacticPresetById(presetId);
  return {
    ...current,
    presetId,
    formation: preset.formation,
    pressing: preset.pressing,
    defensiveLine: preset.defensiveLine,
    tempo: preset.tempo,
    width: preset.width,
    attackSide: preset.attackSide,
    preparedPlan: `${preset.formation} ${preset.name}`,
    preparedPlanActive: false,
  };
};

const applyTacticPreset = (
  state: MatchState,
  presetId: TacticPresetId,
): MatchState => {
  const preset = tacticPresetById(presetId);
  const homePlayers = state.players.filter(
    (player) => player.side === "home" && player.onField,
  );
  const goalkeeper = homePlayers.find((player) => player.position === "GK");
  const outfieldPlayers = homePlayers
    .filter((player) => player.id !== goalkeeper?.id)
    .sort((a, b) => a.baseX - b.baseX || a.baseY - b.baseY);
  const outfieldSlots = preset.slots
    .slice(1)
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const slotByPlayer = new Map<string, { x: number; y: number }>();
  if (goalkeeper) slotByPlayer.set(goalkeeper.id, preset.slots[0]);
  outfieldPlayers.forEach((player, index) => {
    const slot = outfieldSlots[index];
    if (slot) slotByPlayer.set(player.id, slot);
  });
  const event = {
    id: `${state.id}-preset-${presetId}-${Math.round(state.gameMinute)}-${state.events.length}`,
    minute: Math.round(state.gameMinute),
    type: "TACTIC" as const,
    side: "home" as const,
    text: `전술 전환 · ${preset.formation} ${preset.name}`,
    emphasis: "important" as const,
  };

  return {
    ...state,
    homeTeam: { ...state.homeTeam, formationName: preset.formation },
    homeTactic: tacticStateFromPreset(presetId, state.homeTactic),
    players: state.players.map((player) => {
      const slot = slotByPlayer.get(player.id);
      return slot
        ? {
            ...player,
            x: slot.x,
            y: slot.y,
            baseX: slot.x,
            baseY: slot.y,
            targetX: slot.x,
            targetY: slot.y,
          }
        : player;
    }),
    events: state.phase === "PRE_MATCH" ? state.events : [event, ...state.events],
  };
};

export function configureTacticLoadout(
  state: MatchState,
  slot: keyof TacticLoadout,
  presetId: TacticPresetId,
): MatchState {
  if (state.phase !== "PRE_MATCH") return state;
  const currentLoadout = state.tacticLoadout ?? DEFAULT_TACTIC_LOADOUT;
  const occupiedSlot = (Object.entries(currentLoadout) as Array<
    [keyof TacticLoadout, TacticPresetId]
  >).find(([, currentPresetId]) => currentPresetId === presetId)?.[0];
  const nextLoadout = { ...currentLoadout };
  if (occupiedSlot && occupiedSlot !== slot) {
    nextLoadout[occupiedSlot] = nextLoadout[slot];
  }
  nextLoadout[slot] = presetId;
  const updated = { ...state, tacticLoadout: nextLoadout };
  return slot === "main" ? applyTacticPreset(updated, presetId) : updated;
}

export function switchToSubTactic(
  state: MatchState,
  slot: "sub1" | "sub2",
): MatchState {
  if (state.phase === "PRE_MATCH" || state.phase === "FINISHED") return state;
  const tacticLoadout = state.tacticLoadout ?? DEFAULT_TACTIC_LOADOUT;
  return applyTacticPreset(state, tacticLoadout[slot]);
}

const createHomeReplacement = (
  incoming: RosterPlayer,
  outgoing: MatchPlayer,
  carry?: CarryPlayerState,
): MatchPlayer => ({
  ...incoming,
  number: incoming.shirtNumber,
  attributes: incoming.gameAttributes,
  side: "home",
  x: outgoing.x,
  y: outgoing.y,
  baseX: outgoing.baseX,
  baseY: outgoing.baseY,
  targetX: outgoing.targetX,
  targetY: outgoing.targetY,
  currentStamina: carry?.stamina ?? 100,
  bonusStamina: 0,
  condition: carry?.condition ?? 92,
  managerTrust: carry?.managerTrust ?? 72,
  card: "NONE",
  injuryRisk: carry?.injuryMatchesRemaining
    ? 0.2
    : (incoming.advancedAbilities.injuryRisk ?? 20) / 500,
  injured: false,
  onField: true,
});

export function substitutePreMatchPlayer(
  state: MatchState,
  outgoingPlayerId: string,
  incomingPlayerId: string,
  carry?: CarryPlayerState,
): MatchState {
  if (state.phase !== "PRE_MATCH") return state;
  const substitution = resolveHomeSubstitution(
    state,
    outgoingPlayerId,
    incomingPlayerId,
  );
  if (!substitution) return state;
  const { outgoing, incoming } = substitution;

  const replacement = createHomeReplacement(incoming, outgoing, carry);

  return {
    ...state,
    players: state.players.map((player) =>
      player.id === outgoing.id ? replacement : player,
    ),
    ball:
      state.ball.ownerPlayerId === outgoing.id
        ? { ...state.ball, ownerPlayerId: replacement.id }
        : state.ball,
  };
}

export function substituteHalfTimePlayer(
  state: MatchState,
  outgoingPlayerId: string,
  incomingPlayerId: string,
  carry?: CarryPlayerState,
): MatchState {
  if (state.phase !== "HALF_TIME" || state.substitutionsUsed >= 5) return state;
  const substitution = resolveHomeSubstitution(
    state,
    outgoingPlayerId,
    incomingPlayerId,
  );
  if (!substitution) return state;
  const { outgoing, incoming } = substitution;

  const replacement = createHomeReplacement(incoming, outgoing, carry);
  const substitutionNumber = state.substitutionsUsed + 1;

  return {
    ...state,
    players: state.players.map((player) =>
      player.id === outgoing.id ? replacement : player,
    ),
    ball:
      state.ball.ownerPlayerId === outgoing.id
        ? { ...state.ball, ownerPlayerId: replacement.id }
        : state.ball,
    substitutionsUsed: substitutionNumber,
    substitutedOutPlayerIds: [
      ...state.substitutedOutPlayerIds,
      outgoing.id,
    ],
    substitutedOutPlayerStates: [
      ...(state.substitutedOutPlayerStates ?? []),
      outgoing,
    ],
    events: [
      {
        id: `${state.id}-sub-${substitutionNumber}`,
        minute: 45,
        type: "SUBSTITUTION",
        side: "home",
        text: `하프타임 교체 · ${outgoing.name} OUT, ${replacement.name} IN`,
        emphasis: "important",
      },
      ...state.events,
    ],
    feedback: [
      {
        id: `${state.id}-sub-feedback-${substitutionNumber}`,
        coach: "전술",
        severity: "정보",
        text: `${replacement.name}이 ${outgoing.name}의 위치에서 후반전을 준비합니다.`,
        minute: 45,
      },
      ...state.feedback,
    ],
  };
}

const ACTIVE_MATCH_PHASES = new Set<MatchPhase>([
  "OBSERVE_0_22",
  "OBSERVE_22_45",
  "OBSERVE_45_67",
  "OBSERVE_67_90",
]);

const BREAK_PHASES = new Set<MatchPhase>([
  "HYDRATION_FIRST",
  "HALF_TIME",
  "HYDRATION_SECOND",
]);

const completeHomeSubstitution = (
  state: MatchState,
  outgoingPlayerId: string,
  incomingPlayerId: string,
  carry?: CarryPlayerState,
  source = "경기 중 교체",
): MatchState => {
  const substitutionsUsed = state.substitutionsUsed ?? 0;
  const substitutedOutPlayerIds = state.substitutedOutPlayerIds ?? [];
  if (substitutionsUsed >= 5) return state;
  const substitution = resolveHomeSubstitution(
    state,
    outgoingPlayerId,
    incomingPlayerId,
  );
  if (!substitution) return state;
  const { outgoing, incoming } = substitution;

  const replacement = createHomeReplacement(incoming, outgoing, carry);
  const substitutionNumber = substitutionsUsed + 1;
  const minute = Math.round(state.gameMinute);

  return {
    ...state,
    players: state.players.map((player) =>
      player.id === outgoing.id ? replacement : player,
    ),
    ball:
      state.ball.ownerPlayerId === outgoing.id
        ? { ...state.ball, ownerPlayerId: replacement.id }
        : state.ball,
    substitutionsUsed: substitutionNumber,
    substitutedOutPlayerIds: [
      ...substitutedOutPlayerIds,
      outgoing.id,
    ],
    substitutedOutPlayerStates: [
      ...(state.substitutedOutPlayerStates ?? []),
      outgoing,
    ],
    events: [
      {
        id: `${state.id}-live-sub-${substitutionNumber}-${minute}`,
        minute,
        type: "SUBSTITUTION",
        side: "home",
        text: `${source} · ${outgoing.name} OUT, ${replacement.name} IN`,
        emphasis: "important",
      },
      ...state.events,
    ],
    feedback: [
      {
        id: `${state.id}-live-sub-feedback-${substitutionNumber}-${minute}`,
        coach: "전술",
        severity: "정보",
        text: `${replacement.name}이 ${outgoing.name}의 전술 위치를 이어받았습니다.`,
        minute,
      },
      ...state.feedback,
    ],
  };
};

export function substitutePausedPlayer(
  state: MatchState,
  outgoingPlayerId: string,
  incomingPlayerId: string,
  carry?: CarryPlayerState,
): MatchState {
  if (!ACTIVE_MATCH_PHASES.has(state.phase)) return state;
  return completeHomeSubstitution(
    state,
    outgoingPlayerId,
    incomingPlayerId,
    carry,
    "경기 중 교체",
  );
}

export function queueSubstitution(
  state: MatchState,
  outgoingPlayerId: string,
  incomingPlayerId: string,
  targetPhase?: PendingSubstitution["targetPhase"],
): MatchState {
  const pendingSubstitutions = state.pendingSubstitutions ?? [];
  if (
    (!BREAK_PHASES.has(state.phase) && !ACTIVE_MATCH_PHASES.has(state.phase)) ||
    (state.substitutionsUsed ?? 0) + pendingSubstitutions.length >= 5
  ) {
    return state;
  }
  const substitution = resolveHomeSubstitution(
    state,
    outgoingPlayerId,
    incomingPlayerId,
  );
  const alreadyReserved = pendingSubstitutions.some(
    (item) =>
      item.outgoingPlayerId === outgoingPlayerId ||
      item.incomingPlayerId === incomingPlayerId,
  );
  if (
    !substitution ||
    alreadyReserved
  ) {
    return state;
  }
  const { outgoing, incoming } = substitution;

  const pending: PendingSubstitution = {
    id: `${outgoing.id}-${incoming.id}`,
    outgoingPlayerId: outgoing.id,
    incomingPlayerId: incoming.id,
    requestedPhase: state.phase,
    requestedMinute: Math.round(state.gameMinute),
    targetPhase,
  };
  return {
    ...state,
    pendingSubstitutions: [...pendingSubstitutions, pending],
  };
}

export function cancelPendingSubstitution(
  state: MatchState,
  pendingId: string,
): MatchState {
  if (!BREAK_PHASES.has(state.phase) && !ACTIVE_MATCH_PHASES.has(state.phase)) {
    return state;
  }
  return {
    ...state,
    pendingSubstitutions: (state.pendingSubstitutions ?? []).filter(
      (item) => item.id !== pendingId,
    ),
  };
}

export function applyPendingSubstitutions(
  state: MatchState,
  carryByPlayer: Partial<Record<string, CarryPlayerState>> = {},
): MatchState {
  let next = state;
  const applicable = (state.pendingSubstitutions ?? []).filter(
    (pending) => !pending.targetPhase || pending.targetPhase === state.phase,
  );
  const resolvedIds = new Set(applicable.map((pending) => pending.id));
  for (const pending of applicable) {
    next = completeHomeSubstitution(
      next,
      pending.outgoingPlayerId,
      pending.incomingPlayerId,
      carryByPlayer[pending.incomingPlayerId],
      "예약 교체 적용",
    );
  }
  return {
    ...next,
    pendingSubstitutions: (state.pendingSubstitutions ?? []).filter(
      (pending) => !resolvedIds.has(pending.id),
    ),
  };
}

export function startMatch(state: MatchState): MatchState {
  return {
    ...state,
    phase: "OBSERVE_0_22",
    phaseElapsed: 0,
    gameMinute: 0,
    events: [
      {
        id: `${state.id}-kickoff`,
        minute: 0,
        type: "KICK_OFF",
        side: "home",
        text: "경기가 시작됐습니다. 지금은 지시보다 관찰이 먼저입니다.",
        emphasis: "important",
      },
      ...state.events,
    ],
  };
}

const average = (values: number[]): number =>
  values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;

const activePlayers = (state: MatchState, side: Side): MatchPlayer[] =>
  state.players.filter(
    (player) => player.side === side && player.onField && !player.injured,
  );

const teamQuality = (
  state: MatchState,
  side: Side,
  attribute: "passing" | "shooting" | "defending" | "pace",
): number => {
  const players = activePlayers(state, side);
  return average(
    players.map(
      (player) =>
        player.attributes[attribute] *
        (0.62 + player.currentStamina / 260) *
        (0.72 + player.condition / 360),
    ),
  );
};

const tacticFor = (state: MatchState, side: Side): TacticState =>
  side === "home" ? state.homeTactic : state.awayTactic;

const opposition = (side: Side): Side => (side === "home" ? "away" : "home");

const teamName = (state: MatchState, side: Side): string =>
  side === "home" ? state.homeTeam.name : state.awayTeam.name;

const randomAttacker = (
  players: MatchPlayer[],
  state: number,
): { player?: MatchPlayer; state: number } => {
  const candidates = players.filter((player) => player.position !== "GK");
  const result = nextRandom(state);
  const player = candidates.length
    ? candidates[
        Math.min(
          candidates.length - 1,
          Math.floor(result.value * candidates.length),
        )
      ]
    : players[0];
  return { player, state: result.state };
};

const closestOutfieldPlayer = (
  players: MatchPlayer[],
  side: Side,
  x: number,
  y: number,
): MatchPlayer | undefined =>
  players
    .filter(
      (player) =>
        player.side === side &&
        player.onField &&
        !player.injured &&
        player.position !== "GK",
    )
    .sort(
      (first, second) =>
        Math.hypot(first.x - x, first.y - y) -
        Math.hypot(second.x - x, second.y - y),
    )[0];

function prependEvent(state: MatchState, event: MatchEvent): MatchState {
  const eventSequence = state.eventSequence ?? state.events.length;
  return {
    ...state,
    eventSequence: eventSequence + 1,
    events: [
      { ...event, id: `${state.id}-event-${eventSequence}` },
      ...state.events,
    ].slice(0, 28),
  };
}

function resolveEvent(state: MatchState): MatchState {
  let next = {
    ...state,
    score: { ...state.score },
    metrics: { ...state.metrics },
    players: state.players.map((player) => ({ ...player })),
  };
  let randomState = next.randomState;
  const attackingSide = next.possession;
  const defendingSide = opposition(attackingSide);
  const attackTactic = tacticFor(next, attackingSide);
  const defendTactic = tacticFor(next, defendingSide);
  const minute = Math.max(1, Math.round(next.gameMinute));

  const injuryRoll = nextRandom(randomState);
  randomState = injuryRoll.state;
  const injuryCandidates = activePlayers(next, attackingSide).filter(
    (player) => player.position !== "GK" && player.injuryRisk > 0.025,
  );
  const injuryPick = randomAttacker(injuryCandidates, randomState);
  randomState = injuryPick.state;
  const injuredPlayer = injuryPick.player;
  if (
    injuredPlayer &&
    injuryRoll.value < Math.min(0.012, injuredPlayer.injuryRisk * 0.018)
  ) {
    next.players = next.players.map((player) =>
      player.id === injuredPlayer.id
        ? { ...player, injured: true, onField: false }
        : player,
    );
    if (next.ball.ownerPlayerId === injuredPlayer.id) {
      next.possession = defendingSide;
      next.ball = {
        ...next.ball,
        ownerSide: defendingSide,
        ownerPlayerId: closestOutfieldPlayer(
          next.players,
          defendingSide,
          1 - next.ball.x,
          next.ball.y,
        )?.id,
      };
    }
    next = prependEvent(next, {
      id: "injury",
      minute,
      type: "INJURY",
      side: attackingSide,
      text: `${injuredPlayer.name}이 부상으로 더 이상 경기를 이어갈 수 없습니다.`,
      emphasis: "danger",
    });
    return { ...next, randomState, eventCooldown: 2.2 };
  }

  const foulRoll = nextRandom(randomState);
  randomState = foulRoll.state;
  const foulChance =
    0.035 +
    defendTactic.pressing / 900 +
    (next.definition.referee === "엄격함" ? 0.035 : 0);

  if (foulRoll.value < foulChance) {
    const defenders = activePlayers(next, defendingSide).filter(
      (player) => player.position !== "GK",
    );
    const offenderPick = randomAttacker(defenders, randomState);
    randomState = offenderPick.state;
    const offender = offenderPick.player;
    if (!offender) {
      return { ...next, randomState, eventCooldown: 1.2 };
    }
    if (defendingSide === "home") {
      next.metrics.homeFouls = (next.metrics.homeFouls ?? 0) + 1;
    } else {
      next.metrics.awayFouls = (next.metrics.awayFouls ?? 0) + 1;
    }
    next = prependEvent(next, {
      id: `${next.id}-foul-${minute}-${next.events.length}`,
      minute,
      type: "FOUL",
      side: defendingSide,
      text: `${offender.name}, 압박 과정에서 파울을 범합니다.`,
      emphasis: "normal",
    });

    const cardRoll = nextRandom(randomState);
    randomState = cardRoll.state;
    const cardChance =
      next.definition.referee === "엄격함"
        ? 0.36
        : next.definition.referee === "관대함"
          ? 0.14
          : 0.24;
    if (cardRoll.value < cardChance) {
      if (defendingSide === "home") {
        next.metrics.homeCards = (next.metrics.homeCards ?? 0) + 1;
      } else {
        next.metrics.awayCards = (next.metrics.awayCards ?? 0) + 1;
      }
      next.players = next.players.map((player) =>
        player.id === offender.id
          ? {
              ...player,
              card: player.card === "YELLOW" ? "RED" : "YELLOW",
              onField: player.card !== "YELLOW",
            }
          : player,
      );
      next = prependEvent(next, {
        id: `${next.id}-card-${minute}-${next.events.length}`,
        minute,
        type: "CARD",
        side: defendingSide,
        text: `${offender.name}에게 ${offender.card === "YELLOW" ? "두 번째 경고와 퇴장" : "경고"}가 주어집니다.`,
        emphasis: "danger",
      });
    }
    return { ...next, randomState, eventCooldown: 1.8 };
  }

  const passQuality = teamQuality(next, attackingSide, "passing");
  const defenseQuality = teamQuality(next, defendingSide, "defending");
  const passingStyle = attackTactic.passingStyle ?? "balanced";
  const compactPossessionBonus =
    attackingSide === "home" &&
    next.commands.some((command) => command.kind === "COMPACT_POSSESSION")
      ? 0.045
      : 0;
  const passChance = clamp(
    0.57 +
      (passQuality - defenseQuality) / 180 +
      attackTactic.tempo / 600 -
      defendTactic.pressing / 760 +
      (attackTactic.preparedPlanActive ? 0.05 : 0) +
      (passingStyle === "short" ? 0.07 : passingStyle === "long" ? -0.08 : 0) +
      compactPossessionBonus,
    0.34,
    0.88,
  );

  const passRoll = nextRandom(randomState);
  randomState = passRoll.state;
  const metricPrefix = attackingSide === "home" ? "home" : "away";
  if (metricPrefix === "home") next.metrics.homePassAttempts += 1;
  else next.metrics.awayPassAttempts += 1;

  if (passRoll.value > passChance) {
    if (metricPrefix === "home") next.metrics.homeTurnovers += 1;
    else next.metrics.awayTurnovers += 1;
    const opponentSide = opposition(attackingSide);
    next.possession = opponentSide;
    const turnoverX = 1 - next.ball.x;
    const turnoverY = clamp(next.ball.y + (passRoll.value - 0.5) * 0.12, 0.08, 0.92);
    next.ball = {
      ...next.ball,
      ownerSide: opponentSide,
      ownerPlayerId: closestOutfieldPlayer(
        next.players,
        opponentSide,
        turnoverX,
        turnoverY,
      )?.id,
      zone: Math.max(0, 2 - next.ball.zone),
      x: turnoverX,
      y: turnoverY,
    };
    next = prependEvent(next, {
      id: `${next.id}-turnover-${minute}-${next.events.length}`,
      minute,
      type: "TURNOVER",
      side: attackingSide,
      text: `${teamName(next, attackingSide)}, 전진 패스가 끊기며 소유권을 내줍니다.`,
      emphasis: attackingSide === "home" ? "danger" : "normal",
    });
    return { ...next, randomState, eventCooldown: 1.25 };
  }

  if (metricPrefix === "home") next.metrics.homePassSuccess += 1;
  else next.metrics.awayPassSuccess += 1;

  const sideRoll = nextRandom(randomState);
  randomState = sideRoll.state;
  const y =
    attackTactic.attackSide === "left"
      ? 0.26
      : attackTactic.attackSide === "right"
        ? 0.74
        : attackTactic.attackSide === "both"
          ? sideRoll.value < 0.5
            ? 0.24
            : 0.76
          : 0.35 + sideRoll.value * 0.3;
  const zoneAdvance =
    passingStyle === "long"
      ? 2
      : passingStyle === "short" && sideRoll.value > 0.72
        ? 0
        : 1;
  const newZone = Math.min(3, next.ball.zone + zoneAdvance);
  const normalizedX = [0.18, 0.38, 0.64, 0.83][newZone];
  const ballX = attackingSide === "home" ? normalizedX : 1 - normalizedX;
  const receiver = closestOutfieldPlayer(next.players, attackingSide, ballX, y);
  next.ball = {
    x: ballX,
    y,
    ownerSide: attackingSide,
    ownerPlayerId: receiver?.id,
    zone: newZone,
  };

  if (
    attackingSide === "home" &&
    (attackTactic.attackSide === "right" || y > 0.62)
  ) {
    next.metrics.homeRightThreat += 1;
  }
  if (
    attackingSide === "home" &&
    (attackTactic.attackSide === "left" || y < 0.38)
  ) {
    next.metrics.homeLeftThreat += 1;
  }
  if (
    attackingSide === "away" &&
    (attackTactic.attackSide === "right" || y > 0.62)
  ) {
    next.metrics.awayRightThreat += 1;
  }
  if (
    attackingSide === "away" &&
    (attackTactic.attackSide === "left" || y < 0.38)
  ) {
    next.metrics.awayLeftThreat += 1;
  }

  const shotRoll = nextRandom(randomState);
  randomState = shotRoll.state;
  const shotChance =
    newZone >= 3
      ? 0.46 +
        attackTactic.tempo / 500 +
        (passingStyle === "long" ? 0.04 : passingStyle === "short" ? -0.03 : 0)
      : newZone === 2
        ? 0.11
        : 0;

  if (shotRoll.value < shotChance) {
    const attackers = activePlayers(next, attackingSide);
    const shooterPick = randomAttacker(attackers, randomState);
    randomState = shooterPick.state;
    const shooter = shooterPick.player;
    if (!shooter) {
      return { ...next, randomState, eventCooldown: 1.2 };
    }
    if (attackingSide === "home") next.metrics.homeShots += 1;
    else next.metrics.awayShots += 1;

    next = prependEvent(next, {
      id: `${next.id}-shot-${minute}-${next.events.length}`,
      minute,
      type: "SHOT",
      side: attackingSide,
      text: `${shooter.name}, ${y > 0.62 || y < 0.38 ? "측면 전개 끝에" : "중앙 침투로"} 슈팅합니다!`,
      emphasis: "important",
    });

    const goalRoll = nextRandom(randomState);
    randomState = goalRoll.state;
    const shooting = shooter.attributes.shooting;
    const defending = teamQuality(next, defendingSide, "defending");
    const goalChance = clamp(
      0.16 +
        (shooting - defending) / 210 +
        (newZone === 3 ? 0.08 : 0) +
        (attackingSide === "home" &&
        next.commands.some((command) => command.kind === "CENTRAL_RUN")
          ? 0.035
          : 0),
      0.06,
      0.42,
    );
    const onTarget = goalRoll.value < Math.max(goalChance, 0.58);
    if (onTarget) {
      if (attackingSide === "home") {
        next.metrics.homeShotsOnTarget =
          (next.metrics.homeShotsOnTarget ?? 0) + 1;
      } else {
        next.metrics.awayShotsOnTarget =
          (next.metrics.awayShotsOnTarget ?? 0) + 1;
      }
    }

    if (goalRoll.value < goalChance) {
      next.score[attackingSide] += 1;
      next = prependEvent(next, {
        id: `${next.id}-goal-${minute}-${next.events.length}`,
        minute,
        type: "GOAL",
        side: attackingSide,
        text: `골! ${teamName(next, attackingSide)}의 ${shooter.name}가 마무리합니다.`,
        emphasis: attackingSide === "home" ? "important" : "danger",
      });
      next.possession = defendingSide;
      next.ball = {
        x: 0.5,
        y: 0.5,
        ownerSide: defendingSide,
        ownerPlayerId: closestOutfieldPlayer(
          next.players,
          defendingSide,
          0.5,
          0.5,
        )?.id,
        zone: 0,
      };
    } else {
      const wonCorner = goalRoll.value > 0.82;
      if (wonCorner) {
        if (attackingSide === "home") {
          next.metrics.homeCorners = (next.metrics.homeCorners ?? 0) + 1;
        } else {
          next.metrics.awayCorners = (next.metrics.awayCorners ?? 0) + 1;
        }
        next = prependEvent(next, {
          id: `${next.id}-corner-${minute}-${next.events.length}`,
          minute,
          type: "CORNER",
          side: attackingSide,
          text: `${teamName(next, attackingSide)}, 코너킥 기회를 얻습니다.`,
          emphasis: "important",
        });
      }
      const restartSide = wonCorner ? attackingSide : defendingSide;
      const restartX = wonCorner
        ? attackingSide === "home"
          ? 0.88
          : 0.12
        : 0.5;
      const restartY = wonCorner ? (y < 0.5 ? 0.08 : 0.92) : 0.5;
      next.possession = restartSide;
      next.ball = {
        x: restartX,
        y: restartY,
        ownerSide: restartSide,
        ownerPlayerId: closestOutfieldPlayer(
          next.players,
          restartSide,
          restartX,
          restartY,
        )?.id,
        zone: wonCorner ? 3 : 0,
      };
    }
  } else {
    next = prependEvent(next, {
      id: `${next.id}-pass-${minute}-${next.events.length}`,
      minute,
      type: "PASS",
      side: attackingSide,
      text: `${teamName(next, attackingSide)}, ${newZone >= 2 ? "위험 지역까지 전진합니다." : "짧은 패스로 전진합니다."}`,
      emphasis: newZone >= 2 ? "important" : "normal",
    });
  }

  const cooldown = randomBetween(randomState, 1.35, 2.45);
  return {
    ...next,
    randomState: cooldown.state,
    eventCooldown: cooldown.value,
  };
}

function drainStamina(state: MatchState, seconds: number): MatchState {
  const hotMultiplier = state.definition.weather === "고온" ? 1.16 : 1;
  const players = state.players.map((player) => {
    if (!player.onField || player.injured) return player;
    const tactic = tacticFor(state, player.side);
    const pressingDrain = tactic.pressing / 900;
    const personalDrain = state.commands.some(
      (command) =>
        command.kind === "WINGER_TRACK" &&
        command.targetPlayerId === player.id,
    )
      ? 0.035
      : 0;
    const conserving = state.commands.some(
      (command) =>
        command.kind === "CONSERVE_ENERGY" &&
        command.targetPlayerId === player.id,
    );
    const drain =
      seconds *
      (0.052 + pressingDrain + personalDrain) *
      hotMultiplier *
      (conserving ? 0.66 : 1);
    return {
      ...player,
      currentStamina: Math.max(0, player.currentStamina - drain),
      bonusStamina: Math.max(0, player.bonusStamina - drain),
      injuryRisk: Math.min(
        0.45,
        player.injuryRisk + (player.currentStamina < 45 ? seconds * 0.0007 : 0),
      ),
    };
  });
  return { ...state, players };
}

function updatePlayerTargets(state: MatchState): MatchState {
  const active = state.players.filter(
    (player) => player.onField && !player.injured,
  );
  const nearestDefenders = active
    .filter(
      (player) =>
        player.side !== state.possession && player.position !== "GK",
    )
    .sort(
      (first, second) =>
        Math.hypot(first.x - state.ball.x, first.y - state.ball.y) -
        Math.hypot(second.x - state.ball.x, second.y - state.ball.y),
    )
    .slice(0, 2)
    .map((player) => player.id);

  const players = state.players.map((player) => {
    if (!player.onField) return player;
    const tactic = tacticFor(state, player.side);
    const hasBall = state.possession === player.side;
    const direction = player.side === "home" ? 1 : -1;
    const isCarrier =
      hasBall &&
      (state.ball.ownerPlayerId === player.id ||
        (!state.ball.ownerPlayerId &&
          closestOutfieldPlayer(
            active,
            player.side,
            state.ball.x,
            state.ball.y,
          )?.id === player.id));
    const pressingIndex = nearestDefenders.indexOf(player.id);
    const isPresser = pressingIndex >= 0;
    const outfield = player.position !== "GK";
    const ballPull = player.position === "FW" ? 0.28 : player.position === "MF" ? 0.2 : 0.1;
    const attackAdvance =
      player.position === "FW"
        ? 0.1
        : player.position === "MF"
          ? 0.065
          : player.position === "DF"
            ? 0.025
            : 0;
    const defensiveRetreat =
      player.position === "DF"
        ? 0.055 + state.ball.zone * 0.012
        : player.position === "MF"
          ? 0.035
          : 0.015;
    const lineShift =
      player.position === "DF"
        ? direction * ((tactic.defensiveLine - 50) / 520)
        : 0;
    const widthScale = hasBall
      ? 1 + (tactic.width - 50) / 130
      : 0.78 + (tactic.width - 50) / 300;
    const runWave =
      outfield
        ? Math.sin(state.gameMinute * 0.95 + player.number * 1.73) * 0.018
        : 0;

    let targetX =
      player.baseX +
      lineShift +
      direction * (hasBall ? attackAdvance : -defensiveRetreat) +
      (state.ball.x - player.baseX) * (hasBall ? ballPull : 0.1);
    let targetY =
      0.5 +
      (player.baseY - 0.5) * widthScale +
      (state.ball.y - player.baseY) * (hasBall ? ballPull : 0.16) +
      runWave;

    if (isCarrier) {
      targetX = state.ball.x - direction * 0.012;
      targetY = state.ball.y;
    } else if (isPresser) {
      const markingOffset = pressingIndex === 0 ? 0.018 : 0.055;
      targetX = state.ball.x - direction * markingOffset;
      targetY =
        state.ball.y + (pressingIndex === 0 ? -0.015 : 0.045) * (player.baseY < 0.5 ? -1 : 1);
    } else if (player.position === "GK") {
      targetX = player.baseX;
      targetY = clamp(0.5 + (state.ball.y - 0.5) * 0.28, 0.38, 0.62);
    }

    targetX = clamp(targetX, 0.035, 0.965);
    targetY = clamp(targetY, 0.055, 0.945);
    const movementRate = isCarrier || isPresser ? 0.42 : 0.3;

    return {
      ...player,
      targetX,
      targetY,
      x: player.x + (targetX - player.x) * movementRate,
      y: player.y + (targetY - player.y) * movementRate,
    };
  });
  return { ...state, players };
}

function makeFeedback(state: MatchState): CoachFeedback | null {
  const existingIds = new Set(state.feedback.map((item) => item.id));
  const minute = Math.round(state.gameMinute);
  const feedbackCandidates: CoachFeedback[] = [];

  if (state.metrics.awayRightThreat >= 3) {
    feedbackCandidates.push({
      id: "right-overload",
      coach: "수비",
      severity: "긴급",
      text: "상대가 오른쪽 측면에 숫자를 모으고 있습니다. 윙어의 복귀가 늦습니다.",
      minute,
    });
  }
  if (
    state.metrics.homePassAttempts >= 5 &&
    state.metrics.homePassSuccess / state.metrics.homePassAttempts < 0.62
  ) {
    feedbackCandidates.push({
      id: "build-up-pressure",
      coach: "전술",
      severity: "주의",
      text: "첫 번째 전진 패스가 반복해서 막힙니다. 공격 방향 전환을 검토하십시오.",
      minute,
    });
  }
  if (state.metrics.homeShots === 0 && minute >= 16) {
    feedbackCandidates.push({
      id: "no-penetration",
      coach: "공격",
      severity: "주의",
      text: "점유율에 비해 침투가 부족합니다. 센터백 뒤 공간은 아직 열려 있습니다.",
      minute,
    });
  }
  const tired = activePlayers(state, "home")
    .filter((player) => player.currentStamina < 64)
    .sort((a, b) => a.currentStamina - b.currentStamina)[0];
  if (tired) {
    feedbackCandidates.push({
      id: `tired-${tired.id}`,
      coach: "피지컬",
      severity: tired.currentStamina < 48 ? "긴급" : "주의",
      text: `${tired.number}번 ${tired.name}의 활동량이 급격히 떨어지고 있습니다.`,
      minute,
    });
  }
  const carded = activePlayers(state, "home").find(
    (player) => player.card === "YELLOW",
  );
  if (carded) {
    feedbackCandidates.push({
      id: `card-${carded.id}`,
      coach: "수비",
      severity: "주의",
      text: `${carded.name}가 경고를 안고 있습니다. 강한 압박 지시는 위험할 수 있습니다.`,
      minute,
    });
  }
  if (!state.homeTactic.preparedPlanActive && minute >= 48) {
    feedbackCandidates.push({
      id: "prepared-plan-unused",
      coach: "전술",
      severity: "정보",
      text: "경기 전에 합의한 측면 전환 플랜을 아직 사용하지 않았습니다.",
      minute,
    });
  }

  return (
    feedbackCandidates.find((candidate) => !existingIds.has(candidate.id)) ??
    null
  );
}

export function advanceMatch(
  state: MatchState,
  seconds: number,
): MatchState {
  const phaseRange = PHASE_RANGES[state.phase];
  if (!phaseRange) return state;

  const elapsed = Math.min(OBSERVATION_SECONDS, state.phaseElapsed + seconds);
  let next: MatchState = {
    ...state,
    phaseElapsed: elapsed,
    gameMinute:
      phaseRange.start +
      (phaseRange.end - phaseRange.start) *
        (elapsed / OBSERVATION_SECONDS),
    eventCooldown: state.eventCooldown - seconds,
    feedbackCooldown: state.feedbackCooldown - seconds,
  };
  next.metrics = {
    ...next.metrics,
    homePossessionSeconds:
      (next.metrics.homePossessionSeconds ?? 0) +
      (state.possession === "home" ? seconds : 0),
    awayPossessionSeconds:
      (next.metrics.awayPossessionSeconds ?? 0) +
      (state.possession === "away" ? seconds : 0),
  };
  next = drainStamina(next, seconds);

  if (next.eventCooldown <= 0) {
    next = resolveEvent(next);
  }
  if (next.feedbackCooldown <= 0) {
    const feedback = makeFeedback(next);
    next = {
      ...next,
      feedback: feedback
        ? [feedback, ...next.feedback].slice(0, 12)
        : next.feedback,
      feedbackCooldown: 9,
    };
  }
  next = updatePlayerTargets(next);

  if (elapsed >= OBSERVATION_SECONDS) {
    next = {
      ...next,
      phase: phaseRange.next,
      phaseElapsed: 0,
      gameMinute: phaseRange.end,
    };
  }

  return next;
}

/**
 * Runs the simulation on the canonical 0.5-second tick. Playback controls may
 * change how many ticks run per render interval, but never the tick size.
 */
export function advanceMatchTicks(
  state: MatchState,
  tickCount: number,
): MatchState {
  let next = state;
  for (let tick = 0; tick < tickCount; tick += 1) {
    next = advanceMatch(next, 0.5);
  }
  return next;
}

export function skipObservationSegment(state: MatchState): MatchState {
  const startingPhase = state.phase;
  let next = state;
  let guard = 0;
  while (next.phase === startingPhase && guard < 240) {
    next = advanceMatchTicks(next, 1);
    guard += 1;
  }
  return next;
}

export function continueMatch(
  state: MatchState,
  carryByPlayer: Partial<Record<string, CarryPlayerState>> = {},
): MatchState {
  const nextPhase: Partial<Record<MatchPhase, MatchPhase>> = {
    HYDRATION_FIRST: "OBSERVE_22_45",
    HALF_TIME: "OBSERVE_45_67",
    HYDRATION_SECOND: "OBSERVE_67_90",
  };
  const phase = nextPhase[state.phase];
  if (!phase) return state;

  const preparedState = applyPendingSubstitutions(state, carryByPlayer);

  return {
    ...preparedState,
    phase,
    phaseElapsed: 0,
    eventCooldown: 1.1,
    feedbackCooldown: 7,
    events: [
      {
        id: `${state.id}-resume-${phase}`,
        minute: Math.round(state.gameMinute),
        type: "KICK_OFF",
        side: "home",
        text:
          state.phase === "HALF_TIME"
            ? "후반전이 시작됩니다. 하프타임 선택이 경기 흐름에 반영됩니다."
            : "브레이크가 끝났습니다. 전달한 지시와 예약 교체가 경기장에 반영됩니다.",
        emphasis: "important",
      },
      ...preparedState.events,
    ],
  };
}

export function applyHalfTimeRecovery(state: MatchState): MatchState {
  if (state.phase !== "HALF_TIME") return state;
  const definition = COMMANDS.HALFTIME_RECOVERY;
  const command = {
    id: `command-${state.commands.length + 1}-${Math.round(state.gameMinute)}`,
    kind: "HALFTIME_RECOVERY" as const,
    label: definition.label,
    cost: 0,
    minute: Math.round(state.gameMinute),
    effect: definition.effect,
    tradeoff: definition.tradeoff,
    baseline: createCommandBaseline(state),
  };
  return {
    ...state,
    players: state.players.map((player) =>
      player.side === "home" && player.onField
        ? {
            ...player,
            currentStamina: Math.min(100, player.currentStamina + 12),
            bonusStamina: Math.min(18, player.bonusStamina + 12),
          }
        : player,
    ),
    commands: [...state.commands, command],
    events: [
      {
        id: `${state.id}-halftime-recovery`,
        minute: 45,
        type: "TACTIC",
        side: "home",
        text: "하프타임을 회복에 집중해 후반전에 사용할 추가 체력을 확보했습니다.",
        emphasis: "important",
      },
      ...state.events,
    ],
  };
}

export function moveHomePlayer(
  state: MatchState,
  playerId: string,
  x: number,
  y: number,
): MatchState {
  if (state.phase !== "PRE_MATCH" && state.phase !== "HALF_TIME") return state;
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId && player.side === "home"
        ? {
            ...player,
            x: clamp(x, 0.04, 0.82),
            y: clamp(y, 0.06, 0.94),
            baseX: clamp(x, 0.04, 0.82),
            baseY: clamp(y, 0.06, 0.94),
            targetX: clamp(x, 0.04, 0.82),
            targetY: clamp(y, 0.06, 0.94),
          }
        : player,
    ),
  };
}

export function swapHomePlayerPositions(
  state: MatchState,
  firstPlayerId: string,
  secondPlayerId: string,
  firstOriginX: number,
  firstOriginY: number,
): MatchState {
  if (state.phase !== "PRE_MATCH" && state.phase !== "HALF_TIME") return state;
  if (firstPlayerId === secondPlayerId) return state;
  const first = state.players.find(
    (player) =>
      player.id === firstPlayerId && player.side === "home" && player.onField,
  );
  const second = state.players.find(
    (player) =>
      player.id === secondPlayerId && player.side === "home" && player.onField,
  );
  if (!first || !second || !canExchangePlayers(first, second)) return state;

  const firstDestination = {
    x: clamp(second.x, 0.04, 0.82),
    y: clamp(second.y, 0.06, 0.94),
  };
  const secondDestination = {
    x: clamp(firstOriginX, 0.04, 0.82),
    y: clamp(firstOriginY, 0.06, 0.94),
  };
  return {
    ...state,
    players: state.players.map((player) => {
      const destination =
        player.id === first.id
          ? firstDestination
          : player.id === second.id
            ? secondDestination
            : undefined;
      return destination
        ? {
            ...player,
            ...destination,
            baseX: destination.x,
            baseY: destination.y,
            targetX: destination.x,
            targetY: destination.y,
          }
        : player;
    }),
  };
}

export function createMatchResult(state: MatchState): MatchResult {
  const pointsEarned =
    state.score.home > state.score.away
      ? 3
      : state.score.home === state.score.away
        ? 1
        : 0;
  return {
    matchId: state.id,
    round: state.definition.round,
    opponentId: state.definition.opponentId,
    homeGoals: state.score.home,
    awayGoals: state.score.away,
    pointsEarned,
    commands: state.commands,
    commandEvaluations: state.commands.map((command) =>
      evaluateCommandImpact(state, command),
    ),
    metrics: state.metrics,
    playerStates: [
      ...state.players,
      ...(state.substitutedOutPlayerStates ?? []),
    ],
  };
}

export function averageTeamStamina(
  state: MatchState,
  side: Side = "home",
): number {
  return average(
    activePlayers(state, side).map((player) => player.currentStamina),
  );
}
