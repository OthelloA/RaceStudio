"use client";

interface TrackLoadingSkeletonProps {
  sessionLoaded: boolean;
  driversLoaded: boolean;
  telemetryLoaded: boolean;
  lapsLoaded: boolean;
  mapLoaded: boolean;
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

export function TrackLoadingSkeleton({
  sessionLoaded,
  driversLoaded,
  telemetryLoaded,
  lapsLoaded,
  mapLoaded,
}: TrackLoadingSkeletonProps) {
  const state = { sessionLoaded, driversLoaded, telemetryLoaded, lapsLoaded, mapLoaded };
  const completed = STEPS.filter((step) => state[step.key]).length;
  const progress = completed / STEPS.length;
  const dashOffset = 1400 * (1 - progress);

  return (
    <div className="flex min-h-[520px] w-full items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Preparing replay</h2>
            <p className="text-sm text-zinc-500">Building the session map, timing, and telemetry streams.</p>
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
              d={TRACK_PATH}
              fill="none"
              className="stroke-zinc-300 dark:stroke-zinc-700"
              strokeWidth="18"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={TRACK_PATH}
              fill="none"
              stroke="#ef4444"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1400"
              strokeDashoffset={dashOffset}
              filter="url(#loading-glow)"
              className="transition-all duration-700 ease-out"
            />
            <circle r="7" fill="#ef4444" filter="url(#loading-glow)">
              <animateMotion dur="2.4s" repeatCount="indefinite" path={TRACK_PATH} />
            </circle>
          </svg>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
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
      </div>
    </div>
  );
}
