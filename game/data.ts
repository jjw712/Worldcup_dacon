import type {
  MatchDefinition,
  PlayerAttributes,
  PlayerProfile,
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

const attributesFor = (
  position: Position,
  level: number,
  index: number,
): PlayerAttributes => {
  const variance = ((index * 7) % 9) - 4;
  return {
    passing: level + variance + (position === "MF" ? 5 : 0),
    shooting: level - 8 + variance + (position === "FW" ? 10 : 0),
    defending: level - 6 + variance + (position === "DF" ? 12 : 0),
    pace: level + variance + (position === "FW" ? 5 : 0),
    stamina: level + 3 + variance,
    tacticalUnderstanding: level + ((index * 3) % 7),
    roleFamiliarity: 70 + ((index * 5) % 18),
  };
};

function buildRoster(
  teamId: TeamId,
  names: string[],
  level: number,
): PlayerProfile[] {
  const positions: Position[] = [
    "GK",
    "DF",
    "DF",
    "DF",
    "DF",
    "MF",
    "MF",
    "MF",
    "FW",
    "FW",
    "FW",
    "GK",
    "DF",
    "MF",
    "FW",
  ];

  return names.map((name, index) => ({
    id: `${teamId}-${index + 1}`,
    teamId,
    name,
    number: index + 1,
    position: positions[index],
    attributes: attributesFor(positions[index], level, index),
  }));
}

const koreaNames = [
  "윤태석",
  "박시우",
  "김현준",
  "이도윤",
  "최강민",
  "정우진",
  "한지성",
  "오민재",
  "서준호",
  "강태윤",
  "임성호",
  "배준혁",
  "신도현",
  "문재원",
  "유승민",
];

const opponentNames = (prefix: string) =>
  Array.from({ length: 15 }, (_, index) => `${prefix} ${index + 1}번`);

export const TEAMS: Record<TeamId, TeamDefinition> = {
  KOR: {
    id: "KOR",
    name: "대한민국",
    shortName: "KOR",
    color: "#e63946",
    accent: "#f6f2e9",
    styleName: "빠른 전환",
    styleDescription: "기동력과 측면 전환을 활용하는 균형형 팀",
    coachHint: "중앙의 압박을 견디고 빠르게 방향을 바꾸는 것이 핵심입니다.",
    defaultTactic: defaultTactic(),
    roster: buildRoster("KOR", koreaNames, 74),
  },
  SEN: {
    id: "SEN",
    name: "세네갈",
    shortName: "SEN",
    color: "#f5c542",
    accent: "#157347",
    styleName: "낮은 블록과 역습",
    styleDescription: "중앙을 좁히고 순간적인 전진으로 뒷공간을 노립니다.",
    coachHint: "점유율에 안심하지 마십시오. 우리 풀백 뒤 공간을 기다리고 있습니다.",
    defaultTactic: defaultTactic({
      pressing: 40,
      defensiveLine: 34,
      tempo: 68,
      width: 46,
      attackSide: "right",
    }),
    roster: buildRoster("SEN", opponentNames("SEN"), 72),
  },
  DEN: {
    id: "DEN",
    name: "덴마크",
    shortName: "DEN",
    color: "#f8f8f8",
    accent: "#b10f2e",
    styleName: "강한 전방 압박",
    styleDescription: "중원부터 패스 길을 지우며 실수를 유도합니다.",
    coachHint: "첫 번째 패스가 막히면 같은 방향을 고집하지 말아야 합니다.",
    defaultTactic: defaultTactic({
      pressing: 78,
      defensiveLine: 68,
      tempo: 62,
      width: 58,
      attackSide: "center",
    }),
    roster: buildRoster("DEN", opponentNames("DEN"), 75),
  },
  MEX: {
    id: "MEX",
    name: "멕시코",
    shortName: "MEX",
    color: "#24a148",
    accent: "#f7f3e8",
    styleName: "측면 수적 우위",
    styleDescription: "풀백을 높이고 짧은 패스로 한쪽 측면을 과부하시킵니다.",
    coachHint: "공보다 반대편 윙어의 복귀 위치를 먼저 확인해야 합니다.",
    defaultTactic: defaultTactic({
      pressing: 58,
      defensiveLine: 55,
      tempo: 66,
      width: 76,
      attackSide: "right",
    }),
    roster: buildRoster("MEX", opponentNames("MEX"), 76),
  },
};

export const MATCH_DEFINITIONS: MatchDefinition[] = [
  {
    id: "group-1",
    round: 1,
    opponentId: "SEN",
    title: "첫 번째 작전 · 공간을 열어라",
    challenge: "낮은 수비 라인을 흔들고 역습의 대가를 관리하십시오.",
    briefing: [
      "상대는 중앙을 좁히고 측면 전환을 유도합니다.",
      "풀백이 동시에 올라가면 역습 위험이 크게 증가합니다.",
      "후반으로 갈수록 상대 수비진의 집중력이 떨어집니다.",
    ],
    seed: 1101,
    weather: "고온",
    referee: "균형",
    secondaryFixture: {
      home: "DEN",
      away: "MEX",
      homeGoals: 1,
      awayGoals: 1,
    },
  },
  {
    id: "group-2",
    round: 2,
    opponentId: "DEN",
    title: "두 번째 작전 · 압박을 벗어나라",
    challenge: "강한 전방 압박에서 첫 패스와 체력을 지켜야 합니다.",
    briefing: [
      "상대는 전반부터 강한 전방 압박을 사용합니다.",
      "수비형 미드필더의 체력 관리가 중요합니다.",
      "압박 뒤 측면 공간은 비교적 빠르게 열립니다.",
    ],
    seed: 2202,
    weather: "맑음",
    referee: "엄격함",
    secondaryFixture: {
      home: "MEX",
      away: "SEN",
      homeGoals: 2,
      awayGoals: 0,
    },
  },
  {
    id: "group-3",
    round: 3,
    opponentId: "MEX",
    title: "마지막 작전 · 우선순위를 정하라",
    challenge: "조 순위와 스코어를 보며 공격과 안정 중 하나를 선택하십시오.",
    briefing: [
      "상대 풀백과 윙어가 오른쪽에서 수적 우위를 만듭니다.",
      "측면을 막으면 중앙 침투가 늘어날 수 있습니다.",
      "조 순위에 따라 경기 막판 필요한 결과가 달라집니다.",
    ],
    seed: 3303,
    weather: "비",
    referee: "관대함",
    secondaryFixture: {
      home: "SEN",
      away: "DEN",
      homeGoals: 1,
      awayGoals: 2,
    },
  },
];
