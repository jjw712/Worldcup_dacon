"use client";

import { DEFAULT_TACTIC_LOADOUT, TACTIC_PRESETS } from "../tactics";
import type {
  MatchState,
  TacticLoadout,
  TacticPresetId,
} from "../types";

export function TacticPresetSelector({
  match,
  onAssign,
  compact = false,
}: {
  match: MatchState;
  onAssign: (slot: keyof TacticLoadout, presetId: TacticPresetId) => void;
  compact?: boolean;
}) {
  const tacticLoadout = match.tacticLoadout ?? DEFAULT_TACTIC_LOADOUT;
  return (
    <section className={`tactic-preset-selector ${compact ? "is-compact" : ""}`}>
      <div className="tactic-preset-heading">
        <span>TACTICAL PRESETS</span>
        <strong>전술 프리셋</strong>
        <small>
          주전술은 즉시 배치에 반영되고 서브 1·2는 경기 중 전환용으로 저장됩니다.
        </small>
      </div>
      <div className="tactic-preset-list">
        {TACTIC_PRESETS.map((preset) => {
          const assignedSlot =
            (Object.entries(tacticLoadout) as Array<
              [keyof TacticLoadout, TacticPresetId]
            >).find(([, presetId]) => presetId === preset.id)?.[0];
          return (
            <article
              key={preset.id}
              className={assignedSlot ? "is-active" : ""}
            >
              <span>
                <b>{preset.formation}</b>
                <strong>{preset.name}</strong>
              </span>
              <p>{preset.summary}</p>
              <small>
                압박 {preset.pressing} · 수비선 {preset.defensiveLine} · 템포{" "}
                {preset.tempo}
              </small>
              <em>{preset.risk}</em>
              <div className="tactic-slot-actions">
                {(["main", "sub1", "sub2"] as const).map((slot) => (
                  <span
                    key={slot}
                    role="button"
                    tabIndex={0}
                    className={assignedSlot === slot ? "is-assigned" : ""}
                    onClick={(event) => {
                      event.stopPropagation();
                      onAssign(slot, preset.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onAssign(slot, preset.id);
                      }
                    }}
                  >
                    {slot === "main" ? "주전술" : slot === "sub1" ? "서브 1" : "서브 2"}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function SubTacticSwitcher({
  match,
  onSwitch,
  costType = "none",
  disabled = false,
  availableBudget,
}: {
  match: MatchState;
  onSwitch: (slot: "sub1" | "sub2") => void;
  costType?: "seconds" | "ap" | "none";
  disabled?: boolean;
  availableBudget?: number;
}) {
  const tacticLoadout = match.tacticLoadout ?? DEFAULT_TACTIC_LOADOUT;
  const entries = [
    { slot: "sub1" as const, priority: "우선순위 1", cost: 18 },
    { slot: "sub2" as const, priority: "우선순위 2", cost: 32 },
  ];
  return (
    <section className="sub-tactic-switcher">
      <div className="tactic-preset-heading">
        <span>LOADED SUB TACTICS</span>
        <strong>서브 전술 전환</strong>
        <small>경기 전에 편성한 두 전술로만 변경할 수 있습니다.</small>
      </div>
      {entries.map(({ slot, priority, cost }) => {
        const preset = TACTIC_PRESETS.find(
          (item) => item.id === tacticLoadout[slot],
        )!;
        const active = match.homeTactic.presetId === preset.id;
        const requiredCost =
          costType === "ap" ? (slot === "sub1" ? 2 : 4) : cost;
        const displayCost =
          costType === "seconds"
            ? `${cost}초 소요`
            : costType === "ap"
              ? `${requiredCost} AP`
              : "즉시 전환";
        return (
          <button
            key={slot}
            type="button"
            className={active ? "is-active" : ""}
            disabled={
              disabled ||
              active ||
              (availableBudget !== undefined && availableBudget < requiredCost)
            }
            onClick={() => onSwitch(slot)}
          >
            <span>{priority}</span>
            <b>{preset.formation}</b>
            <strong>{preset.name}</strong>
            <p>{preset.summary}</p>
            <em>{active ? "현재 전술" : displayCost}</em>
          </button>
        );
      })}
    </section>
  );
}
