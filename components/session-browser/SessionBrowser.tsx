"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessions } from "@/hooks/useSessionData";
import { SeasonSelect } from "./SeasonSelect";
import { GrandPrixSelect, type GrandPrixOption } from "./GrandPrixSelect";
import { Spinner } from "@/components/ui/Spinner";

export function SessionBrowser() {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [meetingKey, setMeetingKey] = useState<number | null>(null);
  const [sessionKey, setSessionKey] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: sessions, isLoading, isError } = useSessions(year);

  const grandPrixOptions: GrandPrixOption[] = useMemo(() => {
    const seen = new Map<number, GrandPrixOption>();
    for (const session of sessions ?? []) {
      const existing = seen.get(session.meetingKey);
      const isUpcoming = Date.parse(session.startTimeUtc) > now;
      if (!existing) {
        seen.set(session.meetingKey, {
          meetingKey: session.meetingKey,
          label: `${session.countryName} — ${session.circuitName}`,
          isUpcoming,
        });
      } else if (!isUpcoming) {
        existing.isUpcoming = false;
      }
    }
    return Array.from(seen.values())
      .filter((option) => option.label.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.meetingKey - b.meetingKey);
  }, [sessions, search, now]);

  const sessionsForMeeting = useMemo(() => {
    if (meetingKey === null) return [];
    return (sessions ?? [])
      .filter((s) => s.meetingKey === meetingKey)
      .sort((a, b) => Date.parse(a.startTimeUtc) - Date.parse(b.startTimeUtc));
  }, [sessions, meetingKey]);

  const [prevGrandPrixOptions, setPrevGrandPrixOptions] = useState(grandPrixOptions);
  if (grandPrixOptions !== prevGrandPrixOptions) {
    setPrevGrandPrixOptions(grandPrixOptions);
    setMeetingKey(grandPrixOptions[0]?.meetingKey ?? null);
  }

  const [prevSessionsForMeeting, setPrevSessionsForMeeting] = useState(sessionsForMeeting);
  if (sessionsForMeeting !== prevSessionsForMeeting) {
    setPrevSessionsForMeeting(sessionsForMeeting);
    setSessionKey(null);
  }

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-zinc-950/80 p-6 text-zinc-100 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">Race archive</p>
          <h2 className="mt-1 text-xl font-bold">Session browser</h2>
          <p className="text-sm text-zinc-500">Search past telemetry sessions or preview upcoming race weekends.</p>
        </div>
        <div className="hidden rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-500 sm:block">OpenF1 powered</div>
      </div>

      {isLoading && (
        <p className="flex items-center gap-2 text-sm text-zinc-400">
          <Spinner /> Loading sessions for {year}…
        </p>
      )}
      {isError && (
        <p className="text-sm text-red-600">Failed to load sessions for {year}.</p>
      )}
      {!isLoading && !isError && grandPrixOptions.length === 0 && (
        <p className="text-sm text-zinc-500">No matching sessions found for {year}.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[160px_minmax(220px,1fr)_minmax(220px,1fr)]">
        <SeasonSelect value={year} onChange={setYear} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-500">Search Grand Prix</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Monaco, Spa, Japan…"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:border-red-400 focus:outline-none"
          />
        </label>
        <GrandPrixSelect
          options={grandPrixOptions}
          value={meetingKey}
          onChange={setMeetingKey}
          disabled={isLoading || grandPrixOptions.length === 0}
        />
        <div className="lg:col-span-3">
          <div className="mb-2 text-sm text-zinc-500">Sessions</div>
          {sessionsForMeeting.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-500">
              Select a Grand Prix to see its sessions.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sessionsForMeeting.map((session) => {
                const isFuture = Date.parse(session.startTimeUtc) > now;
                const isSelected = session.key === sessionKey;
                return (
                  <button
                    key={session.key}
                    type="button"
                    onClick={() => {
                      setSessionKey(session.key);
                      if (!isFuture) router.push(`/session/${session.key}`);
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-red-400 bg-red-500/10 shadow-lg shadow-red-500/10"
                        : "border-white/10 bg-white/[0.035] hover:border-red-400 hover:bg-red-500/10 hover:shadow-lg hover:shadow-red-500/10"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                        {session.sessionType}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                          isFuture
                            ? "bg-amber-400/10 text-amber-300"
                            : "bg-emerald-400/10 text-emerald-300"
                        }`}
                      >
                        {isFuture ? "Upcoming" : "Available"}
                      </span>
                    </div>
                    <div className="text-base font-bold text-zinc-100">{session.name}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {new Date(session.startTimeUtc).toLocaleString()}
                    </div>
                    <div className="mt-3 text-xs text-zinc-500">
                      {isFuture ? "Telemetry unlocks after the session starts." : "Click to open telemetry replay."}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
