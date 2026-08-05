"use client";

import { usePlaybackStore } from "@/stores/playbackStore";
import { useLaps } from "@/hooks/useLaps";

const SPEEDS = [0.5, 1, 2, 4];

export function FloatingPlaybackBar({
  sessionKey,
  driverNumber,
}: {
  sessionKey: number;
  driverNumber: number;
}) {
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
  const elapsedS = (currentTimeMs - startOffsetMs) / 1000;

  return (
    <div className="fixed bottom-4 left-1/2 z-20 flex w-[min(90vw,720px)] -translate-x-1/2 flex-col gap-2 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
      <div className="flex items-center gap-3">
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
        <span className="font-mono text-sm text-zinc-500">{elapsedS.toFixed(1)}s</span>
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
        <div className="relative h-2">
          {laps
            ?.filter(
              (lap) => lap.startOffsetMs >= startOffsetMs && lap.startOffsetMs <= endOffsetMs
            )
            .map((lap) => (
              <button
                key={lap.lapNumber}
                type="button"
                title={`Lap ${lap.lapNumber}`}
                onClick={() => seek(lap.startOffsetMs)}
                className="absolute top-0 h-2 w-px -translate-x-1/2 bg-zinc-400 hover:bg-zinc-600"
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
