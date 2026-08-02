import { describe, expect, it } from "vitest";
import { reportHeadline, type DecisionGrade } from "./ReportScreens";

describe("reportHeadline", () => {
  const cases: Array<{
    result: [number, number];
    grade: DecisionGrade;
    expected: readonly [string, string];
  }> = [
    {
      result: [3, 1],
      grade: "A",
      expected: ["탁월한 선택이", "승리를 완성했습니다."],
    },
    {
      result: [2, 0],
      grade: "B",
      expected: ["필요한 순간의 판단이", "승리로 이어졌습니다."],
    },
    {
      result: [1, 0],
      grade: "C",
      expected: ["승리를 거뒀지만,", "돌아볼 선택도 남았습니다."],
    },
    {
      result: [2, 2],
      grade: "B+",
      expected: ["좋은 판단으로", "귀중한 승점을 지켜냈습니다."],
    },
    {
      result: [1, 1],
      grade: "B",
      expected: ["치열한 승부 끝에", "승점 1점을 가져왔습니다."],
    },
    {
      result: [0, 0],
      grade: "C",
      expected: ["승점은 얻었지만,", "아쉬운 선택이 남았습니다."],
    },
    {
      result: [1, 2],
      grade: "B+",
      expected: ["결과는 아쉽지만,", "선택의 방향은 분명했습니다."],
    },
    {
      result: [0, 1],
      grade: "B",
      expected: ["패배 속에서도", "다음 경기를 위한 답을 찾았습니다."],
    },
    {
      result: [0, 3],
      grade: "C",
      expected: ["결과와 선택을", "차분히 되짚어볼 시간입니다."],
    },
  ];

  it.each(cases)(
    "$result with grade $grade uses the matching report copy",
    ({ result, grade, expected }) => {
      expect(reportHeadline(result[0], result[1], grade)).toEqual(expected);
    },
  );
});
