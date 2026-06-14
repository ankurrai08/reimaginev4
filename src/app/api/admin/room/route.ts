import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

// Delete an entire room and everything in it (players, rounds, scores, badges).
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  let body: { code?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.action !== "delete") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const code = (body.code ?? "").trim().toUpperCase();
  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }
  await prisma.room.delete({ where: { id: room.id } });
  return NextResponse.json({ deleted: true });
}
