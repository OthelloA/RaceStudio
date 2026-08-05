"use client";

import type { Driver, PitStop } from "@/lib/domain/types";
import { usePlaybackStore } from "@/stores/playbackStore";
import { usePitStops } from "@/hooks/usePitStops";
import { usePositions } from "@/hooks/usePositions";
import { usePlaybackFrame } from "@/hooks/usePlaybackFrame";

function PitBadge({
  driverNumber,
  stops,
}: {
  driverNumber: number;
  stops: PitStop[] | undefined;
}) {
  const currentTimeMs = usePlaybackStore((s) => s.currentTimeMs);

  const activeStop = stops?.find(
    (stop) =>
      stop.driverNumber === driverNumber &&
      stop.pitDurationMs !== null &&
      currentTimeMs >= stop.startOffsetMs &&
      currentTimeMs <= stop.startOffsetMs + stop.pitDurationMs
  );

  if (!activeStop || activeStop.pitDurationMs === null) return null;

  const elapsedS = (currentTimeMs - activeStop.startOffsetMs) / 1000;
  const totalS = activeStop.pitDurationMs / 1000;

  return (
    <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
      PIT {elapsedS.toFixed(1)}/{totalS.toFixed(1)}s
    </span>
  );
}

const POSITION_FIELDS: Array<"position"> = ["position"];

function PositionBadge({
  sessionKey,
  driverNumber,
}: {
  sessionKey: number;
  driverNumber: number;
}) {
  const { data: positions } = usePositions(sessionKey);
  const driverPositions = positions?.filter((p) => p.driverNumber === driverNumber);
  const frame = usePlaybackFrame(driverPositions, POSITION_FIELDS, {
    position: "step",
  });

  return (
    <span className="w-5 shrink-0 font-mono text-xs font-semibold text-zinc-400">
      {frame ? `P${Math.round(frame.position)}` : "—"}
    </span>
  );
}

function DriverSidebarRow({
  sessionKey,
  driver,
  pitStops,
}: {
  sessionKey: number;
  driver: Driver;
  pitStops: PitStop[] | undefined;
}) {
  const isActive = usePlaybackStore((s) => s.activeDriverNumbers.includes(driver.number));
  const toggleActiveDriver = usePlaybackStore((s) => s.toggleActiveDriver);

  return (
    <button
      type="button"
      onClick={() => toggleActiveDriver(driver.number)}
      className={`flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left text-sm transition-colors ${
        isActive
          ? "border-zinc-900 bg-zinc-100 dark:border-zinc-50 dark:bg-zinc-800"
          : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
      }`}
    >
      <PositionBadge sessionKey={sessionKey} driverNumber={driver.number} />
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: `#${driver.teamColor}` }}
      />
      <span className="font-mono font-semibold">{driver.nameAcronym}</span>
      <span className="text-xs text-zinc-500">#{driver.number}</span>
      <PitBadge driverNumber={driver.number} stops={pitStops} />
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
  const { data: positions } = usePositions(sessionKey);
  // Fetched once for the whole session (not per-driver) to avoid firing ~20
  // simultaneous requests at OpenF1, which trips their rate limit (429).
  const { data: pitStops } = usePitStops(sessionKey);
  // Positions change at most a few times a lap — resorting on every RAF tick
  // (currentTimeMs changes 60x/sec) would re-render the whole list for no
  // visual benefit, so round to the nearest second before subscribing.
  const currentTimeSec = usePlaybackStore((s) => Math.floor(s.currentTimeMs / 1000));

  const sorted = [...drivers].sort((a, b) => {
    const posA = positions
      ?.filter((p) => p.driverNumber === a.number && p.tOffsetMs <= currentTimeSec * 1000)
      .at(-1)?.position;
    const posB = positions
      ?.filter((p) => p.driverNumber === b.number && p.tOffsetMs <= currentTimeSec * 1000)
      .at(-1)?.position;
    return (posA ?? a.number) - (posB ?? b.number);
  });

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-zinc-200 p-3 dark:border-zinc-800">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Drivers
      </h2>
      {sorted.map((driver) => (
        <DriverSidebarRow
          key={driver.number}
          sessionKey={sessionKey}
          driver={driver}
          pitStops={pitStops}
        />
      ))}
    </aside>
  );
}
