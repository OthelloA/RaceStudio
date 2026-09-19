import type { Driver } from "./types";

/**
 * Display color for a driver. Use OpenF1 team color so the UI matches real
 * F1 team identity; teammates intentionally share the same color.
 */
export function getDriverColor(driver: Driver): string {
  return driver.teamColor ? `#${driver.teamColor}` : "#71717a";
}
