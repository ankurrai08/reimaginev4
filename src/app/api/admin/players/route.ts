import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin, formatToken } from "@/lib/auth";

export const runtime = "nodejs";

// Search players by name or room code. Admin-only. Returns tokens so an admin
// can read a forgotten token back to a player.
export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  const players = await prisma.player.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { room: { code: { contains: q.toUpperCase(), mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: { room: true, _count: { select: { badges: true } } },
    orderBy: [{ room: { code: "asc" } }, { totalScore: "desc" }],
    take: 100,
  });

  return NextResponse.json({
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      discipline: p.discipline,
      roomCode: p.room.code,
      totalScore: p.totalScore,
      roundsPlayed: p.roundsPlayed,
      badgeCount: p._count.badges,
      token: p.token,
      tokenDisplay: formatToken(p.token),
    })),
  });
}
