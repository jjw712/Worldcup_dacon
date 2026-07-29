export function calculateBreakRemaining(
  startedAt: number,
  now: number,
  deductedSeconds: number,
): number {
  const naturalDecrease = Math.floor((now - startedAt) / 1000) * 3;
  return Math.max(0, 180 - naturalDecrease - deductedSeconds);
}
