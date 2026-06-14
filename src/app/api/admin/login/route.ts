import { NextResponse } from "next/server";
import {
  verifyAdminPassword,
  setAdminCookie,
  clearAdminCookie,
  isAdmin,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ authed: await isAdmin() });
}

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Admin portal is disabled. Set ADMIN_PASSWORD and redeploy." },
      { status: 503 },
    );
  }
  if (!verifyAdminPassword(body.password ?? "")) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  await setAdminCookie();
  return NextResponse.json({ authed: true });
}

export async function DELETE() {
  await clearAdminCookie();
  return NextResponse.json({ authed: false });
}
