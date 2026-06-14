import { prisma } from "./db";
import { STRONG_ROUND } from "./constants";
import type { Dimensions } from "./scoring";

export interface BadgeContext {
  playerId: string;
  dimensions: Dimensions;
  weighted: number;
  difficulty: "NORMAL" | "BOSS";
  newStreak: number;
  isFirstRound: boolean;
}

/**
 * Award any newly-earned badges for a scored round. Returns the badge types
 * that were freshly unlocked (so the UI can celebrate them).
 */
export async function evaluateBadges(ctx: BadgeContext): Promise<string[]> {
  const d = ctx.dimensions;
  const earned = new Set<string>();

  if (ctx.isFirstRound) earned.add("FIRST_PITCH");
  if (d.csImpact >= 9) earned.add("CUSTOMER_CHAMPION");
  if (d.aiNative >= 9) earned.add("AI_WHISPERER");
  if (d.strategicEdge >= 9) earned.add("MOAT_BUILDER");
  if (d.dataMeasurability >= 9) earned.add("DATA_DIVINER");
  if (Object.values(d).some((v) => v === 10)) earned.add("PERFECTIONIST");
  if (ctx.difficulty === "BOSS" && ctx.weighted >= STRONG_ROUND) {
    earned.add("BOSS_SLAYER");
  }
  if (ctx.newStreak >= 3) earned.add("HOT_STREAK");

  const newly: string[] = [];
  for (const type of earned) {
    try {
      await prisma.badge.create({ data: { playerId: ctx.playerId, type } });
      newly.push(type);
    } catch {
      // @@unique([playerId, type]) -> already earned, skip silently
    }
  }
  return newly;
}
