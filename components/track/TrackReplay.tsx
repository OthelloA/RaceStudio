"use client";

import { useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { Driver, LocationFrame } from "@/lib/domain/types";
import { useLocationDataForDrivers } from "@/hooks/useLocationDataForDrivers";
import { useLaps } from "@/hooks/useLaps";
import { CircuitOutline } from "./CircuitOutline";
import { CarLayer } from "./CarLayer";
import { TrackReplay3D } from "./TrackReplay3D";

const WIDTH = 540;
const HEIGHT = 420;
const PADDING = 20;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

export function TrackReplay({
  sessionKey,
  drivers,
  primaryLocation,
}: {
  sessionKey: number;
  drivers: Driver[];
  primaryLocation: LocationFrame[];
}) {
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");

  const primaryDriver = drivers[0];
  const location = primaryLocation;
  const { data: laps } = useLaps(sessionKey, primaryDriver.number);

  const secondaryDrivers = useMemo(
    () => drivers.filter((driver) => driver.number !== primaryDriver.number),
    [drivers, primaryDriver.number]
  );
  const secondaryDriverNumbers = useMemo(
    () => secondaryDrivers.map((driver) => driver.number),
    [secondaryDrivers]
  );
  const { data: secondaryLocationByDriver } = useLocationDataForDrivers(
    sessionKey,
    secondaryDriverNumbers
  );
  const carLayerEntries = useMemo(() => {
    const entries: Array<{ driver: Driver; series: NonNullable<typeof location> }> = [];
    if (location) entries.push({ driver: primaryDriver, series: location });

    for (const driver of secondaryDrivers) {
      const series = secondaryLocationByDriver?.[driver.number];
      if (series && series.length > 0) entries.push({ driver, series });
    }
    return entries;
  }, [location, primaryDriver, secondaryDrivers, secondaryLocationByDriver]);

  const scales = useMemo(() => {
    if (!location || location.length === 0) return null;

    const xExtent = d3.extent(location, (p) => p.x) as [number, number];
    const yExtent = d3.extent(location, (p) => p.y) as [number, number];
    const dataWidth = xExtent[1] - xExtent[0];
    const dataHeight = yExtent[1] - yExtent[0];

    // Fit the track's aspect ratio into the viewport without distorting it.
    const scale = Math.min(
      (WIDTH - PADDING * 2) / dataWidth,
      (HEIGHT - PADDING * 2) / dataHeight
    );

    const xScale = d3
      .scaleLinear()
      .domain(xExtent)
      .range([PADDING, PADDING + dataWidth * scale]);
    const yScale = d3
      .scaleLinear()
      .domain(yExtent)
      .range([PADDING, PADDING + dataHeight * scale]);

    return { xScale, yScale };
  }, [location]);

  const outlinePoints = useMemo(() => {
    if (!location) return [];
    // OpenF1 has no clean track-asset endpoint, so the outline is approximated
    // from one representative lap of raw location data (skip the opening lap,
    // which can include formation/grid noise).
    const representativeLap =
      laps?.find((lap) => lap.lapNumber === 2) ?? laps?.[0];
    if (!representativeLap) return location;

    const lapEndMs =
      representativeLap.startOffsetMs + (representativeLap.durationMs ?? 0);
    return location.filter(
      (p) =>
        p.tOffsetMs >= representativeLap.startOffsetMs &&
        p.tOffsetMs <= lapEndMs
    );
  }, [location, laps]);

  const pitLanePoints = useMemo(() => {
    if (!location || !laps) return [];
    // A pit-out lap's trace includes the pit lane branch, which the
    // representative racing lap above never covers.
    const pitOutLap = laps.find((lap) => lap.isPitOutLap);
    if (!pitOutLap) return [];

    const lapEndMs = pitOutLap.startOffsetMs + (pitOutLap.durationMs ?? 0);
    return location.filter(
      (p) => p.tOffsetMs >= pitOutLap.startOffsetMs && p.tOffsetMs <= lapEndMs
    );
  }, [location, laps]);

  if (!location || !scales)
    return <p className="text-sm text-zinc-500">No location data recorded for this driver.</p>;

  function zoomAt(multiplier: number, centerX = WIDTH / 2, centerY = HEIGHT / 2) {
    setTransform((current) => {
      const nextK = Math.min(Math.max(current.k * multiplier, MIN_ZOOM), MAX_ZOOM);
      const ratio = nextK / current.k;
      return {
        k: nextK,
        x: centerX - (centerX - current.x) * ratio,
        y: centerY - (centerY - current.y) * ratio,
      };
    });
  }

  function resetZoom() {
    dragRef.current = null;
    setTransform({ x: 0, y: 0, k: 1 });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setTransform((current) => ({
      ...current,
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    }));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const centerY = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    zoomAt(event.deltaY < 0 ? 1.18 : 1 / 1.18, centerX, centerY);
  }

  return (
    <div
      className="relative mx-auto w-full max-w-2xl touch-none overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
      style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
    >
      {viewMode === "3d" ? (
        <TrackReplay3D outlinePoints={outlinePoints} entries={carLayerEntries} />
      ) : (
        <>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute left-0 top-0 h-full w-full">
            <defs>
              <pattern id="track-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  className="stroke-zinc-200 dark:stroke-zinc-800"
                  strokeWidth="1"
                />
              </pattern>
              <pattern id="track-grid-major" width="96" height="96" patternUnits="userSpaceOnUse">
                <path
                  d="M 96 0 L 0 0 0 96"
                  fill="none"
                  className="stroke-zinc-300 dark:stroke-zinc-700"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width={WIDTH} height={HEIGHT} fill="url(#track-grid)" opacity={0.55} />
            <rect width={WIDTH} height={HEIGHT} fill="url(#track-grid-major)" opacity={0.35} />
            <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
              {pitLanePoints.length > 0 && (
                <CircuitOutline
                  points={pitLanePoints}
                  xScale={scales.xScale}
                  yScale={scales.yScale}
                  dashed
                />
              )}
              <CircuitOutline
                points={outlinePoints}
                xScale={scales.xScale}
                yScale={scales.yScale}
              />
            </g>
          </svg>
          <CarLayer
            entries={carLayerEntries}
            xScale={scales.xScale}
            yScale={scales.yScale}
            width={WIDTH}
            height={HEIGHT}
            transform={transform}
          />
          <div
            className="absolute inset-0 z-[5] cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          />
        </>
      )}
      <div className="absolute left-3 top-3 z-10 flex overflow-hidden rounded-lg border border-zinc-200 bg-white/90 text-sm shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
        <button
          type="button"
          onClick={() => setViewMode("2d")}
          className={`px-3 py-1.5 ${
            viewMode === "2d"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          2D
        </button>
        <button
          type="button"
          onClick={() => setViewMode("3d")}
          className={`border-l border-zinc-200 px-3 py-1.5 dark:border-zinc-700 ${
            viewMode === "3d"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          3D
        </button>
      </div>
      {viewMode === "2d" && (
        <div className="absolute right-3 top-3 z-10 flex overflow-hidden rounded-lg border border-zinc-200 bg-white/90 text-sm shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
        <button
          type="button"
          onClick={() => zoomAt(1.35)}
          className="px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomAt(1 / 1.35)}
          className="border-l border-zinc-200 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={resetZoom}
          className="border-l border-zinc-200 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Reset
        </button>
        </div>
      )}
      {viewMode === "2d" && (
        <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-zinc-900/70 px-2 py-1 text-[10px] text-white">
          Wheel/pinch to zoom · drag to pan · all cars shown
        </div>
      )}
    </div>
  );
}
