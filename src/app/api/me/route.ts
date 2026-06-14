import { NextResponse } from "next/server";
import { getPlayerByToken } from "@/lib/auth";
import { serializePlayer } from "@/lib/serialize";
import { dbErrorResponse } from "@/lib/errors";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// Auto-login: given a stored token, return the player's current state plus
// any open (unsubmitted) round so the UI can resume.
export async function POST(request: Request) {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const player = await getPlayerByToken(body.token);
    if (!player) {
      return NextResponse.json({ error: "Unknown token." }, { status: 404 });
    }

    const openRound = await prisma.round.findFirst({
      where: { playerId: player.id, status: "DEALT" },
      orderBy: { dealtAt: "desc" },
    });

    return NextResponse.json({
      player: serializePlayer(player),
      openRound: openRound
        ? {
            id: openRound.id,
            objectCard: openRound.objectCard,
            lensCard: openRound.lensCard,
            difficulty: openRound.difficulty,
            dealtAt: openRound.dealtAt.toISOString(),
          }
        : null,
    });
  } catch (err) {
    return dbErrorResponse(err);
  }
}
