export interface RandomResult {
  value: number;
  state: number;
}

export function nextRandom(state: number): RandomResult {
  const nextState = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return {
    value: nextState / 4294967296,
    state: nextState,
  };
}

export function randomBetween(
  state: number,
  min: number,
  max: number,
): RandomResult {
  const result = nextRandom(state);
  return {
    value: min + (max - min) * result.value,
    state: result.state,
  };
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}
