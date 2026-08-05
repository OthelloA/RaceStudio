export interface OpenF1Session {
  session_key: number;
  meeting_key: number;
  session_type: string;
  session_name: string;
  date_start: string;
  date_end: string;
  circuit_key: number;
  circuit_short_name: string;
  country_code: string;
  country_name: string;
  location: string;
  gmt_offset: string;
  year: number;
  is_cancelled: boolean;
}

export interface OpenF1Driver {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  first_name: string;
  last_name: string;
  headshot_url: string | null;
  country_code: string | null;
}

export interface OpenF1CarData {
  date: string;
  session_key: number;
  meeting_key: number;
  driver_number: number;
  speed: number;
  throttle: number;
  brake: number;
  n_gear: number;
  rpm: number;
  drs: number;
}

export interface OpenF1Location {
  date: string;
  session_key: number;
  meeting_key: number;
  driver_number: number;
  x: number;
  y: number;
  z: number;
}

export interface OpenF1Lap {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  lap_number: number;
  date_start: string;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  is_pit_out_lap: boolean;
}

export interface OpenF1Position {
  date: string;
  session_key: number;
  meeting_key: number;
  driver_number: number;
  position: number;
}

export interface OpenF1PitStop {
  date: string;
  session_key: number;
  meeting_key: number;
  driver_number: number;
  lap_number: number;
  pit_duration: number | null;
  lane_duration: number | null;
}
