import type {
  AppliedCommand,
  CommandDefinition,
  CommandKind,
  MatchPlayer,
  MatchState,
  TacticState,
} from "../types";
import { clamp, nextRandom } from "./random";

export const COMMANDS: Record<CommandKind, CommandDefinition> = {
  PREPARED_PLAN: {
    kind: "PREPARED_PLAN",
    label: "예비 전술 전환",
    category: "예비 전술",
    description: "경기 전에 합의한 측면 전환 플랜을 적용합니다.",
    minCost: 32,
    maxCost: 48,
    needsPlayer: false,
    effect: "공격 방향 전환과 패스 안정성이 상승합니다.",
    tradeoff: "전환 과정에서 일시적으로 공격 템포가 낮아집니다.",
  },
  PRESS_HIGHER: {
    kind: "PRESS_HIGHER",
    label: "압박 강도 높이기",
    category: "팀 지시",
    description: "상대 진영부터 더 적극적으로 공을 되찾습니다.",
    minCost: 28,
    maxCost: 42,
    needsPlayer: false,
    effect: "공 탈취 확률과 상대 실수 빈도가 상승합니다.",
    tradeoff: "체력 소모와 파울 위험이 함께 증가합니다.",
  },
  LOWER_LINE: {
    kind: "LOWER_LINE",
    label: "수비 라인 내리기",
    category: "라인 지시",
    description: "최종 수비 라인을 내려 뒷공간을 보호합니다.",
    minCost: 20,
    maxCost: 30,
    needsPlayer: false,
    effect: "상대 침투와 역습의 위력이 감소합니다.",
    tradeoff: "중원 압박과 공격 전개 거리가 길어집니다.",
  },
  ATTACK_WIDE: {
    kind: "ATTACK_WIDE",
    label: "공격 방향 전환",
    category: "팀 지시",
    description: "혼잡한 중앙 대신 넓은 측면을 우선 공략합니다.",
    minCost: 28,
    maxCost: 42,
    needsPlayer: false,
    effect: "상대 압박을 우회하고 측면 진입 빈도가 증가합니다.",
    tradeoff: "중앙에서 바로 슈팅으로 이어지는 빈도가 감소합니다.",
  },
  WINGER_TRACK: {
    kind: "WINGER_TRACK",
    label: "윙어 수비 가담",
    category: "개인 지시",
    description: "선택한 윙어에게 상대 풀백을 끝까지 추적하게 합니다.",
    minCost: 12,
    maxCost: 18,
    needsPlayer: true,
    effect: "측면 수비와 수적 균형이 안정됩니다.",
    tradeoff: "선택 선수의 체력 소모와 역습 속도가 저하됩니다.",
  },
  CENTRAL_RUN: {
    kind: "CENTRAL_RUN",
    label: "중앙 침투",
    category: "개인 지시",
    description: "선택한 공격수에게 센터백 뒤 공간을 반복해서 노리게 합니다.",
    minCost: 12,
    maxCost: 18,
    needsPlayer: true,
    effect: "중앙 슈팅과 결정적인 침투 빈도가 증가합니다.",
    tradeoff: "측면 폭과 수비 전환 참여가 줄어듭니다.",
  },
  CONSERVE_ENERGY: {
    kind: "CONSERVE_ENERGY",
    label: "체력 안배",
    category: "개인 지시",
    description: "선택한 선수의 불필요한 스프린트를 줄입니다.",
    minCost: 12,
    maxCost: 18,
    needsPlayer: true,
    effect: "선택 선수의 이후 체력 소모가 감소합니다.",
    tradeoff: "압박 범위와 공격 가담이 소폭 감소합니다.",
  },
  CAPTAIN_RALLY: {
    kind: "CAPTAIN_RALLY",
    label: "주장에게 결속 요청",
    category: "주장·사기",
    description: "주장에게 집중력과 수비 간격 정리를 위임합니다.",
    minCost: 24,
    maxCost: 36,
    needsPlayer: false,
    effect: "팀 집중력과 패스 안정성이 소폭 상승합니다.",
    tradeoff: "구체적인 전술 문제 하나를 직접 해결하지는 못합니다.",
  },
};

interface CostContext {
  player?: MatchPlayer;
  averageUnderstanding: number;
  averageTrust: number;
  prepared: boolean;
  randomState: number;
}

export interface CommandCostResult {
  cost: number;
  randomState: number;
}

export function calculateCommandCost(
  definition: CommandDefinition,
  context: CostContext,
): CommandCostResult {
  const understanding =
    context.player?.attributes.tacticalUnderstanding ??
    context.averageUnderstanding;
  const trust = context.player?.managerTrust ?? context.averageTrust;
  const familiarity =
    context.player?.attributes.roleFamiliarity ?? context.averageUnderstanding;
  const complexity =
    definition.kind === "PREPARED_PLAN"
      ? 0.35
      : definition.category === "개인 지시"
        ? 0.42
        : 0.68;

  const difficulty =
    0.35 * (1 - understanding / 100) +
    0.2 * (1 - trust / 100) +
    0.2 * (1 - familiarity / 100) +
    0.25 * complexity -
    (context.prepared ? 0.2 : 0);

  const random = nextRandom(context.randomState);
  const smallVariation = (random.value - 0.5) * 0.12;
  const ratio = clamp(0.35 + difficulty + smallVariation);
  const cost = Math.round(
    definition.minCost +
      (definition.maxCost - definition.minCost) * ratio,
  );

  return {
    cost: Math.min(definition.maxCost, Math.max(definition.minCost, cost)),
    randomState: random.state,
  };
}

const updateTactic = (
  tactic: TacticState,
  kind: CommandKind,
): TacticState => {
  switch (kind) {
    case "PREPARED_PLAN":
      return {
        ...tactic,
        preparedPlanActive: true,
        attackSide: "right",
        width: Math.min(82, tactic.width + 16),
        tempo: Math.max(48, tactic.tempo - 4),
      };
    case "PRESS_HIGHER":
      return {
        ...tactic,
        pressing: Math.min(88, tactic.pressing + 18),
        defensiveLine: Math.min(72, tactic.defensiveLine + 8),
      };
    case "LOWER_LINE":
      return {
        ...tactic,
        defensiveLine: Math.max(28, tactic.defensiveLine - 18),
        pressing: Math.max(38, tactic.pressing - 6),
      };
    case "ATTACK_WIDE":
      return {
        ...tactic,
        width: Math.min(86, tactic.width + 20),
        attackSide: tactic.attackSide === "left" ? "right" : "left",
      };
    case "CAPTAIN_RALLY":
      return {
        ...tactic,
        tempo: Math.max(48, tactic.tempo - 3),
      };
    default:
      return tactic;
  }
};

export function applyCommand(
  state: MatchState,
  kind: CommandKind,
  targetPlayerId: string | undefined,
  cost: number,
): MatchState {
  const definition = COMMANDS[kind];
  const target = targetPlayerId
    ? state.players.find((player) => player.id === targetPlayerId)
    : undefined;
  const command: AppliedCommand = {
    id: `command-${state.commands.length + 1}-${Math.round(state.gameMinute)}`,
    kind,
    label: definition.label,
    targetPlayerId,
    cost,
    minute: Math.round(state.gameMinute),
    effect: definition.effect,
    tradeoff: definition.tradeoff,
  };

  const players = state.players.map((player) => {
    if (player.id !== targetPlayerId) return player;

    if (kind === "CONSERVE_ENERGY") {
      return {
        ...player,
        currentStamina: Math.min(100, player.currentStamina + 5),
      };
    }

    if (kind === "WINGER_TRACK") {
      return {
        ...player,
        baseX: Math.max(0.34, player.baseX - 0.08),
        baseY: player.baseY > 0.5 ? 0.8 : 0.2,
      };
    }

    if (kind === "CENTRAL_RUN") {
      return {
        ...player,
        baseX: Math.min(0.76, player.baseX + 0.07),
        baseY: 0.5,
      };
    }

    return player;
  });

  const event = {
    id: `event-tactic-${state.commands.length + 1}`,
    minute: Math.round(state.gameMinute),
    type: "TACTIC" as const,
    side: "home" as const,
    text: `${target ? `${target.name}에게 ` : ""}${definition.label} 지시를 전달했습니다.`,
    emphasis: "important" as const,
  };

  return {
    ...state,
    players,
    homeTactic: updateTactic(state.homeTactic, kind),
    commands: [...state.commands, command],
    events: [event, ...state.events].slice(0, 24),
  };
}
