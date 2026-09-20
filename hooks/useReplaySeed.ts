import { useEffect, useMemo, useRef, useState } from "react";
import type { CarDataFrame, Driver, Lap, LocationFrame } from "@/lib/domain/types";

interface ReplaySeed {
  driver: Driver;
  carData: CarDataFrame[];
  laps: Lap[];
  location: LocationFrame[];
}

interface SeedProbeEvent {
  driverNumber: number;
  driverLabel: string;
  message: string;
}

interface ReplaySeedState {
  seed: ReplaySeed | null;
  isLoading: boolean;
  isComplete: boolean;
  latestEvent: SeedProbeEvent | null;
  checkedCount: number;
  totalCount: number;
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

async function probeDriver(
  sessionKey: number,
  driver: Driver,
  signal: AbortSignal
): Promise<ReplaySeed> {
  const [carData, laps, location] = await Promise.all([
    fetchJson<CarDataFrame[]>(`/api/sessions/${sessionKey}/car-data?driver=${driver.number}`, signal).catch(() => []),
    fetchJson<Lap[]>(`/api/sessions/${sessionKey}/laps?driver=${driver.number}`, signal).catch(() => []),
    fetchJson<LocationFrame[]>(`/api/sessions/${sessionKey}/location?driver=${driver.number}`, signal).catch(() => []),
  ]);

  return { driver, carData, laps, location };
}

function hasUsableReplayData(seed: ReplaySeed) {
  return seed.location.length > 0 || seed.carData.length > 0;
}

export function useReplaySeed(sessionKey: number, drivers: Driver[] | undefined) {
  const stableDrivers = useMemo(() => drivers ?? [], [drivers]);
  const driverKey = stableDrivers.map((driver) => driver.number).join(",");
  const runIdRef = useRef(0);
  const [state, setState] = useState<ReplaySeedState>({
    seed: null,
    isLoading: false,
    isComplete: false,
    latestEvent: null,
    checkedCount: 0,
    totalCount: 0,
  });

  useEffect(() => {
    const runId = ++runIdRef.current;
    const controller = new AbortController();

    queueMicrotask(async () => {
      if (runId !== runIdRef.current || controller.signal.aborted) return;

      setState({
        seed: null,
        isLoading: stableDrivers.length > 0,
        isComplete: stableDrivers.length === 0,
        latestEvent: stableDrivers.length > 0
          ? {
              driverNumber: stableDrivers[0].number,
              driverLabel: stableDrivers[0].nameAcronym || stableDrivers[0].fullName,
              message: "Finding replay seed…",
            }
          : null,
        checkedCount: 0,
        totalCount: stableDrivers.length,
      });

      if (stableDrivers.length === 0) return;

      let fallbackSeed: ReplaySeed | null = null;

      for (let index = 0; index < stableDrivers.length; index++) {
        const driver = stableDrivers[index];
        const driverLabel = driver.nameAcronym || driver.fullName;

        if (runId !== runIdRef.current || controller.signal.aborted) return;
        setState((current) => ({
          ...current,
          latestEvent: {
            driverNumber: driver.number,
            driverLabel,
            message: `${driverLabel} leaving the garage…`,
          },
        }));

        const candidate = await probeDriver(sessionKey, driver, controller.signal);
        if (!fallbackSeed) fallbackSeed = candidate;

        if (runId !== runIdRef.current || controller.signal.aborted) return;

        if (hasUsableReplayData(candidate)) {
          setState({
            seed: candidate,
            isLoading: false,
            isComplete: true,
            latestEvent: {
              driverNumber: driver.number,
              driverLabel,
              message: candidate.location.length > 0
                ? `${driverLabel} circuit trace acquired.`
                : `${driverLabel} telemetry anchor locked.`,
            },
            checkedCount: index + 1,
            totalCount: stableDrivers.length,
          });
          return;
        }

        setState((current) => ({
          ...current,
          checkedCount: index + 1,
          latestEvent: {
            driverNumber: driver.number,
            driverLabel,
            message: `${driverLabel} feed unavailable, checking next car…`,
          },
        }));
      }

      if (runId !== runIdRef.current || controller.signal.aborted) return;
      setState({
        seed: fallbackSeed,
        isLoading: false,
        isComplete: true,
        latestEvent: fallbackSeed
          ? {
              driverNumber: fallbackSeed.driver.number,
              driverLabel: fallbackSeed.driver.nameAcronym || fallbackSeed.driver.fullName,
              message: "No telemetry anchor found. Opening empty replay shell.",
            }
          : null,
        checkedCount: stableDrivers.length,
        totalCount: stableDrivers.length,
      });
    });

    return () => {
      controller.abort();
    };
  }, [sessionKey, driverKey, stableDrivers]);

  return state;
}
