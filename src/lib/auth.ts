import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { customAlphabet } from "nanoid";
import { prisma } from "./db";

// Human-friendly alphabet: uppercase, no 0/O/1/I confusion.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const nano = customAlphabet(ALPHABET, 12);

/** Mint a fresh, readable player token, e.g. "RG7K2QPM9XTL". */
export function mintToken(): string {
  return nano();
}

/** Normalize user-entered tokens (strip spaces/hyphens, uppercase). */
export function normalizeToken(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Display a token in readable groups of four: RG7K-2QPM-9XTL. */
export function formatToken(token: string): string {
  return token.replace(/(.{4})/g, "$1-").replace(/-$/, "");
}

export async function getPlayerByToken(rawToken: string | null | undefined) {
  if (!rawToken) return null;
  const token = normalizeToken(rawToken);
  if (token.length < 8) return null;
  return prisma.player.findUnique({
    where: { token },
    include: { room: true, badges: true },
  });
}

// ---------- Admin auth ----------

const ADMIN_COOKIE = "reimaginai_admin";

function expectedAdminCookie(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return createHash("sha256").update(`reimaginai:${pw}`).digest("hex");
}

export function verifyAdminPassword(password: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  return password === pw;
}

export async function setAdminCookie(): Promise<void> {
  const value = expectedAdminCookie();
  if (!value) return;
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export async function clearAdminCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const expected = expectedAdminCookie();
  if (!expected) return false;
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === expected;
}
