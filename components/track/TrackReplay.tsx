"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { Driver } from "@/lib/domain/types";
import { useLocationData } from "@/hooks/useLocationData";
import { useLocationDataForDrivers } from "@/hooks/useLocationDataForDrivers";
import { useLaps } from "@/hooks/useLaps";
import { CircuitOutline } from "./CircuitOutline";
import { CarLayer } from "./CarLayer";
import { Spinner } from "@/components/ui/Spinner";

const WIDTH = 600;
const HEIGHT = 600;
const PADDING = 20;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

export function TrackReplay({
  sessionKey,
  drivers,
}: {
  sessionKey: number;
  drivers: Driver[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const zoom = d3
      .zoom<HTMLDivElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .on("zoom", (event) => setTransform(event.transform));

    const selection = d3.select(container);
    selection.call(zoom);
    return () => {
      selection.on(".zoom", null);
    };
  }, []);

  const primaryDriver = drivers[0];
  const {
    data: location,
    isLoading,
    isError,
  } = useLocationData(sessionKey, primaryDriver.number);
  const { data: laps } = useLaps(sessionKey, primaryDriver.number);

  const driverNumbers = useMemo(() => drivers.map((d) => d.number), [drivers]);
  const locationQueries = useLocationDataForDrivers(sessionKey, driverNumbers);
  const carLayerEntries = useMemo(
    () =>
      drivers
        .map((driver, i) => ({ driver, series: locationQueries[i]?.data }))
        .filter(
          (entry): entry is { driver: Driver; series: NonNullable<typeof entry.series> } =>
            entry.series !== undefined
        ),
    [drivers, locationQueries]
  );

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

  if (isLoading)
    return (
      <p className="flex items-center gap-2 text-sm text-zinc-500">
        <Spinner /> Loading track…
      </p>
    );
  if (isError) return <p className="text-sm text-red-600">Failed to load track data.</p>;
  if (!location || !scales)
    return <p className="text-sm text-zinc-500">No location data recorded for this driver.</p>;

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-2xl touch-none overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
      style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute left-0 top-0 h-full w-full">
        <g transform={transform.toString()}>
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
      <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-zinc-900/70 px-2 py-1 text-[10px] text-white">
        Scroll to zoom · drag to pan
      </div>
    </div>
  );
}
