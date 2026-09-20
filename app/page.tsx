import { NextRaceCountdown } from "@/components/home/NextRaceCountdown";
import { StandingsPanel } from "@/components/home/StandingsPanel";
import { SessionBrowser } from "@/components/session-browser/SessionBrowser";
import { TeamThemePicker } from "@/components/theme/TeamTheme";

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,var(--team-theme-glow),transparent_34%),linear-gradient(135deg,#09090b_0%,#18181b_45%,#030712_100%)] p-6 text-zinc-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur">
          <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-[var(--team-theme-soft)] blur-3xl" />
          <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--team-theme)]">
                RaceStudio
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight md:text-6xl">
                Telemetry Studio
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                Replay OpenF1 telemetry, compare drivers, scan race control, and preview upcoming circuits from one pit-wall style dashboard.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[auto_auto]">
              <TeamThemePicker />
              <div className="rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-right shadow-inner">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Season</div>
                <div className="font-mono text-2xl font-bold text-[var(--team-theme)]">{year}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <NextRaceCountdown />
          <StandingsPanel year={year} />
        </div>

        <SessionBrowser />
      </div>
    </main>
  );
}
