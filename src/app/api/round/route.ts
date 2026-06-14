import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPlayerByToken } from "@/lib/auth";
import { dealCard } from "@/lib/deck";
import { dbErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";

// Deal a new round for the player. If they already have an open round, return
// it instead (no re-rolling).
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

    const open = await prisma.round.findFirst({
      where: { playerId: player.id, status: "DEALT" },
      orderBy: { dealtAt: "desc" },
    });
    if (open) {
      return NextResponse.json({ round: roundPayload(open) });
    }

    const card = dealCard();
    const round = await prisma.round.create({
      data: {
        roomId: player.roomId,
        playerId: player.id,
        objectCard: card.objectCard,
        lensCard: card.lensCard,
        difficulty: card.difficulty,
      },
    });

    return NextResponse.json({ round: roundPayload(round) });
  } catch (err) {
    return dbErrorResponse(err);
  }
}

function roundPayload(r: {
  id: string;
  objectCard: string;
  lensCard: string;
  difficulty: string;
  dealtAt: Date;
}) {
  return {
    id: r.id,
    objectCard: r.objectCard,
    lensCard: r.lensCard,
    difficulty: r.difficulty,
    dealtAt: r.dealtAt.toISOString(),
  };
}
