import { FORMATION_433, TEAMS } from "../data";
import type {
  CampaignState,
  CoachFeedback,
  MatchDefinition,
  MatchEvent,
  MatchMetrics,
  MatchPhase,
  MatchPlayer,
  MatchResult,
  MatchState,
  PlayerProfile,
  Side,
  TacticState,
} from "../types";
import { clamp, nextRandom, randomBetween } from "./random";

const OBSERVATION_SECONDS = 60;

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
  tacticalWins: 0,
});

const createMatchPlayer = (
  profile: PlayerProfile,
  side: Side,
  slotIndex: number,
  campaign?: CampaignState,
): MatchPlayer => {
  const slot = FORMATION_433[slotIndex];
  const homeX = slot.x;
  const x = side === "home" ? homeX : 1 - homeX;
  const carry =
    side === "home" ? campaign?.playerCarry[profile.id] : undefined;

  return {
    ...profile,
    side,
    x,
    y: slot.y,
    baseX: x,
    baseY: slot.y,
    targetX: x,
    targetY: slot.y,
    currentStamina: carry?.stamina ?? 100,
    condition: carry?.condition ?? 92,
    managerTrust: carry?.managerTrust ?? 72,
    card: "NONE",
    injuryRisk: carry?.injuryMatchesRemaining ? 0.2 : 0.04,
    injured: false,
    onField: true,
  };
};

const availableKoreaPlayers = (campaign: CampaignState): PlayerProfile[] => {
  const available = TEAMS.KOR.roster.filter((player) => {
    const carry = campaign.playerCarry[player.id];
    return (
      !carry ||
      (carry.suspendedMatches <= 0 && carry.injuryMatchesRemaining <= 0)
    );
  });
  const unavailable = TEAMS.KOR.roster.filter(
    (player) => !available.some((candidate) => candidate.id === player.id),
  );
  return [...available, ...unavailable].slice(0, 11);
};

export function createMatch(
  definition: MatchDefinition,
  campaign: CampaignState,
): MatchState {
  const homeTeam = TEAMS.KOR;
  const awayTeam = TEAMS[definition.opponentId];
  const homePlayers = availableKoreaPlayers(campaign).map((player, index) =>
    createMatchPlayer(player, "home", index, campaign),
  );
  const awayPlayers = awayTeam.roster
    .slice(0, 11)
    .map((player, index) => createMatchPlayer(player, "away", index));

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
    ball: { x: 0.5, y: 0.5, ownerSide: "home", zone: 0 },
    possession: "home",
    homeTactic: { ...homeTeam.defaultTactic },
    awayTactic: { ...awayTeam.defaultTactic },
    events: [kickoff],
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
): { player: MatchPlayer; state: number } => {
  const candidates = players.filter((player) => player.position !== "GK");
  const result = nextRandom(state);
  const player =
    candidates[Math.min(candidates.length - 1, Math.floor(result.value * candidates.length))];
  return { player, state: result.state };
};

function prependEvent(state: MatchState, event: MatchEvent): MatchState {
  return { ...state, events: [event, ...state.events].slice(0, 28) };
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
  const passChance = clamp(
    0.57 +
      (passQuality - defenseQuality) / 180 +
      attackTactic.tempo / 600 -
      defendTactic.pressing / 760 +
      (attackTactic.preparedPlanActive ? 0.05 : 0),
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
    next.ball = {
      ...next.ball,
      ownerSide: opponentSide,
      zone: Math.max(0, 2 - next.ball.zone),
      x: 1 - next.ball.x,
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
        : 0.35 + sideRoll.value * 0.3;
  const newZone = Math.min(3, next.ball.zone + 1);
  const normalizedX = [0.18, 0.38, 0.64, 0.83][newZone];
  next.ball = {
    x: attackingSide === "home" ? normalizedX : 1 - normalizedX,
    y,
    ownerSide: attackingSide,
    zone: newZone,
  };

  if (
    attackingSide === "home" &&
    (attackTactic.attackSide === "right" || y > 0.62)
  ) {
    next.metrics.homeRightThreat += 1;
  }
  if (
    attackingSide === "away" &&
    (attackTactic.attackSide === "right" || y > 0.62)
  ) {
    next.metrics.awayRightThreat += 1;
  }

  const shotRoll = nextRandom(randomState);
  randomState = shotRoll.state;
  const shotChance =
    newZone >= 3
      ? 0.46 + attackTactic.tempo / 500
      : newZone === 2
        ? 0.11
        : 0;

  if (shotRoll.value < shotChance) {
    const attackers = activePlayers(next, attackingSide);
    const shooterPick = randomAttacker(attackers, randomState);
    randomState = shooterPick.state;
    const shooter = shooterPick.player;
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

    if (goalRoll.value < goalChance) {
      next.score[attackingSide] += 1;
      next = prependEvent(next, {
        id: `${next.id}-goal-${minute}-${next.events.length}`,
        minute,
        type: "GOAL",
        side: attackingSide,
        text: `골! ${teamName(next, attackingSide)}의 ${shooter.name}가 마무리합니다.`,
        emphasis: "danger",
      });
      next.possession = defendingSide;
      next.ball = {
        x: 0.5,
        y: 0.5,
        ownerSide: defendingSide,
        zone: 0,
      };
    } else {
      next.possession = defendingSide;
      next.ball = {
        x: 0.5,
        y: 0.5,
        ownerSide: defendingSide,
        zone: 0,
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
      injuryRisk: Math.min(
        0.45,
        player.injuryRisk + (player.currentStamina < 45 ? seconds * 0.0007 : 0),
      ),
    };
  });
  return { ...state, players };
}

function updatePlayerTargets(state: MatchState): MatchState {
  const players = state.players.map((player) => {
    if (!player.onField) return player;
    const tactic = tacticFor(state, player.side);
    const hasBall = state.possession === player.side;
    const direction = player.side === "home" ? 1 : -1;
    const possessionShift = hasBall
      ? 0.035 + state.ball.zone * 0.018
      : -0.025;
    const lineShift =
      player.position === "DF"
        ? direction * ((tactic.defensiveLine - 50) / 520)
        : 0;
    const widthScale = 1 + (tactic.width - 50) / 180;
    const targetY = clamp(0.5 + (player.baseY - 0.5) * widthScale, 0.08, 0.92);
    const targetX = clamp(
      player.baseX + direction * possessionShift + lineShift,
      0.05,
      0.95,
    );
    return {
      ...player,
      targetX,
      targetY,
      x: player.x + (targetX - player.x) * 0.16,
      y: player.y + (targetY - player.y) * 0.16,
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

export function continueMatch(state: MatchState): MatchState {
  const nextPhase: Partial<Record<MatchPhase, MatchPhase>> = {
    HYDRATION_FIRST: "OBSERVE_22_45",
    HALF_TIME: "OBSERVE_45_67",
    HYDRATION_SECOND: "OBSERVE_67_90",
  };
  const phase = nextPhase[state.phase];
  if (!phase) return state;

  return {
    ...state,
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
            : "브레이크가 끝났습니다. 전달한 지시만 경기장에 남습니다.",
        emphasis: "important",
      },
      ...state.events,
    ],
  };
}

export function applyHalfTimeRecovery(state: MatchState): MatchState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.side === "home" && player.onField
        ? {
            ...player,
            currentStamina: Math.min(100, player.currentStamina + 12),
          }
        : player,
    ),
  };
}

export function moveHomePlayer(
  state: MatchState,
  playerId: string,
  x: number,
  y: number,
): MatchState {
  if (state.phase !== "PRE_MATCH") return state;
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
    metrics: state.metrics,
    playerStates: state.players,
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
