import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin, mintToken, formatToken } from "@/lib/auth";

export const runtime = "nodejs";

// Admin actions on a single player: reset their token, adjust score, or delete.
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  let body: { playerId?: string; action?: string; value?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const player = await prisma.player.findUnique({
    where: { id: body.playerId ?? "" },
  });
  if (!player) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  switch (body.action) {
    case "reset-token": {
      const token = mintToken();
      await prisma.player.update({
        where: { id: player.id },
        data: { token },
      });
      return NextResponse.json({ token, tokenDisplay: formatToken(token) });
    }
    case "set-score": {
      const value = Math.max(0, Math.round(Number(body.value ?? 0)));
      await prisma.player.update({
        where: { id: player.id },
        data: { totalScore: value },
      });
      return NextResponse.json({ totalScore: value });
    }
    case "delete": {
      await prisma.player.delete({ where: { id: player.id } });
      return NextResponse.json({ deleted: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
}
