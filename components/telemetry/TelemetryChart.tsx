"use client";

import { useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { CarDataFrame, Driver } from "@/lib/domain/types";
import { getDriverColor } from "@/lib/domain/driverColors";
import { usePlaybackStore } from "@/stores/playbackStore";
import { sampleSeries, type FieldMode } from "@/lib/time/sessionClock";

const WIDTH = 1000;
const HEIGHT = 160;
const MARGIN = { top: 12, right: 16, bottom: 28, left: 56 };

export interface TelemetrySeries {
  driver: Driver;
  data: CarDataFrame[];
}

type NumericField = "speed" | "throttle" | "brake" | "gear" | "rpm";

const LINE_PATTERNS = [undefined, "6 3", "2 3", "8 3 2 3"] as const;

function driverStroke(driver: Driver): string {
  return getDriverColor(driver);
}

function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

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
      y1={MARGIN.top}
      y2={HEIGHT - MARGIN.bottom}
      stroke="currentColor"
      className="text-red-500"
      strokeWidth={1.5}
    />
  );
}

function ValueReadouts({
  series,
  field,
  mode,
  unit,
}: {
  series: TelemetrySeries[];
  field: NumericField;
  mode: FieldMode;
  unit?: string;
}) {
  const currentTimeMs = usePlaybackStore((s) => s.currentTimeMs);

  const values = useMemo(
    () =>
      series.map(({ driver, data }) => {
        const frame = sampleSeries(data, currentTimeMs, {
          fields: [field],
          fieldModes: { [field]: mode },
        });
        return { driver, value: frame ? Math.round(frame[field]) : null };
      }),
    [series, currentTimeMs, field, mode]
  );

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-zinc-500">
      {values.map(({ driver, value }, index) => (
        <span key={driver.number} className="flex items-center gap-1">
          <span
            className="h-2 w-4 rounded-sm"
            style={{
              backgroundColor: driverStroke(driver),
              opacity: LINE_PATTERNS[index % LINE_PATTERNS.length] ? 0.75 : 1,
            }}
          />
          {driver.nameAcronym}: {value !== null ? `${value}${unit ?? ""}` : "—"}
        </span>
      ))}
    </div>
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
  windowMs,
}: {
  series: TelemetrySeries[];
  field: NumericField;
  label: string;
  unit?: string;
  mode?: FieldMode;
  startOffsetMs: number;
  endOffsetMs: number;
  windowMs: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverTimeMs, setHoverTimeMs] = useState<number | null>(null);
  const currentTimeMs = usePlaybackStore((s) => s.currentTimeMs);
  const seek = usePlaybackStore((s) => s.seek);

  const visibleRange = useMemo(() => {
    const halfWindow = windowMs / 2;
    let start = Math.max(startOffsetMs, currentTimeMs - halfWindow);
    let end = Math.min(endOffsetMs, currentTimeMs + halfWindow);

    if (end - start < windowMs && start === startOffsetMs) {
      end = Math.min(endOffsetMs, start + windowMs);
    }
    if (end - start < windowMs && end === endOffsetMs) {
      start = Math.max(startOffsetMs, end - windowMs);
    }

    return { start, end };
  }, [currentTimeMs, startOffsetMs, endOffsetMs, windowMs]);

  const xScale = useMemo(
    () =>
      d3
        .scaleLinear()
        .domain([visibleRange.start, visibleRange.end])
        .range([MARGIN.left, WIDTH - MARGIN.right]),
    [visibleRange]
  );

  const chart = useMemo(() => {
    const visibleValues = series.flatMap(({ data }) =>
      data
        .filter((frame) => frame.tOffsetMs >= visibleRange.start && frame.tOffsetMs <= visibleRange.end)
        .map((frame) => frame[field])
    );
    const [min, max] = d3.extent(visibleValues);
    const domain: [number, number] =
      min === max ? [min ?? 0, (max ?? 0) + 1] : [min ?? 0, max ?? 1];
    const yScale = d3
      .scaleLinear()
      .domain(domain)
      .nice(4)
      .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

    const line = d3
      .line<CarDataFrame>()
      .defined((frame) => frame.tOffsetMs >= visibleRange.start && frame.tOffsetMs <= visibleRange.end)
      .curve(mode === "step" ? d3.curveStepAfter : d3.curveMonotoneX)
      .x((frame) => xScale(frame.tOffsetMs))
      .y((frame) => yScale(frame[field]));

    return {
      yTicks: yScale.ticks(4),
      xTicks: xScale.ticks(5),
      yScale,
      paths: series.map(({ driver, data }, index) => ({
        driver,
        d: line(data) ?? "",
        stroke: driverStroke(driver),
        dash: LINE_PATTERNS[index % LINE_PATTERNS.length],
      })),
    };
  }, [series, field, xScale, mode, visibleRange]);

  const hoverValues = useMemo(() => {
    if (hoverTimeMs === null) return [];
    return series.map(({ driver, data }) => {
      const frame = sampleSeries(data, hoverTimeMs, {
        fields: [field],
        fieldModes: { [field]: mode },
      });
      return { driver, value: frame ? Math.round(frame[field]) : null };
    });
  }, [series, hoverTimeMs, field, mode]);

  function getRelativeX(event: React.MouseEvent<SVGSVGElement>): number | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return ((event.clientX - rect.left) / rect.width) * WIDTH;
  }

  function handleMouseMove(event: React.MouseEvent<SVGSVGElement>) {
    const relativeX = getRelativeX(event);
    if (relativeX === null) return;
    const clampedX = Math.min(Math.max(relativeX, MARGIN.left), WIDTH - MARGIN.right);
    setHoverTimeMs(xScale.invert(clampedX));
  }

  function handleClick(event: React.MouseEvent<SVGSVGElement>) {
    const relativeX = getRelativeX(event);
    if (relativeX === null) return;
    seek(xScale.invert(relativeX));
  }

  return (
    <div className="flex min-w-0 flex-col gap-1 overflow-hidden">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        <ValueReadouts series={series} field={field} mode={mode} unit={unit} />
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block w-full max-w-full cursor-pointer"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverTimeMs(null)}
      >
        {chart.yTicks.map((tick) => {
          const y = chart.yScale(tick);
          return (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={y}
                y2={y}
                className="stroke-zinc-200 dark:stroke-zinc-800"
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-zinc-500 text-[10px]"
              >
                {tick}{unit?.trim() ? ` ${unit.trim()}` : ""}
              </text>
            </g>
          );
        })}
        {chart.xTicks.map((tick) => {
          const x = xScale(tick);
          return (
            <g key={tick}>
              <line
                x1={x}
                x2={x}
                y1={MARGIN.top}
                y2={HEIGHT - MARGIN.bottom}
                className="stroke-zinc-100 dark:stroke-zinc-900"
                strokeWidth={1}
              />
              <text
                x={x}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="fill-zinc-500 text-[10px]"
              >
                {formatElapsedTime(tick - startOffsetMs)}
              </text>
            </g>
          );
        })}
        <line
          x1={MARGIN.left}
          x2={WIDTH - MARGIN.right}
          y1={HEIGHT - MARGIN.bottom}
          y2={HEIGHT - MARGIN.bottom}
          className="stroke-zinc-300 dark:stroke-zinc-700"
          strokeWidth={1}
        />
        <line
          x1={MARGIN.left}
          x2={MARGIN.left}
          y1={MARGIN.top}
          y2={HEIGHT - MARGIN.bottom}
          className="stroke-zinc-300 dark:stroke-zinc-700"
          strokeWidth={1}
        />
        {chart.paths.map(({ driver, d, stroke, dash }) => (
          <path
            key={driver.number}
            d={d}
            fill="none"
            stroke={stroke}
            strokeDasharray={dash}
            strokeWidth={1.8}
            opacity={0.9}
          />
        ))}
        {hoverTimeMs !== null && (
          <g>
            <line
              x1={xScale(hoverTimeMs)}
              x2={xScale(hoverTimeMs)}
              y1={MARGIN.top}
              y2={HEIGHT - MARGIN.bottom}
              className="stroke-zinc-900 dark:stroke-zinc-100"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <g
              transform={`translate(${Math.min(
                xScale(hoverTimeMs) + 10,
                WIDTH - MARGIN.right - 150
              )}, ${MARGIN.top + 6})`}
            >
              <rect
                width={150}
                height={24 + hoverValues.length * 16}
                rx={6}
                className="fill-white/95 stroke-zinc-200 dark:fill-zinc-900/95 dark:stroke-zinc-700"
              />
              <text x={8} y={16} className="fill-zinc-500 text-[10px] font-medium">
                +{formatElapsedTime(hoverTimeMs - startOffsetMs)}
              </text>
              {hoverValues.map(({ driver, value }, index) => (
                <text
                  key={driver.number}
                  x={8}
                  y={34 + index * 16}
                  className="fill-zinc-700 text-[11px] dark:fill-zinc-200"
                >
                  <tspan fill={driverStroke(driver)}>●</tspan>{" "}
                  {driver.nameAcronym}: {value !== null ? `${value}${unit ?? ""}` : "—"}
                </text>
              ))}
            </g>
          </g>
        )}
        <Playhead startOffsetMs={startOffsetMs} endOffsetMs={endOffsetMs} xScale={xScale} />
      </svg>
    </div>
  );
}
