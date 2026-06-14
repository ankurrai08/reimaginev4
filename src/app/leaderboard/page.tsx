"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import { DISCIPLINES, type DisciplineKey } from "@/lib/constants";
import { getToken } from "@/lib/session";
import { getJSON, postJSON } from "@/lib/api";

interface Row {
  rank: number;
  name: string;
  discipline: DisciplineKey;
  totalScore: number;
  roundsPlayed: number;
  streak: number;
  badgeCount: number;
}
interface Team {
  discipline: DisciplineKey;
  total: number;
  players: number;
}

type Tab = "overall" | DisciplineKey | "teams";

export default function LeaderboardPage() {
  const [room, setRoom] = useState("");
  const [input, setInput] = useState("");
  const [players, setPlayers] = useState<Row[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tab, setTab] = useState<Tab>("overall");
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Default the room from the logged-in player, if any.
  useEffect(() => {
    const t = getToken();
    if (!t) return;
    postJSON<{ player: { roomCode: string } }>("/api/me", { token: t })
      .then((res) => {
        setRoom(res.player.roomCode);
        setInput(res.player.roomCode);
      })
      .catch(() => {});
  }, []);

  const refresh = useCallback(async (code: string) => {
    try {
      const res = await getJSON<{ players: Row[]; teams: Team[] }>(
        `/api/leaderboard?room=${encodeURIComponent(code)}`,
      );
      setPlayers(res.players);
      setTeams(res.teams);
      setLoaded(true);
    } catch {
      /* keep last good data */
    }
  }, []);

  // Poll while a room is selected.
  useEffect(() => {
    if (!room) return;
    let active = true;
    async function tick() {
      if (active) await refresh(room);
    }
    tick();
    timer.current = setInterval(tick, 4000);
    return () => {
      active = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, [room, refresh]);

  const shown =
    tab === "overall" || tab === "teams"
      ? players
      : players.filter((p) => p.discipline === tab);

  const maxTeam = Math.max(1, ...teams.map((t) => t.total));

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-extrabold">🏆 Leaderboard</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setRoom(input.trim().toUpperCase());
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Room code"
              className="w-40 rounded-lg border border-[var(--border)] bg-black/30 px-3 py-1.5 text-sm uppercase outline-none focus:border-[var(--indigo)]"
            />
            <button className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-white/5">
              Load
            </button>
          </form>
        </div>

        {!room && (
          <p className="mt-10 text-center text-white/50">
            Enter a room code to see the standings.
          </p>
        )}

        {room && (
          <>
            <div className="mt-5 flex flex-wrap gap-1 text-sm">
              {(
                [
                  ["overall", "Overall"],
                  ["PRODUCT", DISCIPLINES.PRODUCT.label],
                  ["STRATEGY", DISCIPLINES.STRATEGY.label],
                  ["ANALYTICS", DISCIPLINES.ANALYTICS.label],
                  ["teams", "Team battle"],
                ] as [Tab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    tab === key
                      ? "bg-white/10 font-semibold text-white"
                      : "text-white/55 hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-2 text-xs text-white/35">
              Room {room} · live, refreshes every few seconds
            </div>

            {tab === "teams" ? (
              <div className="mt-5 space-y-4">
                {teams.length === 0 && loaded && (
                  <p className="text-white/50">No scores yet.</p>
                )}
                {teams.map((t) => {
                  const d = DISCIPLINES[t.discipline];
                  return (
                    <div key={t.discipline}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-semibold" style={{ color: d.accent }}>
                          {d.label}
                        </span>
                        <span className="text-white/60">
                          {t.total} pts · {t.players} player
                          {t.players === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="h-4 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className="animate-bar h-full rounded-full"
                          style={{
                            width: `${(t.total / maxTeam) * 100}%`,
                            backgroundColor: d.accent,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)]">
                {shown.length === 0 && loaded && (
                  <p className="p-6 text-center text-white/50">
                    No players here yet.
                  </p>
                )}
                {shown.map((p, i) => {
                  const d = DISCIPLINES[p.discipline];
                  return (
                    <div
                      key={p.name + i}
                      className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 last:border-b-0"
                    >
                      <div className="w-7 text-center text-lg font-bold text-white/40">
                        {tab === "overall" ? p.rank : i + 1}
                      </div>
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: d.accent }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{p.name}</div>
                        <div className="text-xs text-white/45">
                          {d.label} · {p.roundsPlayed} round
                          {p.roundsPlayed === 1 ? "" : "s"}
                          {p.streak >= 2 ? ` · 🔥${p.streak}` : ""}
                          {p.badgeCount > 0 ? ` · 🏅${p.badgeCount}` : ""}
                        </div>
                      </div>
                      <div className="text-xl font-extrabold text-[var(--indigo)]">
                        {p.totalScore}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
