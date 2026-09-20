"use client";

import type { CSSProperties } from "react";
import { useConstructorStandings, useDriverStandings } from "@/hooks/useStandings";
import { getConstructorColor } from "@/lib/domain/teamColors";
import { Spinner } from "@/components/ui/Spinner";

export function StandingsPanel({ year }: { year: number }) {
  const drivers = useDriverStandings(year);
  const constructors = useConstructorStandings(year);
  const scrollbar = "[scrollbar-color:#71717a_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-500 [&::-webkit-scrollbar-track]:bg-transparent";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5 text-zinc-100 shadow-2xl backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400">Championship</p>
            <h2 className="text-lg font-bold">Driver standings</h2>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">{year}</span>
        </div>
        {drivers.isLoading && <p className="flex items-center gap-2 text-sm text-zinc-500"><Spinner /> Loading…</p>}
        {drivers.isError && <p className="text-sm text-red-400">Standings unavailable.</p>}
        {!drivers.isLoading && !drivers.isError && drivers.data?.length === 0 && <p className="text-sm text-zinc-500">No standings yet.</p>}
        <div className={`max-h-[520px] space-y-2 overflow-y-auto pr-1 ${scrollbar}`}>
          {drivers.data?.map((entry) => {
            const color = getConstructorColor(entry.constructorName);
            return (
              <div
                key={entry.driverId}
                className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-3 transition hover:bg-white/[0.07]"
                style={{ "--team-color": color } as CSSProperties}
              >
                <span className="absolute inset-y-0 left-0 w-1 bg-[var(--team-color)] opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="w-8 font-mono text-sm font-black text-red-400">P{entry.position}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{entry.givenName} {entry.familyName}</div>
                  <div className="truncate text-xs text-zinc-500 transition-colors group-hover:text-[var(--team-color)]">{entry.constructorName}</div>
                </div>
                <div className="font-mono text-sm font-bold">{entry.points}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5 text-zinc-100 shadow-2xl backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400">Teams</p>
            <h2 className="text-lg font-bold">Constructors</h2>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">{year}</span>
        </div>
        {constructors.isLoading && <p className="flex items-center gap-2 text-sm text-zinc-500"><Spinner /> Loading…</p>}
        {constructors.isError && <p className="text-sm text-red-400">Standings unavailable.</p>}
        {!constructors.isLoading && !constructors.isError && constructors.data?.length === 0 && <p className="text-sm text-zinc-500">No standings yet.</p>}
        <div className={`max-h-[520px] space-y-2 overflow-y-auto pr-1 ${scrollbar}`}>
          {constructors.data?.map((entry) => {
            const color = getConstructorColor(entry.name);
            return (
              <div
                key={entry.constructorId}
                className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-3 transition hover:bg-white/[0.07]"
                style={{ "--team-color": color } as CSSProperties}
              >
                <span className="absolute inset-y-0 left-0 w-1 bg-[var(--team-color)] opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="w-8 font-mono text-sm font-black text-red-400">P{entry.position}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold transition-colors group-hover:text-[var(--team-color)]">{entry.name}</div>
                  <div className="truncate text-xs text-zinc-500">{entry.nationality}</div>
                </div>
                <div className="font-mono text-sm font-bold">{entry.points}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
