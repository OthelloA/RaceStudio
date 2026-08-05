export interface Session {
  key: number;
  meetingKey: number;
  year: number;
  name: string;
  sessionType: string;
  circuitName: string;
  countryName: string;
  startTimeUtc: string;
  endTimeUtc: string;
  durationMs: number;
}

export interface Driver {
  number: number;
  sessionKey: number;
  fullName: string;
  nameAcronym: string;
  teamName: string;
  teamColor: string;
}

export interface CarDataFrame {
  driverNumber: number;
  tOffsetMs: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  rpm: number;
  drs: number;
}

export interface LocationFrame {
  driverNumber: number;
  tOffsetMs: number;
  x: number;
  y: number;
  z: number;
}

export interface Lap {
  driverNumber: number;
  lapNumber: number;
  startOffsetMs: number;
  durationMs: number | null;
  sector1Ms: number | null;
  sector2Ms: number | null;
  sector3Ms: number | null;
  isPitOutLap: boolean;
}

export interface PositionEntry {
  driverNumber: number;
  tOffsetMs: number;
  position: number;
}

export interface PitStop {
  driverNumber: number;
  lapNumber: number;
  startOffsetMs: number;
  pitDurationMs: number | null;
}
