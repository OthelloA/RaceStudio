import type {
  OpenF1CarData,
  OpenF1Driver,
  OpenF1Lap,
  OpenF1Location,
  OpenF1Session,
} from "./types";
import type {
  CarDataFrame,
  Driver,
  Lap,
  LocationFrame,
  Session,
} from "@/lib/domain/types";

function toOffsetMs(date: string, epochMs: number): number {
  return Date.parse(date) - epochMs;
}

export function normalizeSession(raw: OpenF1Session): Session {
  const startMs = Date.parse(raw.date_start);
  const endMs = Date.parse(raw.date_end);
  return {
    key: raw.session_key,
    meetingKey: raw.meeting_key,
    year: raw.year,
    name: raw.session_name,
    sessionType: raw.session_type,
    circuitName: raw.circuit_short_name,
    countryName: raw.country_name,
    startTimeUtc: raw.date_start,
    endTimeUtc: raw.date_end,
    durationMs: endMs - startMs,
  };
}

export function normalizeDriver(raw: OpenF1Driver): Driver {
  return {
    number: raw.driver_number,
    sessionKey: raw.session_key,
    fullName: raw.full_name,
    nameAcronym: raw.name_acronym,
    teamName: raw.team_name,
    teamColor: raw.team_colour,
  };
}

export function normalizeCarData(
  raw: OpenF1CarData,
  sessionEpochMs: number
): CarDataFrame {
  return {
    driverNumber: raw.driver_number,
    tOffsetMs: toOffsetMs(raw.date, sessionEpochMs),
    speed: raw.speed,
    throttle: raw.throttle,
    brake: raw.brake,
    gear: raw.n_gear,
    rpm: raw.rpm,
    drs: raw.drs,
  };
}

export function normalizeLocation(
  raw: OpenF1Location,
  sessionEpochMs: number
): LocationFrame {
  return {
    driverNumber: raw.driver_number,
    tOffsetMs: toOffsetMs(raw.date, sessionEpochMs),
    x: raw.x,
    y: raw.y,
    z: raw.z,
  };
}

export function normalizeLap(raw: OpenF1Lap, sessionEpochMs: number): Lap {
  return {
    driverNumber: raw.driver_number,
    lapNumber: raw.lap_number,
    startOffsetMs: toOffsetMs(raw.date_start, sessionEpochMs),
    durationMs: raw.lap_duration !== null ? raw.lap_duration * 1000 : null,
    sector1Ms:
      raw.duration_sector_1 !== null ? raw.duration_sector_1 * 1000 : null,
    sector2Ms:
      raw.duration_sector_2 !== null ? raw.duration_sector_2 * 1000 : null,
    sector3Ms:
      raw.duration_sector_3 !== null ? raw.duration_sector_3 * 1000 : null,
    isPitOutLap: raw.is_pit_out_lap,
  };
}
