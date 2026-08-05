"use client";

import { useMemo } from "react";
import { usePlaybackStore } from "@/stores/playbackStore";
import {
  sampleSeries,
  type FieldMode,
  type TimedSample,
} from "@/lib/time/sessionClock";

export function usePlaybackFrame<T extends TimedSample>(
  series: T[] | undefined,
  fields: Array<keyof T>,
  fieldModes?: Partial<Record<keyof T, FieldMode>>
): T | null {
  const currentTimeMs = usePlaybackStore((s) => s.currentTimeMs);

  return useMemo(() => {
    if (!series || series.length === 0) return null;
    return sampleSeries(series, currentTimeMs, { fields, fieldModes });
  }, [series, currentTimeMs, fields, fieldModes]);
}
