"use client";

import { useMemo } from "react";
import * as d3 from "d3";
import type { LocationFrame } from "@/lib/domain/types";

// Samples further apart than this are treated as a genuine data gap and the
// line breaks there, rather than drawing a straight line across missing data.
const MAX_GAP_MS = 1000;

export function CircuitOutline({
  points,
  xScale,
  yScale,
  dashed = false,
}: {
  points: LocationFrame[];
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
  dashed?: boolean;
}) {
  const pathD = useMemo(() => {
    const sorted = [...points].sort((a, b) => a.tOffsetMs - b.tOffsetMs);
    const line = d3
      .line<LocationFrame>()
      .curve(d3.curveCatmullRom.alpha(0.5))
      .defined(
        (p, i) => i === 0 || p.tOffsetMs - sorted[i - 1].tOffsetMs <= MAX_GAP_MS
      )
      .x((p) => xScale(p.x))
      .y((p) => yScale(p.y));
    return line(sorted) ?? "";
  }, [points, xScale, yScale]);

  if (dashed) {
    return (
      <path
        d={pathD}
        fill="none"
        className="stroke-sky-400/70"
        strokeWidth={2}
        strokeDasharray="4 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  return (
    <g>
      <path
        d={pathD}
        fill="none"
        className="stroke-zinc-400 dark:stroke-zinc-600"
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={pathD}
        fill="none"
        className="stroke-zinc-500 dark:stroke-zinc-500"
        strokeWidth={1.5}
        strokeDasharray="6 8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </g>
  );
}
