import { useEffect, useMemo, useRef, useState } from "react";
import type { LocationFrame } from "@/lib/domain/types";

export type LocationDataByDriver = Record<number, LocationFrame[]>;
export type DriverLocationStatus = "queued" | "loading" | "loaded" | "missing" | "error";

export interface DriverLocationEvent {
  driverNumber: number;
  status: DriverLocationStatus;
  frameCount: number;
}

const CONCURRENCY_LIMIT = 3;

export function useLocationDataForDrivers(
  sessionKey: number,
  driverNumbers: number[]
) {
  const stableDriverNumbers = useMemo(
    () => [...new Set(driverNumbers)].sort((a, b) => a - b),
    [driverNumbers]
  );
  const driverKey = stableDriverNumbers.join(",");
  const runIdRef = useRef(0);
  const [data, setData] = useState<LocationDataByDriver>({});
  const [statuses, setStatuses] = useState<Record<number, DriverLocationStatus>>({});
  const [latestEvent, setLatestEvent] = useState<DriverLocationEvent | null>(null);

  useEffect(() => {
    const runId = ++runIdRef.current;
    const controller = new AbortController();
    const queue = [...stableDriverNumbers];
    let active = 0;

    function launchNext() {
      if (runId !== runIdRef.current || controller.signal.aborted) return;

      while (active < CONCURRENCY_LIMIT && queue.length > 0) {
        const driverNumber = queue.shift();
        if (driverNumber === undefined) return;
        active++;
        setStatuses((current) => ({ ...current, [driverNumber]: "loading" }));

        fetch(`/api/sessions/${sessionKey}/location?driver=${driverNumber}`, {
          signal: controller.signal,
        })
          .then(async (res): Promise<LocationFrame[]> => {
            if (!res.ok) throw new Error("Failed to load location data");
            return res.json();
          })
          .then((frames) => {
            if (runId !== runIdRef.current || controller.signal.aborted) return;
            const status: DriverLocationStatus = frames.length > 0 ? "loaded" : "missing";
            setData((current) => ({ ...current, [driverNumber]: frames }));
            setStatuses((current) => ({ ...current, [driverNumber]: status }));
            setLatestEvent({ driverNumber, status, frameCount: frames.length });
          })
          .catch((error: unknown) => {
            if (controller.signal.aborted) return;
            console.error(`Failed to load location for driver ${driverNumber}`, error);
            if (runId !== runIdRef.current) return;
            setStatuses((current) => ({ ...current, [driverNumber]: "error" }));
            setLatestEvent({ driverNumber, status: "error", frameCount: 0 });
          })
          .finally(() => {
            active--;
            launchNext();
          });
      }
    }

    queueMicrotask(() => {
      if (runId !== runIdRef.current || controller.signal.aborted) return;
      setData({});
      setLatestEvent(null);
      setStatuses(
        Object.fromEntries(stableDriverNumbers.map((driverNumber) => [driverNumber, "queued"]))
      );
      launchNext();
    });

    return () => {
      controller.abort();
    };
  }, [sessionKey, driverKey, stableDriverNumbers]);

  const loadedCount = Object.values(statuses).filter(
    (status) => status === "loaded" || status === "missing"
  ).length;
  const totalCount = stableDriverNumbers.length;
  const isLoading = loadedCount < totalCount;

  return {
    data,
    statuses,
    latestEvent,
    loadedCount,
    totalCount,
    isLoading,
  };
}
