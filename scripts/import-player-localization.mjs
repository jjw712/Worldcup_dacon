import { readFile, writeFile } from "node:fs/promises";

const [, , sourcePath, destinationPath] = process.argv;
if (!sourcePath || !destinationPath) {
  throw new Error("Usage: node import-player-localization.mjs <source.txt> <destination.json>");
}

const sectionCodes = {
  대한민국: "kor",
  멕시코: "mex",
  체코: "cze",
  남아프리카공화국: "rsa",
};

const text = await readFile(sourcePath, "utf8");
const players = {};
let currentCode;

for (const rawLine of text.split(/\r?\n/)) {
  const line = rawLine.trim();
  const section = line.match(/^\[([^—]+)\s+—/);
  if (section) {
    currentCode = sectionCodes[section[1].trim()];
    continue;
  }
  if (!currentCode || !/^\d{2}\./.test(line)) continue;

  const parts = line.split(" | ");
  const identity = parts[0]?.match(/^(\d{2})\.\s+(.+)\s+\((.+)\)$/);
  const weight = parts[1]?.match(/^(\d+)kg$/);
  if (!identity || !weight) {
    throw new Error(`Could not parse player row: ${line}`);
  }

  const id = `${currentCode}_${identity[1]}`;
  players[id] = {
    name_ko: identity[2].trim(),
    original_name: identity[3].trim(),
    weight_kg: Number(weight[1]),
    weight_source: parts[2] ?? "",
    weight_url: parts[3] ?? "",
    weight_note: parts.slice(4).join(" | "),
  };
}

if (Object.keys(players).length !== 104) {
  throw new Error(`Expected 104 players, parsed ${Object.keys(players).length}`);
}

await writeFile(
  destinationPath,
  `${JSON.stringify(
    {
      metadata: {
        source_file: "wc26_group_a_player_weights.txt",
        snapshot: "2026-07-31",
        player_count: 104,
        disclaimer:
          "체중은 공개 프로필 및 게임 DB 등록값이며 실시간 실측값이 아닙니다.",
      },
      players,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
