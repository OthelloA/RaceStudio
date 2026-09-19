"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Driver, Lap, PositionEntry, TeamRadioMessage } from "@/lib/domain/types";
import { getDriverColor } from "@/lib/domain/driverColors";
import { useLaps } from "@/hooks/useLaps";
import { usePositions } from "@/hooks/usePositions";
import { useTeamRadio } from "@/hooks/useTeamRadio";
import { usePlaybackStore } from "@/stores/playbackStore";
import { RadioPlayer } from "./RadioPlayer";
import { Spinner } from "@/components/ui/Spinner";

function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  return `${(ms / 1000).toFixed(3)}s`;
}

function currentPositionForDriver(positions: PositionEntry[] | undefined, driverNumber: number, timeMs: number): number | null {
  return positions?.filter((entry) => entry.driverNumber === driverNumber && entry.tOffsetMs <= timeMs).at(-1)?.position ?? null;
}

function currentLapForDriver(laps: Lap[] | undefined, driverNumber: number, timeMs: number): Lap | null {
  const driverLaps = laps?.filter((lap) => lap.driverNumber === driverNumber) ?? [];
  let current: Lap | null = null;
  for (const lap of driverLaps) {
    if (lap.startOffsetMs <= timeMs) current = lap;
    else break;
  }
  return current;
}

function bestCompletedLap(laps: Lap[] | undefined): Lap | null {
  return laps?.filter((lap) => lap.durationMs !== null).sort((a, b) => (a.durationMs ?? Infinity) - (b.durationMs ?? Infinity))[0] ?? null;
}

function bestCompletedLapForDriver(laps: Lap[] | undefined, driverNumber: number): Lap | null {
  return laps?.filter((lap) => lap.driverNumber === driverNumber && lap.durationMs !== null).sort((a, b) => (a.durationMs ?? Infinity) - (b.durationMs ?? Infinity))[0] ?? null;
}

function bestSector(laps: Lap[], driverNumber: number, sector: 1 | 2 | 3): number | null {
  const key = sector === 1 ? "sector1Ms" : sector === 2 ? "sector2Ms" : "sector3Ms";
  return laps.filter((lap) => lap.driverNumber === driverNumber && lap[key] !== null).sort((a, b) => (a[key] ?? Infinity) - (b[key] ?? Infinity))[0]?.[key] ?? null;
}

function radioFeed(messages: TeamRadioMessage[] | undefined, drivers: Driver[], timeMs: number) {
  const driversByNumber = new Map(drivers.map((driver) => [driver.number, driver]));
  return (messages ?? [])
    .filter((message) => message.startOffsetMs <= timeMs)
    .sort((a, b) => b.startOffsetMs - a.startOffsetMs)
    .slice(0, 5)
    .map((message) => ({ message, driver: driversByNumber.get(message.driverNumber) }));
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 shadow-inner">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</div>
      {children}
    </div>
  );
}

export function RaceContextPanel({ sessionKey, drivers }: { sessionKey: number; drivers: Driver[] }) {
  const { data: positions, isLoading, isError } = usePositions(sessionKey);
  const { data: laps } = useLaps(sessionKey);
  const { data: radioMessages } = useTeamRadio(sessionKey);
  const [autoPlayRadio, setAutoPlayRadio] = useState(false);
  const radioFeedRef = useRef<HTMLDivElement>(null);
  const currentTimeMs = usePlaybackStore((s) => s.currentTimeMs);
  const activeDriverNumbers = usePlaybackStore((s) => s.activeDriverNumbers);
  const toggleActiveDriver = usePlaybackStore((s) => s.toggleActiveDriver);

  const currentPositions = useMemo(
    () =>
      drivers
        .map((driver) => {
          const position = currentPositionForDriver(positions, driver.number, currentTimeMs);
          return position === null ? null : { driver, position };
        })
        .filter((entry): entry is { driver: Driver; position: number } => entry !== null)
        .sort((a, b) => a.position - b.position),
    [positions, drivers, currentTimeMs]
  );

  const topFive = currentPositions.slice(0, 5);
  const focused = activeDriverNumbers
    .map((number) => drivers.find((driver) => driver.number === number))
    .filter((driver): driver is Driver => driver !== undefined);
  const fastestLap = bestCompletedLap(laps);
  const fastestLapDriver = drivers.find((driver) => driver.number === fastestLap?.driverNumber);
  const leader = currentPositions[0]?.driver;
  const second = currentPositions[1]?.driver;
  const sectorDrivers = focused.length === 2 ? focused : [leader, second].filter((driver): driver is Driver => driver !== undefined);
  const playByPlay = radioFeed(radioMessages, drivers, currentTimeMs);
  const latestRadioKey = playByPlay[0]
    ? `${playByPlay[0].message.driverNumber}-${playByPlay[0].message.startOffsetMs}`
    : null;

  useEffect(() => {
    radioFeedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [latestRadioKey]);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-4 text-zinc-100 shadow-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-300">
          Race Control
        </h2>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>playback context</span>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">Live</span>
        </div>
      </div>

      {isLoading && <p className="flex items-center gap-2 text-sm text-zinc-400"><Spinner /> Loading race context…</p>}
      {isError && <p className="text-sm text-red-400">Failed to load race context.</p>}
      {!isLoading && !isError && topFive.length === 0 && <p className="text-sm text-zinc-400">No position data at this moment.</p>}

      {topFive.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-[minmax(280px,0.9fr)_repeat(3,minmax(0,1fr))]">
          <Card title="Top 5 now">
            <div className="flex flex-col gap-2">
              {topFive.map(({ driver, position }) => {
                const isActive = activeDriverNumbers.includes(driver.number);
                const color = getDriverColor(driver);
                return (
                  <button
                    key={driver.number}
                    type="button"
                    onClick={() => toggleActiveDriver(driver.number)}
                    className={`flex items-center gap-3 rounded-lg border p-2 text-left transition-colors ${isActive ? "border-white/30 bg-white/15 shadow-[0_0_24px_rgba(255,255,255,0.08)]" : "border-white/10 bg-zinc-900/60 hover:border-white/25 hover:bg-white/10"}`}
                  >
                    <div className="w-8 font-mono text-lg font-bold text-zinc-500">P{position}</div>
                    <span className="h-3 w-3 shrink-0 rounded-full shadow-[0_0_12px_currentColor]" style={{ backgroundColor: color, color }} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-100">{driver.fullName}</div>
                      <div className="text-xs text-zinc-500">{driver.nameAcronym} · #{driver.number}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title={focused.length === 2 ? "Battle watch" : "Leader watch"}>
            {sectorDrivers.length === 2 ? (
              <div className="space-y-2 text-sm text-zinc-300">
                <div className="grid grid-cols-2 gap-2">
                  {sectorDrivers.map((driver) => {
                    const position = currentPositionForDriver(positions, driver.number, currentTimeMs);
                    const lap = currentLapForDriver(laps, driver.number, currentTimeMs);
                    const bestLap = bestCompletedLapForDriver(laps, driver.number);
                    return (
                      <button
                        key={driver.number}
                        type="button"
                        onClick={() => toggleActiveDriver(driver.number)}
                        className="rounded-lg border border-white/10 bg-zinc-950/70 p-2 text-left transition hover:border-white/25 hover:bg-white/10"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getDriverColor(driver) }} />
                          <span className="truncate font-semibold text-zinc-100">{driver.nameAcronym}</span>
                        </div>
                        <div className="space-y-0.5 font-mono text-[11px] text-zinc-500">
                          <div>P{position ?? "—"}</div>
                          <div>Lap {lap?.lapNumber ?? "—"}</div>
                          <div>Best {formatMs(bestLap?.durationMs)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs text-zinc-400">
                  {focused.length === 2
                    ? "Showing selected driver battle. Click a card to toggle focus."
                    : "Defaulting to current P1/P2 until two drivers are focused."}
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Need two current leaders or two focused drivers.</p>
            )}
          </Card>

          <Card title="Play-by-play">
            <label className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-zinc-950/70 px-2 py-1.5 text-xs text-zinc-400">
              <span>Auto-play new radio</span>
              <input
                type="checkbox"
                checked={autoPlayRadio}
                onChange={(event) => setAutoPlayRadio(event.target.checked)}
                className="accent-emerald-400"
              />
            </label>
            {playByPlay.length > 0 ? (
              <div
                ref={radioFeedRef}
                className="max-h-64 space-y-2 overflow-y-auto pr-1 [scrollbar-color:#52525b_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-track]:bg-transparent"
              >
                {playByPlay.map(({ message, driver }, index) => (
                  <RadioPlayer
                    key={`${message.driverNumber}-${message.startOffsetMs}`}
                    message={message}
                    driver={driver}
                    autoPlay={autoPlayRadio && index === 0}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No team radio has occurred yet.</p>
            )}
          </Card>

          <Card title="Fastest / sectors">
            <div className="space-y-2 text-sm text-zinc-300">
              {sectorDrivers.length === 2 ? (
                <>
                  {(() => {
                    const a = bestCompletedLapForDriver(laps, sectorDrivers[0].number)?.durationMs ?? null;
                    const b = bestCompletedLapForDriver(laps, sectorDrivers[1].number)?.durationMs ?? null;
                    const delta = a !== null && b !== null ? Math.abs(a - b) : null;
                    const faster = a !== null && b !== null ? (a <= b ? sectorDrivers[0] : sectorDrivers[1]) : null;
                    return (
                      <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-2">
                        <div className="mb-1 text-xs font-semibold text-zinc-500">Best lap</div>
                        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                          <span>{sectorDrivers[0].nameAcronym}: {formatMs(a)}</span>
                          <span>{sectorDrivers[1].nameAcronym}: {formatMs(b)}</span>
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">Gap: {faster?.nameAcronym ?? "—"} {delta !== null ? `by ${formatMs(delta)}` : ""}</div>
                      </div>
                    );
                  })()}
                  <div className="space-y-1 border-t border-white/10 pt-2 text-xs">
                    <div className="font-semibold text-zinc-500">Best sectors: {sectorDrivers[0].nameAcronym} vs {sectorDrivers[1].nameAcronym}</div>
                    {[1, 2, 3].map((sector) => {
                      const a = bestSector(laps ?? [], sectorDrivers[0].number, sector as 1 | 2 | 3);
                      const b = bestSector(laps ?? [], sectorDrivers[1].number, sector as 1 | 2 | 3);
                      const delta = a !== null && b !== null ? Math.abs(a - b) : null;
                      const faster = a !== null && b !== null ? (a <= b ? sectorDrivers[0] : sectorDrivers[1]) : null;
                      return (
                        <div key={sector} className="rounded-lg border border-white/10 bg-zinc-950/70 p-2">
                          <div className="mb-1 flex justify-between gap-2">
                            <span className="font-semibold">S{sector}</span>
                            <span className="text-zinc-500">Gap: {faster?.nameAcronym ?? "—"} {delta !== null ? `by ${formatMs(delta)}` : ""}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 font-mono">
                            <span>{sectorDrivers[0].nameAcronym}: {formatMs(a)}</span>
                            <span>{sectorDrivers[1].nameAcronym}: {formatMs(b)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div>Fastest lap: {fastestLapDriver?.nameAcronym ?? "—"} {formatMs(fastestLap?.durationMs)}</div>
                  <div className="text-xs text-zinc-500">Need P1/P2 or two focused drivers.</div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
