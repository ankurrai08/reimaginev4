"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import { DISCIPLINES, type DisciplineKey } from "@/lib/constants";
import { getToken, setToken } from "@/lib/session";
import { postJSON } from "@/lib/api";

export default function JoinPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"join" | "token">("join");
  const [name, setName] = useState("");
  const [discipline, setDiscipline] = useState<DisciplineKey | "">("");
  const [roomCode, setRoomCode] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Auto-login from a saved token.
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const t = getToken();
      if (!t) {
        if (!cancelled) setChecking(false);
        return;
      }
      try {
        await postJSON("/api/me", { token: t });
        if (!cancelled) router.replace("/play");
      } catch {
        if (!cancelled) setChecking(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!discipline) {
      setError("Pick your discipline.");
      return;
    }
    setBusy(true);
    try {
      const res = await postJSON<{ token: string }>("/api/room", {
        name,
        discipline,
        roomCode,
      });
      setToken(res.token);
      router.push("/play");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function handleToken(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await postJSON<{ token: string }>("/api/room", {
        token: tokenInput,
      });
      setToken(res.token);
      router.push("/play");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-white/50">Loading…</div>
      </main>
    );
  }

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <div className="animate-float text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Reimagine the everyday,{" "}
            <span className="text-[var(--indigo)]">AI-first</span>.
          </h1>
          <p className="mt-3 text-white/60">
            You&apos;ll be dealt a boring everyday object and a customer-servicing
            twist. Redesign it as an AI-native product. An AI judge scores you and
            coaches you. Climb the leaderboard.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
          {mode === "join" ? (
            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-white/70">
                  Display name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  placeholder="e.g. Priya"
                  className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 outline-none focus:border-[var(--indigo)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Your discipline
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(DISCIPLINES) as DisciplineKey[]).map((key) => {
                    const d = DISCIPLINES[key];
                    const active = discipline === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setDiscipline(key)}
                        style={active ? { borderColor: d.accent } : undefined}
                        className={`rounded-lg border px-2 py-3 text-center transition ${
                          active
                            ? "bg-white/10"
                            : "border-[var(--border)] hover:bg-white/5"
                        }`}
                      >
                        <div
                          className="text-sm font-semibold"
                          style={{ color: d.accent }}
                        >
                          {d.label}
                        </div>
                        <div className="mt-1 text-[11px] leading-tight text-white/50">
                          {d.blurb}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-white/70">
                  Room code
                </label>
                <input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  maxLength={40}
                  placeholder="e.g. OFFSITE-Q3"
                  className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 uppercase outline-none focus:border-[var(--indigo)]"
                />
                <p className="mt-1 text-xs text-white/40">
                  Everyone who enters the same room shares a leaderboard.
                </p>
              </div>

              {error && <p className="text-sm text-[var(--pink)]">{error}</p>}

              <button
                disabled={busy}
                className="w-full rounded-lg bg-[var(--indigo)] px-4 py-2.5 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "Joining…" : "Enter the arena →"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("token");
                  setError("");
                }}
                className="w-full text-center text-sm text-white/50 hover:text-white/80"
              >
                I already have a token
              </button>
            </form>
          ) : (
            <form onSubmit={handleToken} className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-white/70">
                  Your player token
                </label>
                <input
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="RG7K-2QPM-9XTL"
                  className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 font-mono uppercase outline-none focus:border-[var(--indigo)]"
                />
                <p className="mt-1 text-xs text-white/40">
                  Paste the token you saved (or one an admin gave you) to pick up
                  where you left off.
                </p>
              </div>

              {error && <p className="text-sm text-[var(--pink)]">{error}</p>}

              <button
                disabled={busy}
                className="w-full rounded-lg bg-[var(--indigo)] px-4 py-2.5 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "Checking…" : "Rejoin →"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("join");
                  setError("");
                }}
                className="w-full text-center text-sm text-white/50 hover:text-white/80"
              >
                ← Back to new player
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
