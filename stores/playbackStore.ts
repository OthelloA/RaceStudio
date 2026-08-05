import { create } from "zustand";

interface PlaybackState {
  sessionKey: number | null;
  /** Bounds of actual recorded telemetry (tOffsetMs), not the official session window — OpenF1 data often starts before and ends before the official start/end. */
  startOffsetMs: number;
  endOffsetMs: number;
  currentTimeMs: number;
  isPlaying: boolean;
  playbackSpeed: number;
  activeDriverNumbers: number[];

  loadSession: (
    sessionKey: number,
    startOffsetMs: number,
    endOffsetMs: number
  ) => void;
  play: () => void;
  pause: () => void;
  seek: (timeMs: number) => void;
  setSpeed: (multiplier: number) => void;
  setActiveDrivers: (numbers: number[]) => void;
  toggleActiveDriver: (number: number) => void;
  /** Internal: advances the clock by deltaMs; called from the RAF driver. */
  tick: (deltaMs: number) => void;
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  sessionKey: null,
  startOffsetMs: 0,
  endOffsetMs: 0,
  currentTimeMs: 0,
  isPlaying: false,
  playbackSpeed: 1,
  activeDriverNumbers: [],

  loadSession: (sessionKey, startOffsetMs, endOffsetMs) =>
    set({
      sessionKey,
      startOffsetMs,
      endOffsetMs,
      currentTimeMs: startOffsetMs,
      isPlaying: false,
    }),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),

  seek: (timeMs) => {
    const { startOffsetMs, endOffsetMs } = get();
    set({ currentTimeMs: Math.min(Math.max(timeMs, startOffsetMs), endOffsetMs) });
  },

  setSpeed: (multiplier) => set({ playbackSpeed: multiplier }),
  setActiveDrivers: (numbers) => set({ activeDriverNumbers: numbers }),
  toggleActiveDriver: (number) => {
    const { activeDriverNumbers } = get();
    set({
      activeDriverNumbers: activeDriverNumbers.includes(number)
        ? activeDriverNumbers.filter((n) => n !== number)
        : [...activeDriverNumbers, number],
    });
  },

  tick: (deltaMs) => {
    const { isPlaying, currentTimeMs, playbackSpeed, endOffsetMs } = get();
    if (!isPlaying) return;

    const nextTimeMs = currentTimeMs + deltaMs * playbackSpeed;
    if (nextTimeMs >= endOffsetMs) {
      set({ currentTimeMs: endOffsetMs, isPlaying: false });
    } else {
      set({ currentTimeMs: nextTimeMs });
    }
  },
}));
