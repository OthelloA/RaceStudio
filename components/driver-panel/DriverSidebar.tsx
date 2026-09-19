"use client";

import { useMemo, useState } from "react";
import type { Driver, Lap, PitStop, PositionEntry, Stint } from "@/lib/domain/types";
import { getDriverColor } from "@/lib/domain/driverColors";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useLaps } from "@/hooks/useLaps";
import { usePitStops } from "@/hooks/usePitStops";
import { usePositions } from "@/hooks/usePositions";
import { useStints } from "@/hooks/useStints";

type GapMode = "interval" | "leader";

function currentPosition(
  positions: PositionEntry[] | undefined,
  driverNumber: number,
  timeMs: number
): number | null {
  return (
    positions
      ?.filter((p) => p.driverNumber === driverNumber && p.tOffsetMs <= timeMs)
      .at(-1)?.position ?? null
  );
}

function currentLap(
  laps: Lap[] | undefined,
  driverNumber: number,
  timeMs: number
): Lap | null {
  const driverLaps = laps?.filter((lap) => lap.driverNumber === driverNumber) ?? [];
  let current: Lap | null = null;
  for (const lap of driverLaps) {
    if (lap.startOffsetMs <= timeMs) current = lap;
    else break;
  }
  return current;
}

function activeStint(stints: Stint[] | undefined, driverNumber: number, lapNumber: number | null) {
  if (lapNumber === null) return null;
  return (
    stints?.find(
      (stint) =>
        stint.driverNumber === driverNumber &&
        stint.lapStart <= lapNumber &&
        (stint.lapEnd === null || stint.lapEnd >= lapNumber)
    ) ?? null
  );
}

function pitState(stops: PitStop[] | undefined, driverNumber: number, timeMs: number) {
  const driverStops = stops?.filter((stop) => stop.driverNumber === driverNumber) ?? [];
  const active = driverStops.find(
    (stop) =>
      stop.pitDurationMs !== null &&
      timeMs >= stop.startOffsetMs &&
      timeMs <= stop.startOffsetMs + stop.pitDurationMs
  );
  if (active) return "PIT";
  if (driverStops.some((stop) => stop.startOffsetMs <= timeMs)) return "Pitted";
  return "No stop";
}

function intervalLabel(targetLap: Lap | null, referenceLap: Lap | null, fallback: string) {
  if (!targetLap || !referenceLap) return fallback;
  if (targetLap.lapNumber !== referenceLap.lapNumber) {
    const lapDelta = referenceLap.lapNumber - targetLap.lapNumber;
    return lapDelta === 0 ? fallback : `${lapDelta > 0 ? "+" : ""}${lapDelta}L`;
  }

  const gapMs = targetLap.startOffsetMs - referenceLap.startOffsetMs;
  if (gapMs <= 0) return "Leader";
  return `+${(gapMs / 1000).toFixed(1)}s`;
}

function compoundClass(compound: string | undefined) {
  switch (compound?.toUpperCase()) {
    case "SOFT":
      return "bg-red-500 text-white";
    case "MEDIUM":
      return "bg-yellow-400 text-zinc-950";
    case "HARD":
      return "bg-zinc-100 text-zinc-950";
    case "INTERMEDIATE":
      return "bg-emerald-500 text-white";
    case "WET":
      return "bg-blue-500 text-white";
    default:
      return "bg-zinc-700 text-zinc-200";
  }
}

function DriverSidebarRow({
  driver,
  position,
  gapLabel,
  lap,
  stint,
  pitLabel,
}: {
  driver: Driver;
  position: number | null;
  gapLabel: string;
  lap: Lap | null;
  stint: Stint | null;
  pitLabel: string;
}) {
  const isActive = usePlaybackStore((s) => s.activeDriverNumbers.includes(driver.number));
  const toggleActiveDriver = usePlaybackStore((s) => s.toggleActiveDriver);
  const compound = stint?.compound ?? "—";

  return (
    <button
      type="button"
      onClick={() => toggleActiveDriver(driver.number)}
      className={`w-full rounded-lg border p-2 text-left text-sm transition-colors ${
        isActive
          ? "border-zinc-900 bg-zinc-100 dark:border-zinc-50 dark:bg-zinc-800"
          : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="w-7 shrink-0 font-mono text-xs font-semibold text-zinc-400">
          {position !== null ? `P${position}` : "—"}
        </span>
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: getDriverColor(driver) }}
        />
        <span className="font-mono font-semibold">{driver.nameAcronym}</span>
        <span className="text-xs text-zinc-500">#{driver.number}</span>
        <span className="ml-auto font-mono text-xs text-zinc-500">{gapLabel}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-9 text-[10px]">
        <span className={`rounded-full px-1.5 py-0.5 font-semibold ${compoundClass(compound)}`}>
          {compound}
        </span>
        <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          {pitLabel}
        </span>
        <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          Lap {lap?.lapNumber ?? "—"}
        </span>
      </div>
    </button>
  );
}

export function DriverSidebar({
  sessionKey,
  drivers,
}: {
  sessionKey: number;
  drivers: Driver[];
}) {
  const [gapMode, setGapMode] = useState<GapMode>("interval");
  const { data: positions } = usePositions(sessionKey);
  const { data: pitStops } = usePitStops(sessionKey);
  const { data: laps } = useLaps(sessionKey);
  const { data: stints } = useStints(sessionKey);
  const currentTimeMs = usePlaybackStore((s) => s.currentTimeMs);
  const currentTimeSec = Math.floor(currentTimeMs / 1000);

  const rows = useMemo(() => {
    const withPosition = drivers
      .map((driver) => ({
        driver,
        position: currentPosition(positions, driver.number, currentTimeSec * 1000),
      }))
      .sort((a, b) => (a.position ?? a.driver.number) - (b.position ?? b.driver.number));

    const leaderPosition = withPosition[0]?.position ?? null;
    const leaderLap = withPosition[0]
      ? currentLap(laps, withPosition[0].driver.number, currentTimeMs)
      : null;

    return withPosition.map((row, index) => {
      const lap = currentLap(laps, row.driver.number, currentTimeMs);
      const stint = activeStint(stints, row.driver.number, lap?.lapNumber ?? null);
      const pitLabel = pitState(pitStops, row.driver.number, currentTimeMs);
      const ahead = withPosition[index - 1];
      const aheadLap = ahead ? currentLap(laps, ahead.driver.number, currentTimeMs) : null;
      const fallbackGap =
        gapMode === "leader"
          ? row.position !== null && leaderPosition !== null
            ? row.position === leaderPosition
              ? "Leader"
              : `+${row.position - leaderPosition} pos`
            : "—"
          : index === 0
            ? "Leader"
            : row.position !== null && ahead?.position !== null
              ? `+${row.position - ahead.position} pos`
              : "—";
      const gapLabel =
        gapMode === "leader"
          ? intervalLabel(lap, leaderLap, fallbackGap)
          : index === 0
            ? "Leader"
            : intervalLabel(lap, aheadLap, fallbackGap);

      return { ...row, lap, stint, pitLabel, gapLabel };
    });
  }, [drivers, positions, laps, stints, pitStops, currentTimeMs, currentTimeSec, gapMode]);

  return (
    <aside className="flex h-full w-full flex-col gap-2 overflow-y-auto p-3 [scrollbar-color:#71717a_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-500 [&::-webkit-scrollbar-track]:bg-transparent">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Drivers
        </h2>
        <div className="flex overflow-hidden rounded border border-zinc-300 text-[10px] dark:border-zinc-700">
          {(["interval", "leader"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setGapMode(mode)}
              className={`px-2 py-1 capitalize ${
                gapMode === mode
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
      {rows.map((row) => (
        <DriverSidebarRow
          key={row.driver.number}
          driver={row.driver}
          position={row.position}
          gapLabel={row.gapLabel}
          lap={row.lap}
          stint={row.stint}
          pitLabel={row.pitLabel}
        />
      ))}
    </aside>
  );
}
