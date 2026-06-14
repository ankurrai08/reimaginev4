import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mintToken, getPlayerByToken } from "@/lib/auth";
import { serializePlayer } from "@/lib/serialize";
import { DISCIPLINES, type DisciplineKey } from "@/lib/constants";

export const runtime = "nodejs";

function normCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "-").slice(0, 40);
}

export async function POST(request: Request) {
  let body: {
    name?: string;
    discipline?: string;
    roomCode?: string;
    token?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Re-link path: a returning player who already has a token.
  if (body.token) {
    const existing = await getPlayerByToken(body.token);
    if (!existing) {
      return NextResponse.json(
        { error: "That token doesn't match any player." },
        { status: 404 },
      );
    }
    return NextResponse.json({
      token: existing.token,
      player: serializePlayer(existing),
    });
  }

  const name = (body.name ?? "").trim().slice(0, 40);
  const discipline = body.discipline as DisciplineKey;
  const roomCode = normCode(body.roomCode ?? "");

  if (!name) {
    return NextResponse.json({ error: "Enter a display name." }, { status: 400 });
  }
  if (!discipline || !(discipline in DISCIPLINES)) {
    return NextResponse.json({ error: "Pick a discipline." }, { status: 400 });
  }
  if (!roomCode) {
    return NextResponse.json({ error: "Enter a room code." }, { status: 400 });
  }

  const room = await prisma.room.upsert({
    where: { code: roomCode },
    create: { code: roomCode },
    update: {},
  });

  // Is the name already taken in this room?
  const clash = await prisma.player.findUnique({
    where: { roomId_name: { roomId: room.id, name } },
  });
  if (clash) {
    return NextResponse.json(
      {
        error:
          "That name is taken in this room. If it's you, use \"I already have a token\" to rejoin.",
      },
      { status: 409 },
    );
  }

  const token = mintToken();
  const player = await prisma.player.create({
    data: { roomId: room.id, name, discipline, token },
    include: { badges: true },
  });

  return NextResponse.json({
    token,
    player: serializePlayer(player, roomCode),
  });
}
