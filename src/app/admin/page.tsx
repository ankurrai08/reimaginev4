"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { getJSON, postJSON } from "@/lib/api";
import { formatToken } from "@/lib/session";
import { DISCIPLINES, type DisciplineKey } from "@/lib/constants";

interface AdminPlayer {
  id: string;
  name: string;
  discipline: DisciplineKey;
  roomCode: string;
  totalScore: number;
  roundsPlayed: number;
  badgeCount: number;
  token: string;
  tokenDisplay: string;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [players, setPlayers] = useState<AdminPlayer[]>([]);

  useEffect(() => {
    getJSON<{ authed: boolean }>("/api/admin/login")
      .then((r) => setAuthed(r.authed))
      .catch(() => setAuthed(false));
  }, []);

  async function load(query = q) {
    try {
      const r = await getJSON<{ players: AdminPlayer[] }>(
        `/api/admin/players?q=${encodeURIComponent(query)}`,
      );
      setPlayers(r.players);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    let active = true;
    async function init() {
      if (authed && active) await load("");
    }
    init();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await postJSON("/api/admin/login", { password });
      setAuthed(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
    setPlayers([]);
  }

  function patchPlayer(id: string, patch: Partial<AdminPlayer>) {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function removePlayer(id: string) {
    setPlayers((ps) => ps.filter((p) => p.id !== id));
  }

  if (authed === null) {
    return (
      <>
        <TopBar />
        <main className="flex flex-1 items-center justify-center text-white/50">
          Checking…
        </main>
      </>
    );
  }

  if (!authed) {
    return (
      <>
        <TopBar />
        <main className="mx-auto w-full max-w-sm flex-1 px-4 py-16">
          <h1 className="text-center text-2xl font-extrabold">Admin portal</h1>
          <form
            onSubmit={login}
            className="mt-6 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6"
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 outline-none focus:border-[var(--indigo)]"
            />
            {error && <p className="text-sm text-[var(--pink)]">{error}</p>}
            <button className="w-full rounded-lg bg-[var(--indigo)] px-4 py-2.5 font-semibold text-white hover:brightness-110">
              Sign in
            </button>
          </form>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar
        right={
          <button
            onClick={logout}
            className="rounded-lg px-3 py-1.5 text-white/60 hover:bg-white/5 hover:text-white"
          >
            Sign out
          </button>
        }
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-extrabold">Admin portal</h1>
        <p className="mt-1 text-sm text-white/50">
          Reset forgotten tokens, fix scores, or remove players.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="mt-5 flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by player name or room code"
            className="flex-1 rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--indigo)]"
          />
          <button className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-white/5">
            Search
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-[var(--pink)]">{error}</p>}

        <div className="mt-5 space-y-3">
          {players.length === 0 && (
            <p className="text-white/50">No players found.</p>
          )}
          {players.map((p) => (
            <PlayerRow
              key={p.id}
              player={p}
              onPatch={patchPlayer}
              onRemove={removePlayer}
            />
          ))}
        </div>
      </main>
    </>
  );
}

function PlayerRow({
  player,
  onPatch,
  onRemove,
}: {
  player: AdminPlayer;
  onPatch: (id: string, patch: Partial<AdminPlayer>) => void;
  onRemove: (id: string) => void;
}) {
  const [scoreInput, setScoreInput] = useState(String(player.totalScore));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const d = DISCIPLINES[player.discipline];

  async function resetToken() {
    setBusy(true);
    setMsg("");
    try {
      const r = await postJSON<{ token: string; tokenDisplay: string }>(
        "/api/admin/player",
        { playerId: player.id, action: "reset-token" },
      );
      onPatch(player.id, { token: r.token, tokenDisplay: r.tokenDisplay });
      setMsg("New token issued — read it to the player.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function setScore() {
    setBusy(true);
    setMsg("");
    try {
      const r = await postJSON<{ totalScore: number }>("/api/admin/player", {
        playerId: player.id,
        action: "set-score",
        value: Number(scoreInput),
      });
      onPatch(player.id, { totalScore: r.totalScore });
      setMsg("Score updated.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm(`Delete ${player.name} from ${player.roomCode}? This cannot be undone.`))
      return;
    setBusy(true);
    try {
      await postJSON("/api/admin/player", {
        playerId: player.id,
        action: "delete",
      });
      onRemove(player.id);
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: d.accent }}
          />
          <span className="font-semibold">{player.name}</span>
          <span className="text-xs text-white/45">
            {d.label} · {player.roomCode} · {player.roundsPlayed} rounds ·{" "}
            {player.totalScore} pts
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className="text-white/50">Token:</span>
        <code className="rounded bg-black/40 px-2 py-1 font-mono tracking-wider">
          {player.tokenDisplay || formatToken(player.token)}
        </code>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={resetToken}
          disabled={busy}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-50"
        >
          🔁 Reset token
        </button>
        <span className="mx-1 h-5 w-px bg-[var(--border)]" />
        <input
          value={scoreInput}
          onChange={(e) => setScoreInput(e.target.value)}
          inputMode="numeric"
          className="w-24 rounded-lg border border-[var(--border)] bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-[var(--indigo)]"
        />
        <button
          onClick={setScore}
          disabled={busy}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-50"
        >
          Set score
        </button>
        <span className="mx-1 h-5 w-px bg-[var(--border)]" />
        <button
          onClick={del}
          disabled={busy}
          className="rounded-lg border border-[var(--pink)]/40 px-3 py-1.5 text-sm text-[var(--pink)] hover:bg-[var(--pink)]/10 disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      {msg && <p className="mt-2 text-xs text-[var(--teal)]">{msg}</p>}
    </div>
  );
}
