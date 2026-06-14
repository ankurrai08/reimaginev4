import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPlayerByToken } from "@/lib/auth";
import { judge, JudgeError } from "@/lib/judge";
import { weightedTotal, rawTotal, computePoints } from "@/lib/scoring";
import { evaluateBadges } from "@/lib/badges";
import { serializePlayer } from "@/lib/serialize";
import { STRONG_ROUND } from "@/lib/constants";

export const runtime = "nodejs";
// The AI judge can take a while at high effort.
export const maxDuration = 60;

function clean(s: unknown, max = 1500): string {
  return typeof s === "string" ? s.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  let body: {
    token?: string;
    roundId?: string;
    whatItIs?: string;
    aiCentral?: string;
    customerService?: string;
    dataLoop?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const player = await getPlayerByToken(body.token);
  if (!player) {
    return NextResponse.json({ error: "Unknown token." }, { status: 404 });
  }

  const round = await prisma.round.findUnique({
    where: { id: body.roundId ?? "" },
  });
  if (!round || round.playerId !== player.id) {
    return NextResponse.json({ error: "Round not found." }, { status: 404 });
  }
  if (round.status !== "DEALT") {
    return NextResponse.json(
      { error: "This round was already submitted." },
      { status: 409 },
    );
  }

  const whatItIs = clean(body.whatItIs);
  const aiCentral = clean(body.aiCentral);
  const customerService = clean(body.customerService);
  const dataLoop = clean(body.dataLoop);

  if (whatItIs.length < 10 || aiCentral.length < 10 || customerService.length < 10) {
    return NextResponse.json(
      {
        error:
          "Give each of the first three answers at least a sentence — the judge needs something to work with.",
      },
      { status: 400 },
    );
  }

  // Judge FIRST so a judge failure leaves the round replayable (no orphan submission).
  let result;
  try {
    result = await judge({
      objectCard: round.objectCard,
      lensCard: round.lensCard,
      difficulty: round.difficulty,
      whatItIs,
      aiCentral,
      customerService,
      dataLoop,
    });
  } catch (err) {
    if (err instanceof JudgeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "The AI judge failed unexpectedly. Please retry." },
      { status: 502 },
    );
  }

  const d = result.dimensions;
  const weighted = weightedTotal(d);
  const raw = rawTotal(d);
  const priorStreak = player.streak;
  const points = computePoints(weighted, round.difficulty, priorStreak);
  const strong = weighted >= STRONG_ROUND;
  const newStreak = strong ? priorStreak + 1 : 0;
  const isFirstRound = player.roundsPlayed === 0;

  await prisma.$transaction(async (tx) => {
    const submission = await tx.submission.create({
      data: {
        roundId: round.id,
        whatItIs,
        aiCentral,
        customerService,
        dataLoop,
      },
    });
    await tx.score.create({
      data: {
        submissionId: submission.id,
        csImpact: d.csImpact,
        aiNative: d.aiNative,
        desirability: d.desirability,
        strategicEdge: d.strategicEdge,
        dataMeasurability: d.dataMeasurability,
        creativity: d.creativity,
        rawTotal: raw,
        weightedTotal: weighted,
        pointsAwarded: points,
        verdict: result.verdict,
        feedback: result.feedback,
      },
    });
    await tx.round.update({
      where: { id: round.id },
      data: { status: "SCORED" },
    });
    await tx.player.update({
      where: { id: player.id },
      data: {
        totalScore: { increment: points },
        roundsPlayed: { increment: 1 },
        streak: newStreak,
      },
    });
  });

  const newBadges = await evaluateBadges({
    playerId: player.id,
    dimensions: d,
    weighted,
    difficulty: round.difficulty,
    newStreak,
    isFirstRound,
  });

  const refreshed = await prisma.player.findUnique({
    where: { id: player.id },
    include: { room: true, badges: true },
  });

  return NextResponse.json({
    score: {
      dimensions: d,
      rawTotal: raw,
      weightedTotal: weighted,
      pointsAwarded: points,
      verdict: result.verdict,
      feedback: result.feedback,
      difficulty: round.difficulty,
      streak: newStreak,
    },
    newBadges,
    player: refreshed ? serializePlayer(refreshed) : serializePlayer(player),
  });
}
