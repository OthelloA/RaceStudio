"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { findCircuit, useCircuitMaps, type CircuitFeature } from "@/hooks/useCircuitMap";
import { useSessions } from "@/hooks/useSessionData";
import type { Session } from "@/lib/domain/types";
import { SeasonSelect } from "./SeasonSelect";
import { Spinner } from "@/components/ui/Spinner";

interface RaceOption {
  meetingKey: number;
  countryName: string;
  circuitName: string;
  firstStartTimeUtc: string;
  lastEndTimeUtc: string;
  sessionCount: number;
  isUpcoming: boolean;
}

function formatRaceDate(startTimeUtc: string, endTimeUtc: string) {
  const start = new Date(startTimeUtc);
  const end = new Date(endTimeUtc);
  const sameMonth = start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${start.toLocaleDateString(undefined, { month: "short" })} ${start.getDate()}–${end.getDate()}`;
  }

  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function buildRaceOptions(sessions: Session[], now: number): RaceOption[] {
  const seen = new Map<number, RaceOption>();

  for (const session of sessions) {
    const existing = seen.get(session.meetingKey);
    const sessionStart = Date.parse(session.startTimeUtc);
    const sessionEnd = Date.parse(session.endTimeUtc);
    const isUpcoming = sessionStart > now;

    if (!existing) {
      seen.set(session.meetingKey, {
        meetingKey: session.meetingKey,
        countryName: session.countryName,
        circuitName: session.circuitName,
        firstStartTimeUtc: session.startTimeUtc,
        lastEndTimeUtc: session.endTimeUtc,
        sessionCount: 1,
        isUpcoming,
      });
      continue;
    }

    existing.sessionCount++;
    if (sessionStart < Date.parse(existing.firstStartTimeUtc)) {
      existing.firstStartTimeUtc = session.startTimeUtc;
    }
    if (sessionEnd > Date.parse(existing.lastEndTimeUtc)) {
      existing.lastEndTimeUtc = session.endTimeUtc;
    }
    if (!isUpcoming) existing.isUpcoming = false;
  }

  return Array.from(seen.values()).sort(
    (a, b) => Date.parse(a.firstStartTimeUtc) - Date.parse(b.firstStartTimeUtc)
  );
}

function miniCircuitPath(feature: CircuitFeature, width = 260, height = 116) {
  const coords = feature.geometry.coordinates;
  if (coords.length === 0) return "";

  const xs = coords.map((point) => point[0]);
  const ys = coords.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padding = 16;
  const scale = Math.min(
    (width - padding * 2) / (maxX - minX || 1),
    (height - padding * 2) / (maxY - minY || 1)
  );
  const renderedWidth = (maxX - minX) * scale;
  const renderedHeight = (maxY - minY) * scale;
  const offsetX = (width - renderedWidth) / 2;
  const offsetY = (height - renderedHeight) / 2;

  return coords
    .map(([x, y], index) => {
      const px = offsetX + (x - minX) * scale;
      const py = height - (offsetY + (y - minY) * scale);
      return `${index === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(" ");
}

function MiniCircuitMap({ feature, selected }: { feature: CircuitFeature | null; selected: boolean }) {
  const path = useMemo(() => (feature ? miniCircuitPath(feature) : ""), [feature]);

  return (
    <div className="relative mt-4 h-28 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/70">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:22px_22px]" />
      {path ? (
        <svg viewBox="0 0 260 116" className="relative h-full w-full">
          <path d={path} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
          <path d={path} fill="none" stroke={selected ? "#f87171" : "#d4d4d8"} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d={path} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 7" opacity={selected ? 1 : 0.45} />
        </svg>
      ) : (
        <div className="relative flex h-full items-center justify-center text-xs text-zinc-600">
          Map unavailable
        </div>
      )}
    </div>
  );
}

export function SessionBrowser() {
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });
  const suppressClickRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [now] = useState(() => Date.now());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [meetingKey, setMeetingKey] = useState<number | null>(null);
  const [sessionKey, setSessionKey] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: sessions, isLoading, isError } = useSessions(year);
  const circuitMaps = useCircuitMaps();

  const raceOptions = useMemo(
    () => buildRaceOptions(sessions ?? [], now),
    [sessions, now]
  );

  const filteredRaceOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return raceOptions;

    return raceOptions.filter((race) =>
      [race.countryName, race.circuitName, `${race.countryName} grand prix`]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [raceOptions, search]);

  const sessionsForMeeting = useMemo(() => {
    if (meetingKey === null) return [];
    return (sessions ?? [])
      .filter((s) => s.meetingKey === meetingKey)
      .sort((a, b) => Date.parse(a.startTimeUtc) - Date.parse(b.startTimeUtc));
  }, [sessions, meetingKey]);

  const [prevRaceOptions, setPrevRaceOptions] = useState(raceOptions);
  if (raceOptions !== prevRaceOptions) {
    setPrevRaceOptions(raceOptions);
    setMeetingKey(null);
    setSessionKey(null);
  }

  const [prevSessionsForMeeting, setPrevSessionsForMeeting] = useState(sessionsForMeeting);
  if (sessionsForMeeting !== prevSessionsForMeeting) {
    setPrevSessionsForMeeting(sessionsForMeeting);
    setSessionKey(null);
  }

  const scrollCarousel = (direction: -1 | 1) => {
    carouselRef.current?.scrollBy({ left: direction * 360, behavior: "smooth" });
  };

  const handleCarouselPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const carousel = carouselRef.current;
    if (!carousel) return;

    dragStateRef.current = {
      isDown: true,
      startX: event.clientX,
      scrollLeft: carousel.scrollLeft,
      moved: false,
    };
    setIsDragging(true);
  };

  const handleCarouselPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const carousel = carouselRef.current;
    const drag = dragStateRef.current;
    if (!carousel || !drag.isDown) return;

    const deltaX = event.clientX - drag.startX;
    if (Math.abs(deltaX) > 6) {
      drag.moved = true;
      suppressClickRef.current = true;
    }
    carousel.scrollLeft = drag.scrollLeft - deltaX;
  };

  const stopCarouselDrag = () => {
    const drag = dragStateRef.current;
    if (!drag.isDown) return;

    drag.isDown = false;
    setIsDragging(false);
    if (drag.moved) suppressClickRef.current = true;
  };

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

      <div className="grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
        <SeasonSelect value={year} onChange={setYear} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-500">Search race calendar</span>
          <div className="group flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition focus-within:border-red-400 focus-within:bg-red-500/10">
            <span className="text-zinc-500 group-focus-within:text-red-300">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search race, country, or circuit…"
              className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-400 hover:border-red-400 hover:text-red-300"
              >
                Clear
              </button>
            )}
          </div>
          <span className="text-xs text-zinc-600">
            {filteredRaceOptions.length} of {raceOptions.length} races shown
          </span>
        </label>
      </div>

      {!isLoading && !isError && raceOptions.length === 0 && (
        <p className="text-sm text-zinc-500">No sessions found for {year}.</p>
      )}

      {!isLoading && !isError && raceOptions.length > 0 && filteredRaceOptions.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-500">
          No races match “{search}”. Try a country, circuit, or Grand Prix name.
        </div>
      )}

      {filteredRaceOptions.length > 0 && (
        <div className="relative">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-300">Race carousel</div>
              <div className="text-xs text-zinc-600">Swipe or use arrows. Select a race to reveal sessions.</div>
            </div>
            <div className="hidden gap-2 sm:flex">
              <button
                type="button"
                onClick={() => scrollCarousel(-1)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300 hover:border-red-400 hover:text-red-300"
                aria-label="Scroll races left"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel(1)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300 hover:border-red-400 hover:text-red-300"
                aria-label="Scroll races right"
              >
                →
              </button>
            </div>
          </div>
          <div
            ref={carouselRef}
            onPointerDown={handleCarouselPointerDown}
            onPointerMove={handleCarouselPointerMove}
            onPointerUp={stopCarouselDrag}
            onPointerCancel={stopCarouselDrag}
            onPointerLeave={stopCarouselDrag}
            className={`flex gap-4 overflow-x-auto pb-3 [scrollbar-color:#71717a_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-500 [&::-webkit-scrollbar-track]:bg-transparent ${
              isDragging ? "cursor-grabbing snap-none select-none" : "cursor-grab snap-x"
            }`}
          >
            {filteredRaceOptions.map((race) => {
              const isSelected = race.meetingKey === meetingKey;
              const feature = circuitMaps.data
                ? findCircuit(circuitMaps.data.features, race.circuitName, race.countryName)
                : null;
              return (
                <button
                  key={race.meetingKey}
                  type="button"
                  onClick={() => {
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false;
                      return;
                    }
                    setMeetingKey(race.meetingKey);
                  }}
                  className={`group relative min-w-[290px] snap-start overflow-hidden rounded-2xl border p-4 text-left transition sm:min-w-[340px] ${
                    isSelected
                      ? "border-red-400 bg-red-500/10 shadow-lg shadow-red-500/10"
                      : "border-white/10 bg-white/[0.035] hover:border-red-400 hover:bg-red-500/10 hover:shadow-lg hover:shadow-red-500/10"
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-red-500 opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-black text-zinc-100">{race.countryName} GP</div>
                      <div className="mt-1 truncate text-xs text-zinc-500">{race.circuitName}</div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                        race.isUpcoming
                          ? "bg-amber-400/10 text-amber-300 ring-1 ring-amber-300/20"
                          : "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-300/20"
                      }`}
                    >
                      {race.isUpcoming ? "Future race" : "Telemetry ready"}
                    </span>
                  </div>
                  <MiniCircuitMap feature={feature} selected={isSelected} />
                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-zinc-500">
                    <span>{formatRaceDate(race.firstStartTimeUtc, race.lastEndTimeUtc)}</span>
                    <span>{race.sessionCount} sessions</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 text-sm text-zinc-500">Sessions</div>
        {sessionsForMeeting.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-500">
            Select a race card to see its sessions.
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
  );
}
