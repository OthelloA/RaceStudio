"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { TEAM_THEMES, type TeamTheme } from "@/lib/domain/teamColors";

const STORAGE_KEY = "racestudio.teamTheme";
const DEFAULT_TEAM_ID = "ferrari";

interface TeamThemeContextValue {
  selectedTeam: TeamTheme;
  setSelectedTeamId: (teamId: string) => void;
}

const TeamThemeContext = createContext<TeamThemeContextValue | null>(null);

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function findTheme(teamId: string | null) {
  return TEAM_THEMES.find((theme) => theme.id === teamId) ?? TEAM_THEMES[0];
}

function applyTheme(theme: TeamTheme) {
  const root = document.documentElement;
  const rgb = hexToRgb(theme.color);
  root.style.setProperty("--team-theme", theme.color);
  root.style.setProperty("--team-theme-rgb", `${rgb.r} ${rgb.g} ${rgb.b}`);
  root.style.setProperty("--team-theme-glow", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.24)`);
  root.style.setProperty("--team-theme-soft", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`);
}

function subscribeToTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("racestudio-theme", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("racestudio-theme", callback);
  };
}

function getThemeSnapshot() {
  return findTheme(window.localStorage.getItem(STORAGE_KEY)).id;
}

function getServerThemeSnapshot() {
  return DEFAULT_TEAM_ID;
}

export function TeamThemeProvider({ children }: { children: ReactNode }) {
  const selectedTeamId = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  const selectedTeam = useMemo(() => findTheme(selectedTeamId), [selectedTeamId]);

  useEffect(() => {
    applyTheme(selectedTeam);
  }, [selectedTeam]);

  const setSelectedTeamId = (teamId: string) => {
    const theme = findTheme(teamId);
    window.localStorage.setItem(STORAGE_KEY, theme.id);
    window.dispatchEvent(new Event("racestudio-theme"));
    applyTheme(theme);
  };

  return (
    <TeamThemeContext.Provider value={{ selectedTeam, setSelectedTeamId }}>
      {children}
    </TeamThemeContext.Provider>
  );
}

export function TeamThemePicker() {
  const context = useContext(TeamThemeContext);
  if (!context) return null;

  return (
    <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 shadow-inner">
      <span className="text-xs uppercase tracking-wide text-zinc-500">Team theme</span>
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-12 items-center justify-center rounded-xl border border-white/10 text-xs font-black text-zinc-950 shadow-lg"
          style={{ backgroundColor: context.selectedTeam.color }}
          aria-hidden="true"
        >
          {context.selectedTeam.badge}
        </div>
        <select
          value={context.selectedTeam.id}
          onChange={(event) => context.setSelectedTeamId(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-100 focus:border-[var(--team-theme)] focus:outline-none"
        >
          {TEAM_THEMES.map((theme) => (
            <option key={theme.id} value={theme.id} className="bg-zinc-950 text-zinc-100">
              {theme.name}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
