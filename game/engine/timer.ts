export function calculateBreakRemaining(
  startedAt: number,
  now: number,
  commandSeconds = 0,
): number {
  const naturalDecrease = Math.floor((now - startedAt) / 1000) * 3;
  return Math.max(
    0,
    Math.min(180, 180 - naturalDecrease - Math.max(0, commandSeconds)),
  );
}
