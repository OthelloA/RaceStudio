"use client";

import { useEffect, useMemo, useState } from "react";
import type { LocationFrame } from "@/lib/domain/types";

interface TrackLoadingSkeletonProps {
  sessionLoaded: boolean;
  driversLoaded: boolean;
  telemetryLoaded: boolean;
  lapsLoaded: boolean;
  mapLoaded: boolean;
  driverNames?: string[];
  primaryLocation?: LocationFrame[];
  readyToEnter?: boolean;
  onEnter?: () => void;
}

const STEPS = [
  { key: "sessionLoaded", label: "Session" },
  { key: "driversLoaded", label: "Drivers" },
  { key: "telemetryLoaded", label: "Telemetry" },
  { key: "lapsLoaded", label: "Laps" },
  { key: "mapLoaded", label: "Map" },
] as const;

const TRACK_PATH =
  "M88 190 C122 80 244 82 282 150 C313 206 225 246 274 303 C326 363 458 304 430 202 C405 109 504 96 522 184 C548 311 430 374 305 352 C188 332 98 300 88 190 Z";

function buildLocationPath(location: LocationFrame[]) {
  if (location.length < 2) return null;

  const sampleStep = Math.max(1, Math.floor(location.length / 900));
  const sampled = location.filter((_, index) => index % sampleStep === 0);
  const minX = Math.min(...sampled.map((point) => point.x));
  const maxX = Math.max(...sampled.map((point) => point.x));
  const minY = Math.min(...sampled.map((point) => point.y));
  const maxY = Math.max(...sampled.map((point) => point.y));
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const padding = 54;
  const scale = Math.min((600 - padding * 2) / width, (420 - padding * 2) / height);
  const renderedWidth = width * scale;
  const renderedHeight = height * scale;
  const offsetX = (600 - renderedWidth) / 2;
  const offsetY = (420 - renderedHeight) / 2;

  return sampled
    .map((point, index) => {
      const x = offsetX + (point.x - minX) * scale;
      const y = 420 - (offsetY + (point.y - minY) * scale);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function TrackLoadingSkeleton({
  sessionLoaded,
  driversLoaded,
  telemetryLoaded,
  lapsLoaded,
  mapLoaded,
  driverNames = [],
  primaryLocation,
  readyToEnter = false,
  onEnter,
}: TrackLoadingSkeletonProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const state = { sessionLoaded, driversLoaded, telemetryLoaded, lapsLoaded, mapLoaded };
  const completed = STEPS.filter((step) => state[step.key]).length;
  const progress = completed / STEPS.length;
  const actualTrackPath = useMemo(
    () => (primaryLocation && primaryLocation.length > 1 ? buildLocationPath(primaryLocation) : null),
    [primaryLocation]
  );
  const displayPath = actualTrackPath ?? TRACK_PATH;
  const dashOffset = 1400 * (1 - progress);
  const loadingMessages = useMemo(() => {
    const fallback = [
      "Rolling cars out of the garage…",
      "Warming tyres in the pit lane…",
      "Syncing timing loops…",
      "Race Control is lighting up…",
      "Building the circuit trace…",
    ];
    const driverActions = [
      "rolling out of the garage…",
      "warming the tyres…",
      "checking radio…",
      "crossing sector one…",
      "loading purple sectors…",
      "waiting at pit exit…",
      "lining up on the grid…",
      "telemetry feed online…",
    ];
    return driverNames.length > 0
      ? driverNames.map((name, index) => `${name} ${driverActions[index % driverActions.length]}`)
      : fallback;
  }, [driverNames]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => current + 1);
    }, 1400);
    return () => window.clearInterval(interval);
  }, []);

  const loadingMessage = loadingMessages[messageIndex % loadingMessages.length];

  return (
    <div className="flex min-h-[520px] w-full items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Preparing replay</h2>
            <p className="text-sm text-zinc-500">
              {actualTrackPath
                ? "Actual circuit trace acquired. Final systems are coming online."
                : "Building the session map, timing, and telemetry streams."}
            </p>
            <p className="mt-2 font-mono text-xs uppercase tracking-wide text-[var(--team-theme)]">{loadingMessage}</p>
          </div>
          <div className="font-mono text-sm text-zinc-500">{Math.round(progress * 100)}%</div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60">
          <svg viewBox="0 0 600 420" className="h-72 w-full">
            <defs>
              <pattern id="loading-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 28" fill="none" className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth="1" />
              </pattern>
              <filter id="loading-glow">
                <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect width="600" height="420" fill="url(#loading-grid)" opacity="0.55" />
            <path
              d={displayPath}
              fill="none"
              className="stroke-zinc-300 dark:stroke-zinc-700"
              strokeWidth="18"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={displayPath}
              fill="none"
              stroke="var(--team-theme)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1400"
              strokeDashoffset={dashOffset}
              filter="url(#loading-glow)"
              className="transition-all duration-700 ease-out"
            />
            <circle r="7" fill="var(--team-theme)" filter="url(#loading-glow)">
              <animateMotion dur="2.4s" repeatCount="indefinite" path={displayPath} />
            </circle>
          </svg>
        </div>

        {driverNames.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {driverNames.slice(0, 8).map((name) => (
              <span key={name} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-400">
                {name} loaded
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {STEPS.map((step) => {
            const done = state[step.key];
            return (
              <div
                key={step.key}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  done
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                    : "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                <div className="font-medium">{step.label}</div>
                <div className="text-xs opacity-70">{done ? "Ready" : "Loading"}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
          <div>
            <div className="text-sm font-bold text-zinc-100">
              {readyToEnter ? "Replay staged and ready." : "Race Control staging in progress."}
            </div>
            <div className="text-xs text-zinc-500">
              {readyToEnter
                ? "Primary telemetry, laps, and circuit trace are online."
                : "Launch unlocks once core replay data is ready."}
            </div>
          </div>
          <button
            type="button"
            disabled={!readyToEnter || !onEnter}
            onClick={onEnter}
            className="rounded-xl bg-[var(--team-theme)] px-5 py-2 text-sm font-black uppercase tracking-wide text-zinc-950 shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:shadow-none"
          >
            Let&apos;s go
          </button>
        </div>
      </div>
    </div>
  );
}
