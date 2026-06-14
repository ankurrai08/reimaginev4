import { NextResponse } from "next/server";

/**
 * Map a thrown DB/Prisma error to a helpful JSON response. Logs the full error
 * server-side (visible in `npm run dev` output or Vercel logs).
 */
export function dbErrorResponse(err: unknown): NextResponse {
  console.error("[reimaginai] DB error:", err);

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not set. Add it to your environment and redeploy." },
      { status: 503 },
    );
  }

  // Prisma surfaces the underlying code on `.code` (e.g. "ECONNREFUSED",
  // "P1001") and often leaves `.message` blank — inspect both.
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : "";
  const msg = `${code} ${err instanceof Error ? err.message : String(err)}`;

  // Can't reach the database (bad host, not SSL, server down).
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|getaddrinfo|P1001|P1002|SSL|self.signed/i.test(msg)) {
    return NextResponse.json(
      {
        error:
          "Can't reach the database. Check DATABASE_URL (use Neon's pooled, sslmode=require string).",
      },
      { status: 503 },
    );
  }

  // Connected, but the tables don't exist yet.
  if (/does not exist|P2021|P2010|relation .* does not exist|no such table/i.test(msg)) {
    return NextResponse.json(
      { error: "Database tables aren't set up yet. Run `npm run db:push`." },
      { status: 503 },
    );
  }

  // Auth to the database failed.
  if (/password authentication|P1000|role .* does not exist|P1010/i.test(msg)) {
    return NextResponse.json(
      { error: "Database rejected the credentials in DATABASE_URL." },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { error: "Database error — check the server logs for details." },
    { status: 500 },
  );
}
