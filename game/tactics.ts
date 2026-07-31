import type {
  AttackSide,
  TacticLoadout,
  TacticPresetId,
  TacticState,
} from "./types";

export const DEFAULT_TACTIC_LOADOUT: TacticLoadout = {
  main: "BALANCED_433",
  sub1: "COUNTER_442",
  sub2: "BLOCK_541",
};

export interface TacticPreset {
  id: TacticPresetId;
  name: string;
  formation: TacticState["formation"];
  summary: string;
  risk: string;
  pressing: number;
  defensiveLine: number;
  tempo: number;
  width: number;
  attackSide: AttackSide;
  slots: Array<{ x: number; y: number }>;
}

export const TACTIC_PRESETS: TacticPreset[] = [
  {
    id: "BALANCED_433",
    name: "균형 전개",
    formation: "4-3-3",
    summary: "중원 삼각형과 양쪽 윙을 활용하는 기본 플랜",
    risk: "공수 균형",
    pressing: 55,
    defensiveLine: 52,
    tempo: 58,
    width: 62,
    attackSide: "center",
    slots: [
      { x: 0.08, y: 0.5 },
      { x: 0.2, y: 0.14 }, { x: 0.18, y: 0.38 },
      { x: 0.18, y: 0.62 }, { x: 0.2, y: 0.86 },
      { x: 0.4, y: 0.28 }, { x: 0.36, y: 0.5 }, { x: 0.4, y: 0.72 },
      { x: 0.65, y: 0.2 }, { x: 0.7, y: 0.5 }, { x: 0.65, y: 0.8 },
    ],
  },
  {
    id: "CONTROL_4231",
    name: "중원 장악",
    formation: "4-2-3-1",
    summary: "더블 볼란치와 2선 세 명으로 점유율을 확보",
    risk: "안정적 점유",
    pressing: 52,
    defensiveLine: 50,
    tempo: 50,
    width: 56,
    attackSide: "center",
    slots: [
      { x: 0.08, y: 0.5 },
      { x: 0.2, y: 0.14 }, { x: 0.18, y: 0.38 },
      { x: 0.18, y: 0.62 }, { x: 0.2, y: 0.86 },
      { x: 0.36, y: 0.38 }, { x: 0.36, y: 0.62 },
      { x: 0.54, y: 0.2 }, { x: 0.52, y: 0.5 }, { x: 0.54, y: 0.8 },
      { x: 0.72, y: 0.5 },
    ],
  },
  {
    id: "COUNTER_442",
    name: "빠른 역습",
    formation: "4-4-2",
    summary: "두 줄 수비 뒤 두 공격수에게 빠르게 전진",
    risk: "중원 수적 열세",
    pressing: 42,
    defensiveLine: 40,
    tempo: 76,
    width: 68,
    attackSide: "right",
    slots: [
      { x: 0.08, y: 0.5 },
      { x: 0.2, y: 0.14 }, { x: 0.18, y: 0.38 },
      { x: 0.18, y: 0.62 }, { x: 0.2, y: 0.86 },
      { x: 0.42, y: 0.18 }, { x: 0.4, y: 0.4 },
      { x: 0.4, y: 0.6 }, { x: 0.42, y: 0.82 },
      { x: 0.68, y: 0.38 }, { x: 0.68, y: 0.62 },
    ],
  },
  {
    id: "PRESS_343",
    name: "전방 압박",
    formation: "3-4-3",
    summary: "수비선을 끌어올리고 전방부터 강하게 압박",
    risk: "뒷공간 위험",
    pressing: 82,
    defensiveLine: 76,
    tempo: 72,
    width: 72,
    attackSide: "left",
    slots: [
      { x: 0.08, y: 0.5 },
      { x: 0.22, y: 0.28 }, { x: 0.2, y: 0.5 }, { x: 0.22, y: 0.72 },
      { x: 0.42, y: 0.14 }, { x: 0.4, y: 0.4 },
      { x: 0.4, y: 0.6 }, { x: 0.42, y: 0.86 },
      { x: 0.68, y: 0.2 }, { x: 0.72, y: 0.5 }, { x: 0.68, y: 0.8 },
    ],
  },
  {
    id: "BLOCK_541",
    name: "수비 잠금",
    formation: "5-4-1",
    summary: "페널티 지역 앞을 촘촘하게 막고 실점을 억제",
    risk: "공격 지원 부족",
    pressing: 30,
    defensiveLine: 28,
    tempo: 43,
    width: 48,
    attackSide: "center",
    slots: [
      { x: 0.08, y: 0.5 },
      { x: 0.19, y: 0.1 }, { x: 0.17, y: 0.3 }, { x: 0.16, y: 0.5 },
      { x: 0.17, y: 0.7 }, { x: 0.19, y: 0.9 },
      { x: 0.4, y: 0.18 }, { x: 0.38, y: 0.4 },
      { x: 0.38, y: 0.6 }, { x: 0.4, y: 0.82 },
      { x: 0.65, y: 0.5 },
    ],
  },
];

export const tacticPresetById = (id: TacticPresetId): TacticPreset =>
  TACTIC_PRESETS.find((preset) => preset.id === id) ?? TACTIC_PRESETS[0];
