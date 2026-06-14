import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dbErrorResponse } from "@/lib/errors";
import type { DisciplineKey } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("room") ?? "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Missing room." }, { status: 400 });
  }

  try {
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        players: {
          include: { _count: { select: { badges: true } } },
          orderBy: [{ totalScore: "desc" }, { roundsPlayed: "asc" }],
        },
      },
    });

    if (!room) {
      return NextResponse.json({ room: code, players: [], teams: [] });
    }

    const players = room.players.map((p, i) => ({
      rank: i + 1,
      name: p.name,
      discipline: p.discipline as DisciplineKey,
      totalScore: p.totalScore,
      roundsPlayed: p.roundsPlayed,
      streak: p.streak,
      badgeCount: p._count.badges,
    }));

    const teamMap: Record<string, { total: number; players: number }> = {};
    for (const p of room.players) {
      const key = p.discipline;
      teamMap[key] ??= { total: 0, players: 0 };
      teamMap[key].total += p.totalScore;
      teamMap[key].players += 1;
    }
    const teams = Object.entries(teamMap)
      .map(([discipline, v]) => ({
        discipline: discipline as DisciplineKey,
        total: v.total,
        players: v.players,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({ room: code, players, teams });
  } catch (err) {
    return dbErrorResponse(err);
  }
}
