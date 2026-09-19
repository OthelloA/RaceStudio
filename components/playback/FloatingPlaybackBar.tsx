"use client";

import { useMemo, useState } from "react";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useLaps } from "@/hooks/useLaps";
import type { Lap } from "@/lib/domain/types";

const SPEEDS = [0.5, 1, 2, 4];

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function FloatingPlaybackBar({
  sessionKey,
  driverNumber,
}: {
  sessionKey: number;
  driverNumber: number;
}) {
  const [hoveredLap, setHoveredLap] = useState<Lap | null>(null);
  const currentTimeMs = usePlaybackStore((s) => s.currentTimeMs);
  const startOffsetMs = usePlaybackStore((s) => s.startOffsetMs);
  const endOffsetMs = usePlaybackStore((s) => s.endOffsetMs);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const playbackSpeed = usePlaybackStore((s) => s.playbackSpeed);
  const play = usePlaybackStore((s) => s.play);
  const pause = usePlaybackStore((s) => s.pause);
  const seek = usePlaybackStore((s) => s.seek);
  const setSpeed = usePlaybackStore((s) => s.setSpeed);
  const { data: laps } = useLaps(sessionKey, driverNumber);

  const rangeMs = endOffsetMs - startOffsetMs;
  const elapsedMs = currentTimeMs - startOffsetMs;
  const currentLap = useMemo(() => {
    if (!laps || laps.length === 0) return null;
    let current: Lap | null = null;
    for (const lap of laps) {
      if (lap.startOffsetMs <= currentTimeMs) current = lap;
      else break;
    }
    return current;
  }, [laps, currentTimeMs]);

  return (
    <div className="flex w-full flex-col gap-2 rounded-xl border border-zinc-200 bg-white/85 p-3 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/85">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => (isPlaying ? pause() : play())}
          className="rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => seek(startOffsetMs)}
          className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
        >
          Reset
        </button>
        <select
          value={playbackSpeed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {SPEEDS.map((speed) => (
            <option key={speed} value={speed}>
              {speed}x
            </option>
          ))}
        </select>
        <span className="rounded bg-zinc-100 px-2 py-1 font-mono text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {formatElapsed(elapsedMs)}
        </span>
        <span className="rounded bg-zinc-900 px-2 py-1 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
          Lap {currentLap?.lapNumber ?? "—"}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <input
          type="range"
          min={startOffsetMs}
          max={endOffsetMs}
          value={currentTimeMs}
          onChange={(e) => seek(Number(e.target.value))}
          className="w-full"
        />
        <div className="relative h-5" onMouseLeave={() => setHoveredLap(null)}>
          {hoveredLap && rangeMs > 0 && (
            <div
              className="pointer-events-none absolute bottom-4 z-10 -translate-x-1/2 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
              style={{
                left: `${((hoveredLap.startOffsetMs - startOffsetMs) / rangeMs) * 100}%`,
              }}
            >
              <div className="font-semibold">Lap {hoveredLap.lapNumber}</div>
              <div className="whitespace-nowrap text-zinc-500">
                +{formatElapsed(hoveredLap.startOffsetMs - startOffsetMs)}
                {hoveredLap.durationMs !== null ? ` · ${(hoveredLap.durationMs / 1000).toFixed(3)}s` : ""}
              </div>
            </div>
          )}
          {laps
            ?.filter(
              (lap) => lap.startOffsetMs >= startOffsetMs && lap.startOffsetMs <= endOffsetMs
            )
            .map((lap) => (
              <button
                key={lap.lapNumber}
                type="button"
                aria-label={`Seek to lap ${lap.lapNumber}`}
                onMouseEnter={() => setHoveredLap(lap)}
                onFocus={() => setHoveredLap(lap)}
                onClick={() => seek(lap.startOffsetMs)}
                className="absolute top-1 h-3 w-1 -translate-x-1/2 rounded-full bg-zinc-400 transition hover:h-4 hover:bg-zinc-900 dark:hover:bg-zinc-100"
                style={{
                  left: `${((lap.startOffsetMs - startOffsetMs) / rangeMs) * 100}%`,
                }}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
