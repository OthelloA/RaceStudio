"use client";

import { useMemo } from "react";
import type { Driver } from "@/lib/domain/types";
import { getDriverColor } from "@/lib/domain/driverColors";
import { usePlaybackStore } from "@/stores/playbackStore";
import { usePlaybackFrame } from "@/hooks/usePlaybackFrame";
import { useCarData } from "@/hooks/useCarData";
import { useLaps } from "@/hooks/useLaps";

const CAR_DATA_FIELDS: Array<"speed" | "gear"> = ["speed", "gear"];
const CAR_DATA_MODES = { gear: "step" as const };

export function DriverPanel({
  sessionKey,
  driver,
}: {
  sessionKey: number;
  driver: Driver;
}) {
  const currentTimeMs = usePlaybackStore((s) => s.currentTimeMs);
  const { data: carData } = useCarData(sessionKey, driver.number);
  const { data: laps } = useLaps(sessionKey, driver.number);
  const frame = usePlaybackFrame(carData, CAR_DATA_FIELDS, CAR_DATA_MODES);

  const currentLap = useMemo(() => {
    if (!laps || laps.length === 0) return null;
    let current = laps[0];
    for (const lap of laps) {
      if (lap.startOffsetMs <= currentTimeMs) current = lap;
      else break;
    }
    return current;
  }, [laps, currentTimeMs]);

  return (
    <div className="flex flex-col gap-2 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: getDriverColor(driver) }}
        />
        <span className="font-medium">{driver.fullName}</span>
        <span className="text-sm text-zinc-500">#{driver.number}</span>
      </div>
      <div className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span>Lap {currentLap?.lapNumber ?? "—"}</span>
        <span>{frame ? `${Math.round(frame.speed)} km/h` : "—"}</span>
        <span>Gear {frame ? Math.round(frame.gear) : "—"}</span>
      </div>
    </div>
  );
}
