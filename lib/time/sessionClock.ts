export interface TimedSample {
  tOffsetMs: number;
}

interface SpeedSample extends TimedSample {
  speed: number;
}

const IDLE_SPEED_THRESHOLD = 5;

/**
 * OpenF1 car_data commonly starts well before and ends well before the
 * actual on-track running (garage/formation time recorded at speed 0),
 * which otherwise eats scrubber/chart real estate and squeezes the real
 * action into a narrow band. Trims only the leading/trailing idle stretch;
 * mid-session gaps (red flags, pit stops) are left alone since they're
 * meaningful in-context breaks, not garage dead time.
 */
export function findActiveDataRange(series: SpeedSample[]): {
  startOffsetMs: number;
  endOffsetMs: number;
} {
  const firstActive = series.find((frame) => frame.speed > IDLE_SPEED_THRESHOLD);
  const lastActive = [...series]
    .reverse()
    .find((frame) => frame.speed > IDLE_SPEED_THRESHOLD);

  return {
    startOffsetMs: firstActive?.tOffsetMs ?? series[0]?.tOffsetMs ?? 0,
    endOffsetMs:
      lastActive?.tOffsetMs ?? series[series.length - 1]?.tOffsetMs ?? 0,
  };
}

export type FieldMode = "linear" | "step";

interface SampleOptions<T> {
  fields: Array<keyof T>;
  fieldModes?: Partial<Record<keyof T, FieldMode>>;
  /** Samples further apart than this are held (no interpolation) to avoid visually "teleporting" across gaps. */
  maxGapMs?: number;
}

function findBracket<T extends TimedSample>(
  series: T[],
  t: number
): { prev: T | null; next: T | null } {
  if (series.length === 0) return { prev: null, next: null };
  if (t <= series[0].tOffsetMs) return { prev: series[0], next: series[0] };

  const last = series[series.length - 1];
  if (t >= last.tOffsetMs) return { prev: last, next: last };

  let lo = 0;
  let hi = series.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (series[mid].tOffsetMs <= t) lo = mid;
    else hi = mid;
  }
  return { prev: series[lo], next: series[hi] };
}

/**
 * Returns a synthetic frame at time `t`, interpolating (or step-holding)
 * the requested fields between the two samples that bracket it.
 */
export function sampleSeries<T extends TimedSample>(
  series: T[],
  t: number,
  options: SampleOptions<T>
): T | null {
  const { prev, next } = findBracket(series, t);
  if (!prev || !next) return null;

  const result = { ...prev, tOffsetMs: t } as T;
  if (prev === next) return result;

  const gapMs = next.tOffsetMs - prev.tOffsetMs;
  const maxGapMs = options.maxGapMs ?? 1500;
  const ratio = gapMs > maxGapMs ? 0 : (t - prev.tOffsetMs) / gapMs;

  for (const field of options.fields) {
    const mode = options.fieldModes?.[field] ?? "linear";
    if (mode === "step" || gapMs > maxGapMs) {
      result[field] = prev[field];
    } else {
      const a = prev[field] as unknown as number;
      const b = next[field] as unknown as number;
      result[field] = (a + (b - a) * ratio) as unknown as T[typeof field];
    }
  }

  return result;
}
