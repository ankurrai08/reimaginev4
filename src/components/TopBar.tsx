import Link from "next/link";

export default function TopBar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[#0b0b14cc] backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="text-xl">✨</span>
          <span className="text-lg">
            Reimagin
            <span className="text-[var(--indigo)]">AI</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/play"
            className="rounded-lg px-3 py-1.5 text-white/70 hover:bg-white/5 hover:text-white"
          >
            Play
          </Link>
          <Link
            href="/leaderboard"
            className="rounded-lg px-3 py-1.5 text-white/70 hover:bg-white/5 hover:text-white"
          >
            Leaderboard
          </Link>
          {right}
        </nav>
      </div>
    </header>
  );
}
