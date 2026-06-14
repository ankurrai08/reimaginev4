"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import ScoreReveal, { type ScoreResult } from "@/components/ScoreReveal";
import { DISCIPLINES, ROUND_SECONDS } from "@/lib/constants";
import { getToken, clearToken, formatToken } from "@/lib/session";
import { postJSON } from "@/lib/api";
import type { PlayerState } from "@/lib/serialize";

interface RoundData {
  id: string;
  objectCard: string;
  lensCard: string;
  difficulty: "NORMAL" | "BOSS";
  dealtAt: string;
}

type Phase = "loading" | "idle" | "playing" | "scoring" | "result";

const EMPTY_FORM = {
  whatItIs: "",
  aiCentral: "",
  customerService: "",
  dataLoop: "",
};

export default function PlayPage() {
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [round, setRound] = useState<RoundData | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(ROUND_SECONDS);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  // Bootstrap: load the player from the saved token.
  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/");
      return;
    }
    tokenRef.current = t;
    postJSON<{ player: PlayerState; openRound: RoundData | null }>("/api/me", {
      token: t,
    })
      .then((res) => {
        setPlayer(res.player);
        if (res.openRound) {
          setRound(res.openRound);
          setPhase("playing");
        } else {
          setPhase("idle");
        }
      })
      .catch(() => {
        clearToken();
        router.replace("/");
      });
  }, [router]);

  // Round timer.
  useEffect(() => {
    if (phase !== "playing" || !round) return;
    const dealt = new Date(round.dealtAt).getTime();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - dealt) / 1000);
      setRemaining(Math.max(-1, ROUND_SECONDS - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, round]);

  const deal = useCallback(async () => {
    setError("");
    setPhase("loading");
    try {
      const res = await postJSON<{ round: RoundData }>("/api/round", {
        token: tokenRef.current,
      });
      setRound(res.round);
      setForm(EMPTY_FORM);
      setResult(null);
      setNewBadges([]);
      setPhase("playing");
    } catch (err) {
      setError((err as Error).message);
      setPhase("idle");
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!round) return;
    setError("");
    setPhase("scoring");
    try {
      const res = await postJSON<{
        score: ScoreResult;
        newBadges: string[];
        player: PlayerState;
      }>("/api/submit", {
        token: tokenRef.current,
        roundId: round.id,
        ...form,
      });
      setResult(res.score);
      setNewBadges(res.newBadges);
      setPlayer(res.player);
      setPhase("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
      setPhase("playing");
    }
  }

  function leave() {
    clearToken();
    router.replace("/");
  }

  async function copyToken() {
    const t = getToken();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(formatToken(t));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; the token is still visible to copy manually */
    }
  }

  const accent = player ? DISCIPLINES[player.discipline].accent : "var(--indigo)";

  const right = player ? (
    <div className="ml-1 flex items-center gap-2">
      <button
        onClick={() => setShowToken((s) => !s)}
        title="Show your token"
        className="rounded-lg px-2 py-1.5 text-white/60 hover:bg-white/5 hover:text-white"
      >
        🔑
      </button>
      <button
        onClick={leave}
        className="rounded-lg px-2 py-1.5 text-white/50 hover:bg-white/5 hover:text-white"
      >
        Leave
      </button>
      <span
        className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-black/30 px-3 py-1.5"
        title={`${DISCIPLINES[player.discipline].label} · ${player.roomCode}`}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <span className="text-sm font-medium">{player.name}</span>
        <span className="text-sm font-bold text-[var(--indigo)]">
          {player.totalScore}
        </span>
      </span>
    </div>
  ) : null;

  return (
    <>
      <TopBar right={right} />

      {showToken && player && (
        <div className="border-b border-[var(--border)] bg-black/40">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-white/50">
                Your token — back it up
              </div>
              <div className="font-mono text-lg tracking-wider">
                {formatToken(getToken() ?? "")}
              </div>
              <div className="text-xs text-white/40">
                Saves your progress. If you clear your browser, paste this to
                rejoin (or ask an admin to reset it).
              </div>
            </div>
            <button
              onClick={copyToken}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-white/5"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {error && (
          <div className="mb-4 rounded-lg border border-[var(--pink)]/40 bg-[var(--pink)]/10 px-4 py-3 text-sm text-[var(--pink)]">
            {error}
          </div>
        )}

        {phase === "loading" && (
          <div className="py-20 text-center text-white/50">
            <div className="animate-pulse">Shuffling the deck…</div>
          </div>
        )}

        {phase === "idle" && (
          <div className="animate-float rounded-2xl border border-[var(--border)] bg-[var(--card)] p-10 text-center shadow-2xl">
            <div className="text-5xl">🃏</div>
            <h2 className="mt-4 text-2xl font-bold">Ready for your object?</h2>
            <p className="mx-auto mt-2 max-w-md text-white/60">
              You&apos;ll get an everyday object and a customer-servicing twist.
              You have {Math.round(ROUND_SECONDS / 60)} minutes to pitch its
              AI-native redesign.
            </p>
            <button
              onClick={deal}
              className="mt-6 rounded-lg bg-[var(--indigo)] px-6 py-3 font-semibold text-white transition hover:brightness-110"
            >
              Deal my object →
            </button>
          </div>
        )}

        {(phase === "playing" || phase === "scoring") && round && (
          <PlayingView
            round={round}
            form={form}
            setForm={setForm}
            remaining={remaining}
            scoring={phase === "scoring"}
            onSubmit={submit}
          />
        )}

        {phase === "result" && result && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Round result</h2>
              <Link
                href="/leaderboard"
                className="text-sm text-[var(--indigo)] hover:underline"
              >
                View leaderboard →
              </Link>
            </div>
            <ScoreReveal result={result} newBadges={newBadges} onNext={deal} />
          </>
        )}
      </main>
    </>
  );
}

function PlayingView({
  round,
  form,
  setForm,
  remaining,
  scoring,
  onSubmit,
}: {
  round: RoundData;
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  remaining: number;
  scoring: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const colonIdx = round.lensCard.indexOf(":");
  const lensTitle =
    colonIdx >= 0 ? round.lensCard.slice(0, colonIdx) : round.lensCard;
  const lensPrompt = colonIdx >= 0 ? round.lensCard.slice(colonIdx + 1).trim() : "";

  const mm = Math.max(0, Math.floor(Math.max(0, remaining) / 60));
  const ss = Math.max(0, remaining) % 60;
  const timeUp = remaining <= 0;

  const fields: {
    key: keyof typeof EMPTY_FORM;
    label: string;
    placeholder: string;
  }[] = [
    {
      key: "whatItIs",
      label: "1 · What is it?",
      placeholder: "Describe the reimagined object in a sentence or two.",
    },
    {
      key: "aiCentral",
      label: "2 · How does AI sit at the center?",
      placeholder:
        "What does modern AI do here that couldn't be done before? (Not just a timer or sensor.)",
    },
    {
      key: "customerService",
      label: "3 · How does it serve the customer?",
      placeholder: "Tie it back to the lens — who is served, and how?",
    },
    {
      key: "dataLoop",
      label: "4 · What data / feedback loop does it create?",
      placeholder: "What data does it generate, and how does it get smarter?",
    },
  ];

  return (
    <div className="animate-float space-y-5">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/40">
              Your object
            </div>
            <div className="mt-1 text-3xl font-extrabold">{round.objectCard}</div>
          </div>
          <div
            className={`rounded-lg px-3 py-2 text-center font-mono text-lg ${
              timeUp
                ? "bg-[var(--pink)]/20 text-[var(--pink)]"
                : "bg-black/30 text-white/80"
            }`}
          >
            {timeUp ? "0:00" : `${mm}:${ss.toString().padStart(2, "0")}`}
            <div className="text-[10px] uppercase tracking-wide text-white/40">
              {timeUp ? "time's up" : "remaining"}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[var(--teal)]/30 bg-[var(--teal)]/10 p-3">
          <div className="flex items-center gap-2">
            {round.difficulty === "BOSS" && (
              <span className="rounded-full bg-[var(--amber)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--amber)]">
                ⚔️ BOSS
              </span>
            )}
            <span className="text-sm font-semibold text-[var(--teal)]">
              Lens: {lensTitle}
            </span>
          </div>
          {lensPrompt && (
            <p className="mt-1 text-sm text-white/70">
              Redesign it {lensPrompt}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {fields.map((f) => (
          <div
            key={f.key}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <label className="mb-2 block text-sm font-semibold text-white/80">
              {f.label}
            </label>
            <textarea
              value={form[f.key]}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
              }
              rows={3}
              maxLength={1500}
              placeholder={f.placeholder}
              disabled={scoring}
              className="w-full resize-y rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--indigo)] disabled:opacity-60"
            />
          </div>
        ))}

        <button
          disabled={scoring}
          className="w-full rounded-lg bg-[var(--indigo)] px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {scoring ? "🧠 The AI judge is deliberating…" : "Submit to the AI judge →"}
        </button>
        {scoring && (
          <p className="text-center text-xs text-white/40">
            Scoring against the rubric — this can take a few seconds.
          </p>
        )}
      </form>
    </div>
  );
}
