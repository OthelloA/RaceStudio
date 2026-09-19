"use client";

import { useMemo } from "react";
import * as d3 from "d3";
import type { LocationFrame } from "@/lib/domain/types";
import type { CircuitFeature } from "@/hooks/useCircuitMap";

interface Point {
  x: number;
  y: number;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function bounds(points: Point[]): Bounds {
  return {
    minX: d3.min(points, (p) => p.x) ?? 0,
    maxX: d3.max(points, (p) => p.x) ?? 1,
    minY: d3.min(points, (p) => p.y) ?? 0,
    maxY: d3.max(points, (p) => p.y) ?? 1,
  };
}

function normalizePoints(points: Point[]): Point[] {
  const b = bounds(points);
  const width = b.maxX - b.minX || 1;
  const height = b.maxY - b.minY || 1;
  return points.map((p) => ({
    x: (p.x - b.minX) / width,
    y: (p.y - b.minY) / height,
  }));
}

function transformPoint(point: Point, variant: number): Point {
  const base = variant >= 4 ? { x: point.y, y: point.x } : point;
  const flipX = variant % 2 === 1;
  const flipY = variant % 4 >= 2;
  return {
    x: flipX ? 1 - base.x : base.x,
    y: flipY ? 1 - base.y : base.y,
  };
}

function sampleEvery(points: Point[], count: number): Point[] {
  if (points.length <= count) return points;
  const step = (points.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => points[Math.round(i * step)]);
}

function nearestDistance(point: Point, candidates: Point[]): number {
  let best = Infinity;
  for (const candidate of candidates) {
    const dx = point.x - candidate.x;
    const dy = point.y - candidate.y;
    best = Math.min(best, dx * dx + dy * dy);
  }
  return best;
}

function chooseBestVariant(telemetry: Point[], geo: Point[]): number {
  const telemetrySample = sampleEvery(normalizePoints(telemetry), 80);
  const normalizedGeo = normalizePoints(geo);

  let bestVariant = 0;
  let bestScore = Infinity;
  for (let variant = 0; variant < 8; variant++) {
    const transformedGeo = normalizedGeo.map((point) => transformPoint(point, variant));
    const geoSample = sampleEvery(transformedGeo, 160);
    const score = telemetrySample.reduce(
      (sum, point) => sum + nearestDistance(point, geoSample),
      0
    );
    if (score < bestScore) {
      bestScore = score;
      bestVariant = variant;
    }
  }
  return bestVariant;
}

export function CanonicalCircuitOutline({
  feature,
  referencePoints,
  xScale,
  yScale,
}: {
  feature: CircuitFeature | null | undefined;
  referencePoints: LocationFrame[];
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
}) {
  const pathD = useMemo(() => {
    if (!feature || referencePoints.length === 0) return null;

    // GeoJSON is lon/lat; OpenF1 location is local x/y. Normalize both shapes,
    // try simple flips/swaps, then stretch the chosen GeoJSON shape into the
    // telemetry bounds. This is intentionally pragmatic: good-looking personal
    // maps without maintaining a per-track manual alignment table.
    const geoPoints = feature.geometry.coordinates.map(([lon, lat]) => ({
      x: lon,
      y: lat,
    }));
    const telemetryPoints = referencePoints.map((p) => ({ x: p.x, y: p.y }));
    const telemetryBounds = bounds(telemetryPoints);
    const variant = chooseBestVariant(telemetryPoints, geoPoints);
    const normalizedGeo = normalizePoints(geoPoints).map((point) =>
      transformPoint(point, variant)
    );

    const telemetryWidth = telemetryBounds.maxX - telemetryBounds.minX || 1;
    const telemetryHeight = telemetryBounds.maxY - telemetryBounds.minY || 1;
    const fitted = normalizedGeo.map((point) => ({
      x: telemetryBounds.minX + point.x * telemetryWidth,
      y: telemetryBounds.minY + point.y * telemetryHeight,
    }));

    const line = d3
      .line<Point>()
      .curve(d3.curveCatmullRom.alpha(0.5))
      .x((p) => xScale(p.x))
      .y((p) => yScale(p.y));
    return line(fitted);
  }, [feature, referencePoints, xScale, yScale]);

  if (!pathD) return null;

  return (
    <g>
      <path
        d={pathD}
        fill="none"
        className="stroke-zinc-950/10 dark:stroke-white/10"
        strokeWidth={18}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={pathD}
        fill="none"
        className="stroke-zinc-900 dark:stroke-zinc-200"
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={pathD}
        fill="none"
        className="stroke-zinc-500 dark:stroke-zinc-500"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="6 8"
        opacity={0.8}
      />
    </g>
  );
}
