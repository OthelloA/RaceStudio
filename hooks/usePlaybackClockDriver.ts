"use client";

import { useEffect, useRef } from "react";
import { usePlaybackStore } from "@/stores/playbackStore";

/**
 * Mount once near the workspace root. Runs a single requestAnimationFrame
 * loop that advances the playback clock by real elapsed time; every panel
 * reads currentTimeMs from the store rather than running its own timer.
 */
export function usePlaybackClockDriver() {
  const lastFrameTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let frameId: number;

    const step = (now: number) => {
      const last = lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      if (last !== null) {
        usePlaybackStore.getState().tick(now - last);
      }

      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frameId);
      lastFrameTimeRef.current = null;
    };
  }, []);
}
