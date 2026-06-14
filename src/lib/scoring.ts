import { RUBRIC, BOSS_MULTIPLIER, type RubricKey } from "./constants";

export type Dimensions = Record<RubricKey, number>;

export function weightedTotal(d: Dimensions): number {
  return Math.round(RUBRIC.reduce((sum, dim) => sum + d[dim.key] * dim.weight, 0));
}

export function rawTotal(d: Dimensions): number {
  return RUBRIC.reduce((sum, dim) => sum + d[dim.key], 0);
}

/**
 * Points awarded for a round = weighted total, boosted by a boss multiplier
 * and a streak bonus (up to +50% for a 5-round streak going in).
 */
export function computePoints(
  weighted: number,
  difficulty: "NORMAL" | "BOSS",
  priorStreak: number,
): number {
  const boss = difficulty === "BOSS" ? BOSS_MULTIPLIER : 1;
  const streakBonus = 1 + Math.min(priorStreak, 5) * 0.1;
  return Math.round(weighted * boss * streakBonus);
}
