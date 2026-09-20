"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSessions } from "@/hooks/useSessionData";
import { NextRaceTrackPreview } from "./NextRaceTrackPreview";
import { Spinner } from "@/components/ui/Spinner";

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { days, hours, minutes };
}

export function NextRaceCountdown() {
  const { data: now } = useQuery({
    queryKey: ["clock", "next-race-countdown"],
    queryFn: () => Date.now(),
    initialData: () => Date.now(),
    refetchInterval: 30_000,
  });
  const currentYear = new Date(now).getFullYear();
  const { data: thisYearSessions, isLoading } = useSessions(currentYear);
  const { data: nextYearSessions } = useSessions(currentYear + 1);

  const nextRace = useMemo(() => {
    const sessions = [...(thisYearSessions ?? []), ...(nextYearSessions ?? [])];
    return sessions
      .filter((session) => Date.parse(session.startTimeUtc) > now)
      .sort((a, b) => Date.parse(a.startTimeUtc) - Date.parse(b.startTimeUtc))
      .find((session) => session.sessionType === "Race") ??
      sessions
        .filter((session) => Date.parse(session.startTimeUtc) > now)
        .sort((a, b) => Date.parse(a.startTimeUtc) - Date.parse(b.startTimeUtc))[0];
  }, [thisYearSessions, nextYearSessions, now]);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="flex items-center gap-2 text-sm text-zinc-500"><Spinner /> Loading calendar…</p>
      </section>
    );
  }

  if (!nextRace) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500">No upcoming race found.</p>
      </section>
    );
  }

  const countdown = formatCountdown(Date.parse(nextRace.startTimeUtc) - now);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 to-zinc-900 p-5 text-white shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400">Next race</div>
          <h2 className="mt-1 text-xl font-semibold">{nextRace.countryName} — {nextRace.circuitName}</h2>
          <p className="text-sm text-zinc-400">{nextRace.name}</p>
        </div>
        <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
          {new Date(nextRace.startTimeUtc).toLocaleString()}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Days", countdown.days],
          ["Hours", countdown.hours],
          ["Minutes", countdown.minutes],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
            <div className="font-mono text-3xl font-bold">{value}</div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
          </div>
        ))}
      </div>
      <NextRaceTrackPreview
        circuitName={nextRace.circuitName}
        countryName={nextRace.countryName}
      />
    </section>
  );
}
