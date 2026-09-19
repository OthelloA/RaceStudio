"use client";

import { useEffect, useRef, useState } from "react";
import type { Driver, TeamRadioMessage } from "@/lib/domain/types";
import { getDriverColor } from "@/lib/domain/driverColors";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatOffset(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function RadioPlayer({
  message,
  driver,
  autoPlay = false,
}: {
  message: TeamRadioMessage;
  driver?: Driver;
  autoPlay?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const color = driver ? getDriverColor(driver) : "#71717a";
  const progress = duration > 0 ? currentTime / duration : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !autoPlay) return;
    audio.play().then(() => setIsPlaying(true)).catch(() => {
      // Browser autoplay policy can reject playback despite user opt-in.
      setIsPlaying(false);
    });
  }, [autoPlay, message.recordingUrl]);

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }

  function seek(event: React.MouseEvent<HTMLButtonElement>) {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-3 shadow-inner">
      <audio
        ref={audioRef}
        src={message.recordingUrl}
        preload="none"
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_12px_currentColor]"
            style={{ backgroundColor: color, color }}
          />
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-zinc-100">
              {driver?.nameAcronym ?? `#${message.driverNumber}`} Radio
            </div>
            <div className="font-mono text-[10px] text-zinc-500">
              +{formatOffset(message.startOffsetMs)}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-zinc-950 transition hover:scale-105"
          aria-label={isPlaying ? "Pause radio" : "Play radio"}
        >
          {isPlaying ? "Ⅱ" : "▶"}
        </button>
      </div>

      <button
        type="button"
        onClick={seek}
        className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-800"
        aria-label="Seek radio message"
      >
        <span
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ width: `${progress * 100}%`, backgroundColor: color }}
        />
      </button>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-500">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
