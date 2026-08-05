"use client";

import { useMemo, useRef } from "react";
import * as d3 from "d3";
import type { CarDataFrame } from "@/lib/domain/types";
import { usePlaybackStore } from "@/stores/playbackStore";
import { usePlaybackFrame } from "@/hooks/usePlaybackFrame";
import type { FieldMode } from "@/lib/time/sessionClock";

const WIDTH = 1000;
const HEIGHT = 120;
const PADDING_Y = 10;

type NumericField = "speed" | "throttle" | "brake" | "gear" | "rpm";

function Playhead({
  startOffsetMs,
  endOffsetMs,
  xScale,
}: {
  startOffsetMs: number;
  endOffsetMs: number;
  xScale: d3.ScaleLinear<number, number>;
}) {
  const currentTimeMs = usePlaybackStore((s) => s.currentTimeMs);
  const x = xScale(Math.min(Math.max(currentTimeMs, startOffsetMs), endOffsetMs));

  return (
    <line
      x1={x}
      x2={x}
      y1={0}
      y2={HEIGHT}
      stroke="currentColor"
      className="text-red-500"
      strokeWidth={1.5}
    />
  );
}

function ValueReadout({
  series,
  field,
  mode,
  unit,
}: {
  series: CarDataFrame[];
  field: NumericField;
  mode: FieldMode;
  unit?: string;
}) {
  const fields = useMemo(() => [field], [field]);
  const fieldModes = useMemo(() => ({ [field]: mode }), [field, mode]);
  const frame = usePlaybackFrame(series, fields, fieldModes);
  const value = frame ? Math.round(frame[field]) : null;

  return (
    <span className="font-mono text-xs text-zinc-500">
      {value !== null ? `${value}${unit ?? ""}` : "—"}
    </span>
  );
}

export function TelemetryChart({
  series,
  field,
  label,
  unit,
  mode = "linear",
  startOffsetMs,
  endOffsetMs,
}: {
  series: CarDataFrame[];
  field: NumericField;
  label: string;
  unit?: string;
  mode?: FieldMode;
  startOffsetMs: number;
  endOffsetMs: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const seek = usePlaybackStore((s) => s.seek);

  const xScale = useMemo(
    () => d3.scaleLinear().domain([startOffsetMs, endOffsetMs]).range([0, WIDTH]),
    [startOffsetMs, endOffsetMs]
  );

  const pathD = useMemo(() => {
    const values = series.map((frame) => frame[field]);
    const [min, max] = d3.extent(values);
    const yScale = d3
      .scaleLinear()
      .domain([min ?? 0, max ?? 1])
      .range([HEIGHT - PADDING_Y, PADDING_Y]);

    const line = d3
      .line<CarDataFrame>()
      .curve(mode === "step" ? d3.curveStepAfter : d3.curveMonotoneX)
      .x((frame) => xScale(frame.tOffsetMs))
      .y((frame) => yScale(frame[field]));

    return line(series) ?? "";
  }, [series, field, xScale, mode]);

  function handleClick(event: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    seek(xScale.invert(relativeX));
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        <ValueReadout series={series} field={field} mode={mode} unit={unit} />
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full cursor-pointer"
        onClick={handleClick}
      >
        <path d={pathD} fill="none" stroke="currentColor" strokeWidth={1.5} />
        <Playhead startOffsetMs={startOffsetMs} endOffsetMs={endOffsetMs} xScale={xScale} />
      </svg>
    </div>
  );
}
