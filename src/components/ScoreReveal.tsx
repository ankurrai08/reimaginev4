"use client";

import { RUBRIC, BADGES, type RubricKey } from "@/lib/constants";

export interface ScoreResult {
  dimensions: Record<RubricKey, number>;
  rawTotal: number;
  weightedTotal: number;
  pointsAwarded: number;
  verdict: string;
  feedback: string;
  difficulty: "NORMAL" | "BOSS";
  streak: number;
}

function barColor(key: RubricKey, score: number): string {
  if (key === "csImpact") return "var(--teal)";
  if (key === "aiNative") return "var(--indigo)";
  if (score >= 8) return "var(--amber)";
  return "var(--pink)";
}

export default function ScoreReveal({
  result,
  newBadges,
  onNext,
}: {
  result: ScoreResult;
  newBadges: string[];
  onNext: () => void;
}) {
  return (
    <div className="animate-pop space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-2xl">
        {result.difficulty === "BOSS" && (
          <div className="mb-2 inline-block rounded-full bg-[var(--amber)]/20 px-3 py-1 text-xs font-bold text-[var(--amber)]">
            ⚔️ BOSS ROUND ×1.5
          </div>
        )}
        <div className="text-sm uppercase tracking-widest text-white/50">
          Points awarded
        </div>
        <div className="mt-1 text-6xl font-extrabold text-[var(--indigo)]">
          +{result.pointsAwarded}
        </div>
        <p className="mt-3 text-lg font-medium text-white/90">
          “{result.verdict}”
        </p>
        {result.streak >= 2 && (
          <div className="mt-2 text-sm text-[var(--amber)]">
            🔥 {result.streak}-round hot streak
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="font-semibold">Scorecard</h3>
          <span className="text-sm text-white/50">
            Weighted {result.weightedTotal}/75
          </span>
        </div>
        <div className="space-y-3">
          {RUBRIC.map((dim) => {
            const score = result.dimensions[dim.key];
            return (
              <div key={dim.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-white/80">{dim.label}</span>
                    {dim.weight !== 1 && (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/60">
                        ×{dim.weight}
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-white/70">{score}/10</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="animate-bar h-full rounded-full"
                    style={{
                      width: `${score * 10}%`,
                      backgroundColor: barColor(dim.key, score),
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h3 className="mb-2 flex items-center gap-2 font-semibold">
          <span>🧭</span> Coach&apos;s notes
        </h3>
        <p className="text-sm leading-relaxed text-white/80">{result.feedback}</p>
      </div>

      {newBadges.length > 0 && (
        <div className="rounded-2xl border border-[var(--amber)]/40 bg-[var(--amber)]/10 p-6">
          <h3 className="mb-3 font-semibold text-[var(--amber)]">
            🎉 New badge{newBadges.length > 1 ? "s" : ""} unlocked
          </h3>
          <div className="flex flex-wrap gap-3">
            {newBadges.map((type) => {
              const b = BADGES[type];
              if (!b) return null;
              return (
                <div
                  key={type}
                  className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2"
                >
                  <span className="text-xl">{b.emoji}</span>
                  <div>
                    <div className="text-sm font-semibold">{b.label}</div>
                    <div className="text-[11px] text-white/50">
                      {b.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={onNext}
        className="w-full rounded-lg bg-[var(--indigo)] px-4 py-3 font-semibold text-white transition hover:brightness-110"
      >
        Deal me another →
      </button>
    </div>
  );
}
