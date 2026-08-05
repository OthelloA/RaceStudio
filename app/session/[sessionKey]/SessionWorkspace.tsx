"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSession } from "@/hooks/useSessionData";
import { useDrivers } from "@/hooks/useDrivers";
import { useCarData } from "@/hooks/useCarData";
import { usePlaybackStore } from "@/stores/playbackStore";
import { usePlaybackClockDriver } from "@/hooks/usePlaybackClockDriver";
import { findActiveDataRange } from "@/lib/time/sessionClock";
import { FloatingPlaybackBar } from "@/components/playback/FloatingPlaybackBar";
import { TelemetryPanel } from "@/components/telemetry/TelemetryPanel";
import { TrackReplay } from "@/components/track/TrackReplay";
import { DriverPanel } from "@/components/driver-panel/DriverPanel";
import { DriverSidebar } from "@/components/driver-panel/DriverSidebar";
import { Spinner } from "@/components/ui/Spinner";

export function SessionWorkspace({ sessionKey }: { sessionKey: number }) {
  usePlaybackClockDriver();

  const { data: session, isError: sessionError } = useSession(sessionKey);
  const { data: drivers, isError: driversError } = useDrivers(sessionKey);
  const primaryDriverNumber = drivers?.[0]?.number;
  const { data: primaryCarData } = useCarData(sessionKey, primaryDriverNumber ?? 0);
  const loadSession = usePlaybackStore((s) => s.loadSession);
  const setActiveDrivers = usePlaybackStore((s) => s.setActiveDrivers);
  const activeDriverNumbers = usePlaybackStore((s) => s.activeDriverNumbers);

  const hasInitializedFocus = useRef(false);

  // OpenF1 telemetry rarely aligns with the official session window (it can
  // start earlier and end earlier), and includes garage/formation time at
  // speed 0 on both ends — derive playback bounds from when the car was
  // actually moving rather than trusting date_start/date_end or the raw
  // first/last sample.
  const dataRange = useMemo(() => {
    if (!primaryCarData || primaryCarData.length === 0) return null;
    return findActiveDataRange(primaryCarData);
  }, [primaryCarData]);

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
      <p className="text-sm text-red-600">
        Failed to load session {sessionKey}.
      </p>
    );
  }

  if (!session || !drivers || drivers.length === 0 || !dataRange) {
    return (
      <p className="flex items-center gap-2 text-sm text-zinc-500">
        <Spinner /> Loading session…
      </p>
    );
  }

  const focusedDrivers = drivers.filter((d) => activeDriverNumbers.includes(d.number));

  return (
    <div className="flex h-screen w-full">
      <DriverSidebar sessionKey={sessionKey} drivers={drivers} />

      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="flex flex-col gap-1 border-b border-zinc-200 p-4 dark:border-zinc-800">
          <h1 className="text-xl font-semibold">
            {session.countryName} — {session.circuitName}
          </h1>
          <p className="text-sm text-zinc-500">{session.name}</p>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 pb-28">
          <TrackReplay sessionKey={sessionKey} drivers={drivers} />

          {focusedDrivers.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {focusedDrivers.map((driver) => (
                <DriverPanel key={driver.number} sessionKey={sessionKey} driver={driver} />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-6">
            {focusedDrivers.length === 0 ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 p-8 text-sm text-zinc-500 dark:border-zinc-700">
                Select a driver from the sidebar to view their telemetry.
              </div>
            ) : (
              focusedDrivers.map((driver) => (
                <div key={driver.number}>
                  <h3 className="mb-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                    {driver.nameAcronym}
                  </h3>
                  <TelemetryPanel
                    sessionKey={sessionKey}
                    driverNumber={driver.number}
                    startOffsetMs={dataRange.startOffsetMs}
                    endOffsetMs={dataRange.endOffsetMs}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <FloatingPlaybackBar sessionKey={sessionKey} driverNumber={drivers[0].number} />
    </div>
  );
}
