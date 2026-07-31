import {
  GROUP_A_FORMATIONS_2026,
  GROUP_A_ROSTERS_2026,
} from "./rosters2026";
import type {
  MatchDefinition,
  Position,
  TeamDefinition,
  TeamId,
  TacticState,
} from "./types";

export interface FormationSlot {
  position: Position;
  x: number;
  y: number;
}

export const FORMATION_433: FormationSlot[] = [
  { position: "GK", x: 0.08, y: 0.5 },
  { position: "DF", x: 0.22, y: 0.16 },
  { position: "DF", x: 0.19, y: 0.38 },
  { position: "DF", x: 0.19, y: 0.62 },
  { position: "DF", x: 0.22, y: 0.84 },
  { position: "MF", x: 0.4, y: 0.28 },
  { position: "MF", x: 0.36, y: 0.5 },
  { position: "MF", x: 0.4, y: 0.72 },
  { position: "FW", x: 0.65, y: 0.18 },
  { position: "FW", x: 0.7, y: 0.5 },
  { position: "FW", x: 0.65, y: 0.82 },
];

const defaultTactic = (
  overrides: Partial<TacticState> = {},
): TacticState => ({
  formation: "4-3-3",
  pressing: 52,
  defensiveLine: 50,
  tempo: 54,
  width: 55,
  attackSide: "center",
  preparedPlan: "측면 전환",
  preparedPlanActive: false,
  ...overrides,
});

export const TEAMS: Record<TeamId, TeamDefinition> = {
  KOR: {
    id: "KOR",
    name: "대한민국",
    shortName: "KOR",
    color: "#e63946",
    accent: "#f6f2e9",
    styleName: "빠른 전환",
    styleDescription: "기동력과 측면 전환을 활용하는 균형형 팀",
    coachHint: "중앙을 단단히 지키고 빠르게 공격 방향을 바꾸는 것이 핵심입니다.",
    formationName: GROUP_A_FORMATIONS_2026.KOR,
    defaultTactic: defaultTactic(),
    roster: GROUP_A_ROSTERS_2026.KOR,
  },
  CZE: {
    id: "CZE",
    name: "체코",
    shortName: "CZE",
    color: "#f4f7fb",
    accent: "#d7141a",
    styleName: "제공권과 중앙 압박",
    styleDescription: "강한 체격과 제공권을 앞세워 중앙에서 주도권을 노립니다.",
    coachHint: "장신 공격수에게 향하는 첫 패스를 끊고 세컨드 볼을 선점하세요.",
    formationName: GROUP_A_FORMATIONS_2026.CZE,
    defaultTactic: defaultTactic({
      pressing: 66,
      defensiveLine: 58,
      tempo: 56,
      width: 46,
      attackSide: "center",
    }),
    roster: GROUP_A_ROSTERS_2026.CZE,
  },
  MEX: {
    id: "MEX",
    name: "멕시코",
    shortName: "MEX",
    color: "#24a148",
    accent: "#f7f3e8",
    styleName: "측면 수적 우위",
    styleDescription: "높은 점유율과 빠른 패스로 측면에서 수적 우위를 만듭니다.",
    coachHint: "공을 빼앗은 직후 상대 풀백 뒤 공간을 빠르게 공략하세요.",
    formationName: GROUP_A_FORMATIONS_2026.MEX,
    defaultTactic: defaultTactic({
      pressing: 60,
      defensiveLine: 56,
      tempo: 66,
      width: 76,
      attackSide: "right",
    }),
    roster: GROUP_A_ROSTERS_2026.MEX,
  },
  RSA: {
    id: "RSA",
    name: "남아프리카공화국",
    shortName: "RSA",
    color: "#f6c900",
    accent: "#007749",
    styleName: "속도와 역습",
    styleDescription: "빠른 측면 공격수와 직선적인 전환으로 뒷공간을 노립니다.",
    coachHint: "공격 시 뒤에 충분한 숫자를 남기고 역습 출발점을 먼저 차단하세요.",
    formationName: GROUP_A_FORMATIONS_2026.RSA,
    defaultTactic: defaultTactic({
      pressing: 43,
      defensiveLine: 40,
      tempo: 70,
      width: 62,
      attackSide: "left",
    }),
    roster: GROUP_A_ROSTERS_2026.RSA,
  },
};

export const MATCH_DEFINITIONS: MatchDefinition[] = [
  {
    id: "group-1",
    round: 1,
    opponentId: "CZE",
    title: "첫 번째 작전 · 체코의 높이를 넘어라",
    challenge: "제공권과 세컨드 볼이 강한 체코의 중앙 공격을 통제하세요.",
    briefing: [
      "체코는 장신 공격수와 미드필더의 박스 침투가 위협적입니다.",
      "무리한 전방 압박은 한 번의 롱패스로 수비 라인을 노출시킬 수 있습니다.",
      "공을 되찾으면 풀백 뒤 공간으로 빠르게 방향을 전환하세요.",
    ],
    seed: 1101,
    weather: "고온",
    referee: "균형",
    secondaryFixture: {
      home: "MEX",
      away: "RSA",
      homeGoals: 2,
      awayGoals: 0,
    },
  },
  {
    id: "group-2",
    round: 2,
    opponentId: "MEX",
    title: "두 번째 작전 · 개최국의 압박을 벗어나라",
    challenge: "멕시코의 점유와 측면 수적 우위를 견디며 역습 기회를 만드세요.",
    briefing: [
      "멕시코는 짧은 패스로 한쪽 측면에 수적 우위를 만듭니다.",
      "공을 빼앗은 직후 반대편 전환이 가장 효과적인 탈출구입니다.",
      "고온 환경에서 압박 강도를 계속 유지하면 후반 체력이 급격히 떨어집니다.",
    ],
    seed: 2202,
    weather: "고온",
    referee: "엄격함",
    secondaryFixture: {
      home: "CZE",
      away: "RSA",
      homeGoals: 1,
      awayGoals: 0,
    },
  },
  {
    id: "group-3",
    round: 3,
    opponentId: "RSA",
    title: "마지막 작전 · 역습의 속도를 잠가라",
    challenge: "남아공의 빠른 측면 역습을 막고 필요한 조별 순위를 확보하세요.",
    briefing: [
      "남아공은 낮은 위치에서 공을 되찾은 뒤 빠르게 측면으로 전진합니다.",
      "풀백이 동시에 전진하면 수비 전환 때 넓은 공간을 내줄 수 있습니다.",
      "조 순위에 따라 경기 막판 필요한 결과가 달라집니다.",
    ],
    seed: 3303,
    weather: "맑음",
    referee: "관대함",
    secondaryFixture: {
      home: "CZE",
      away: "MEX",
      homeGoals: 1,
      awayGoals: 2,
    },
  },
];
