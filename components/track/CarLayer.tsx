"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { Driver, LocationFrame } from "@/lib/domain/types";
import { usePlaybackStore } from "@/stores/playbackStore";
import { sampleSeries } from "@/lib/time/sessionClock";

const POSITION_FIELDS: Array<keyof LocationFrame> = ["x", "y"];

interface CarLayerEntry {
  driver: Driver;
  series: LocationFrame[];
}

/**
 * Draws every driver's car marker on a canvas, imperatively, once per RAF
 * tick. Avoids React reconciling up to 20 SVG nodes 60x/sec — the store's
 * currentTimeMs is read directly in the loop rather than via a subscribing
 * selector, so this component itself never re-renders during playback.
 */
export function CarLayer({
  entries,
  xScale,
  yScale,
  width,
  height,
  transform,
}: {
  entries: CarLayerEntry[];
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
  width: number;
  height: number;
  transform: d3.ZoomTransform;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  // Kept in a ref (rather than an effect dependency) so pan/zoom updates —
  // which fire far more often than once per RAF tick — don't tear down and
  // restart the draw loop below.
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId: number;

    const draw = () => {
      const currentTimeMs = usePlaybackStore.getState().currentTimeMs;
      const activeDriverNumbers = usePlaybackStore.getState().activeDriverNumbers;
      const { x: tx, y: ty, k } = transformRef.current;

      ctx.clearRect(0, 0, width * dpr, height * dpr);
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.translate(tx, ty);
      ctx.scale(k, k);

      for (const { driver, series } of entries) {
        const frame = sampleSeries(series, currentTimeMs, {
          fields: POSITION_FIELDS,
        });
        if (!frame) continue;

        const isFocused = activeDriverNumbers.includes(driver.number);
        const cx = xScale(frame.x);
        const cy = yScale(frame.y);
        // Counter-scale so markers/labels stay a constant screen size rather
        // than growing with the zoom level (the ctx itself is scaled by k).
        const radius = (isFocused ? 7 : 4) / k;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = `#${driver.teamColor}`;
        ctx.fill();
        ctx.lineWidth = (isFocused ? 1.5 : 1) / k;
        ctx.strokeStyle = "white";
        ctx.stroke();

        ctx.font = `${isFocused ? "700" : "400"} ${(isFocused ? 10 : 7) / k}px sans-serif`;
        ctx.fillStyle = isFocused ? "#18181b" : "#71717a";
        ctx.textBaseline = "middle";
        ctx.fillText(driver.nameAcronym, cx + radius + 2 / k, cy);
      }

      ctx.restore();
      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [entries, xScale, yScale, width, height, dpr]);

  return (
    <canvas
      ref={canvasRef}
      width={width * dpr}
      height={height * dpr}
      className="pointer-events-none absolute left-0 top-0 h-full w-full"
    />
  );
}
