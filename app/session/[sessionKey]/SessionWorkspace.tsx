"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/hooks/useSessionData";
import { useDrivers } from "@/hooks/useDrivers";
import { useReplaySeed } from "@/hooks/useReplaySeed";
import { usePlaybackStore } from "@/stores/playbackStore";
import { usePlaybackClockDriver } from "@/hooks/usePlaybackClockDriver";
import { findActiveDataRange } from "@/lib/time/sessionClock";
import Link from "next/link";
import { FloatingPlaybackBar } from "@/components/playback/FloatingPlaybackBar";
import { TelemetryPanel } from "@/components/telemetry/TelemetryPanel";
import { TrackReplay } from "@/components/track/TrackReplay";
import { TrackLoadingSkeleton } from "@/components/track/TrackLoadingSkeleton";
import { DriverPanel } from "@/components/driver-panel/DriverPanel";
import { DriverSidebar } from "@/components/driver-panel/DriverSidebar";
import { RaceContextPanel } from "@/components/race-context/RaceContextPanel";

export function SessionWorkspace({ sessionKey }: { sessionKey: number }) {
  usePlaybackClockDriver();

  const {
    data: session,
    isError: sessionError,
    isLoading: isSessionLoading,
  } = useSession(sessionKey);
  const {
    data: drivers,
    isError: driversError,
    isLoading: isDriversLoading,
  } = useDrivers(sessionKey);
  const replaySeed = useReplaySeed(sessionKey, drivers);
  const primaryCarData = replaySeed.seed?.carData;
  const primaryLaps = replaySeed.seed?.laps;
  const primaryLocation = replaySeed.seed?.location;
  const loadSession = usePlaybackStore((s) => s.loadSession);
  const setActiveDrivers = usePlaybackStore((s) => s.setActiveDrivers);
  const activeDriverNumbers = usePlaybackStore((s) => s.activeDriverNumbers);

  const [isDriverDrawerOpen, setIsDriverDrawerOpen] = useState(false);
  const [enteredSessionKey, setEnteredSessionKey] = useState<number | null>(null);
  const hasEnteredSession = enteredSessionKey === sessionKey;
  const hasInitializedFocus = useRef(false);

  // OpenF1 telemetry rarely aligns with the official session window (it can
  // start earlier and end earlier), and includes garage/formation time at
  // speed 0 on both ends — derive playback bounds from when the car was
  // actually moving rather than trusting date_start/date_end or the raw
  // first/last sample.
  const dataRange = useMemo(() => {
    const raceStartOffsetMs = primaryLaps?.find((lap) => lap.lapNumber === 1)?.startOffsetMs;

    if (primaryCarData && primaryCarData.length > 0) {
      const activeRange = findActiveDataRange(primaryCarData);
      return {
        startOffsetMs:
          session?.sessionType === "Race" && raceStartOffsetMs !== undefined
            ? raceStartOffsetMs
            : activeRange.startOffsetMs,
        endOffsetMs: activeRange.endOffsetMs,
      };
    }

    // Some OpenF1 sessions/drivers have location data but no car_data/laps. Do
    // not trap the user on the staging screen forever; use the map timeline as
    // the playable range when telemetry is missing.
    if (primaryLocation && primaryLocation.length > 0) {
      return {
        startOffsetMs:
          session?.sessionType === "Race" && raceStartOffsetMs !== undefined
            ? raceStartOffsetMs
            : primaryLocation[0].tOffsetMs,
        endOffsetMs: primaryLocation[primaryLocation.length - 1].tOffsetMs,
      };
    }

    if (session && replaySeed.isComplete) {
      return {
        startOffsetMs: 0,
        endOffsetMs: Math.max(session.durationMs || 0, 1),
      };
    }

    return null;
  }, [primaryCarData, primaryLaps, primaryLocation, session, replaySeed.isComplete]);

  useEffect(() => {
    if (session && dataRange) {
      loadSession(sessionKey, dataRange.startOffsetMs, dataRange.endOffsetMs);
    }
  }, [session, dataRange, sessionKey, loadSession]);

  // Race sessions default to comparing the first two drivers; Practice and
  // Qualifying default to no one focused until the user picks from the roster.
  useEffect(() => {
    if (hasInitializedFocus.current || !session || !drivers || drivers.length === 0) {
      return;
    }
    hasInitializedFocus.current = true;
    const defaults = session.sessionType === "Race" ? drivers.slice(0, 2).map((d) => d.number) : [];
    setActiveDrivers(defaults);
  }, [session, drivers, setActiveDrivers]);

  if (sessionError || driversError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center shadow-2xl">
          <div className="text-sm font-bold text-red-400">Unable to stage replay</div>
          <p className="mt-2 text-sm text-zinc-400">
            {driversError
              ? "OpenF1 is rate-limiting or withholding the driver list. Give it a few seconds and retry."
              : `Failed to load session ${sessionKey}.`}
          </p>
        </div>
      </div>
    );
  }

  const isReplayReady = Boolean(session && drivers && drivers.length > 0 && dataRange && replaySeed.isComplete);

  if (!isReplayReady || !hasEnteredSession) {
    return (
      <TrackLoadingSkeleton
        sessionLoaded={!isSessionLoading && session !== undefined}
        driversLoaded={!isDriversLoading && drivers !== undefined && drivers.length > 0}
        telemetryLoaded={replaySeed.isComplete && primaryCarData !== undefined}
        lapsLoaded={replaySeed.isComplete && primaryLaps !== undefined}
        mapLoaded={replaySeed.isComplete && primaryLocation !== undefined}
        driverNames={drivers?.map((driver) => driver.nameAcronym || driver.fullName) ?? []}
        primaryLocation={primaryLocation}
        readyToEnter={isReplayReady}
        onEnter={() => setEnteredSessionKey(sessionKey)}
      />
    );
  }

  const readySession = session!;
  const seedDriverNumber = replaySeed.seed?.driver.number;
  const readyDrivers = seedDriverNumber
    ? [replaySeed.seed!.driver, ...drivers!.filter((driver) => driver.number !== seedDriverNumber)]
    : drivers!;
  const readyDataRange = dataRange!;
  const readyPrimaryLocation = primaryLocation ?? [];
  const focusedDrivers = readyDrivers.filter((d) => activeDriverNumbers.includes(d.number));

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_top_left,var(--team-theme-glow),transparent_34%),linear-gradient(135deg,#09090b_0%,#18181b_55%,#030712_100%)] text-zinc-100">
      <div
        className={`absolute inset-0 z-30 flex justify-end transition ${
          isDriverDrawerOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <button
          type="button"
          aria-label="Close driver drawer"
          className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
            isDriverDrawerOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsDriverDrawerOpen(false)}
        />
        <div
          className={`relative z-10 h-full w-72 border-l border-zinc-200 bg-white shadow-2xl transition-transform duration-300 ease-out dark:border-zinc-800 dark:bg-zinc-950 ${
            isDriverDrawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-zinc-200 p-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold">Drivers</h2>
            <button
              type="button"
              onClick={() => setIsDriverDrawerOpen(false)}
              className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
          <DriverSidebar sessionKey={sessionKey} drivers={readyDrivers} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/10 bg-zinc-950/75 px-4 py-2 backdrop-blur">
          <Link
            href="/"
            className="justify-self-start text-sm text-zinc-500 hover:text-zinc-100"
          >
            ← Sessions
          </Link>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-base font-semibold leading-tight">
              {readySession.countryName} — {readySession.circuitName}
            </h1>
            <p className="truncate text-xs text-zinc-500">{readySession.name}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsDriverDrawerOpen(true)}
            className="shrink-0 justify-self-end rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-bold hover:bg-white/10"
          >
            Drivers
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 pb-4 [scrollbar-color:#71717a_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-500 [&::-webkit-scrollbar-track]:bg-transparent lg:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)] lg:grid-rows-[minmax(580px,1fr)_auto]">
          <section className="flex min-h-0 min-w-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 p-3 shadow-2xl backdrop-blur">
            <TrackReplay
              sessionKey={sessionKey}
              drivers={readyDrivers}
              primaryLocation={readyPrimaryLocation}
            />
            <FloatingPlaybackBar sessionKey={sessionKey} driverNumber={readyDrivers[0].number} />
          </section>

          <aside className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/75 p-4 shadow-2xl backdrop-blur [scrollbar-color:#71717a_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-500 [&::-webkit-scrollbar-track]:bg-transparent">
            {focusedDrivers.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {focusedDrivers.map((driver) => (
                  <DriverPanel key={driver.number} sessionKey={sessionKey} driver={driver} />
                ))}
              </div>
            )}

            {focusedDrivers.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
                Open Drivers and select up to two drivers to compare telemetry.
              </div>
            ) : (
              <TelemetryPanel
                sessionKey={sessionKey}
                drivers={focusedDrivers}
                startOffsetMs={readyDataRange.startOffsetMs}
                endOffsetMs={readyDataRange.endOffsetMs}
              />
            )}
          </aside>

          <div className="lg:col-span-2">
            <RaceContextPanel sessionKey={sessionKey} drivers={readyDrivers} />
          </div>
        </div>
      </div>

    </div>
  );
}
