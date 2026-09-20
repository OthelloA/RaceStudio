"use client";

import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { TelemetryChart, type TelemetrySeries } from "./TelemetryChart";
import type { CarDataFrame, Driver } from "@/lib/domain/types";
import { getDriverColor } from "@/lib/domain/driverColors";
import type { FieldMode } from "@/lib/time/sessionClock";
import { Spinner } from "@/components/ui/Spinner";

type TelemetryField = "speed" | "throttle" | "brake" | "gear" | "rpm";

const MAX_VISIBLE_CHANNELS = 2;
const WINDOW_OPTIONS = [10_000, 20_000, 30_000, 60_000];

const CHANNELS: {
  field: TelemetryField;
  label: string;
  unit?: string;
  mode: FieldMode;
}[] = [
  { field: "speed", label: "Speed", unit: " km/h", mode: "linear" },
  { field: "throttle", label: "Throttle", unit: "%", mode: "linear" },
  { field: "brake", label: "Brake", mode: "step" },
  { field: "gear", label: "Gear", mode: "step" },
  { field: "rpm", label: "RPM", mode: "linear" },
];

export function TelemetryPanel({
  sessionKey,
  drivers,
  startOffsetMs,
  endOffsetMs,
}: {
  sessionKey: number;
  drivers: Driver[];
  startOffsetMs: number;
  endOffsetMs: number;
}) {
  const [selectedFields, setSelectedFields] = useState<TelemetryField[]>([
    "speed",
    "throttle",
  ]);
  const [windowMs, setWindowMs] = useState(20_000);

  const queries = useQueries({
    queries: drivers.map((driver) => ({
      queryKey: ["carData", sessionKey, driver.number],
      queryFn: async (): Promise<CarDataFrame[]> => {
        const res = await fetch(
          `/api/sessions/${sessionKey}/car-data?driver=${driver.number}`
        );
        if (!res.ok) throw new Error("Failed to load car data");
        return res.json();
      },
    })),
  });

  const isLoading = queries.some((query) => query.isLoading);
  const isError = queries.some((query) => query.isError);
  const telemetrySeries: TelemetrySeries[] = drivers
    .map((driver, i) => ({ driver, data: queries[i]?.data }))
    .filter(
      (entry): entry is TelemetrySeries =>
        entry.data !== undefined && entry.data.length > 0
    );

  const selectedChannels = CHANNELS.filter((channel) =>
    selectedFields.includes(channel.field)
  );

  function toggleField(field: TelemetryField) {
    setSelectedFields((current) => {
      if (current.includes(field)) {
        return current.length === 1 ? current : current.filter((item) => item !== field);
      }
      return [...current, field].slice(-MAX_VISIBLE_CHANNELS);
    });
  }

  if (isLoading)
    return (
      <p className="flex items-center gap-2 text-sm text-zinc-500">
        <Spinner /> Loading telemetry…
      </p>
    );
  if (isError)
    return <p className="text-sm text-red-600">Failed to load telemetry.</p>;
  if (telemetrySeries.length === 0)
    return <p className="text-sm text-zinc-500">No telemetry recorded for selected drivers.</p>;

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-inner">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Telemetry comparison
          </h2>
          {telemetrySeries.map(({ driver }) => (
            <span key={driver.number} className="flex items-center gap-1 text-xs text-zinc-500">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: getDriverColor(driver) }}
              />
              {driver.nameAcronym}
            </span>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          Window
          <select
            value={windowMs}
            onChange={(event) => setWindowMs(Number(event.target.value))}
            className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {WINDOW_OPTIONS.map((option) => (
              <option key={option} value={option}>
                ±{option / 2000}s
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((channel) => {
          const selected = selectedFields.includes(channel.field);
          return (
            <button
              key={channel.field}
              type="button"
              onClick={() => toggleField(channel.field)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                selected
                  ? "border-red-400 bg-red-500 text-white shadow-lg shadow-red-500/20"
                  : "border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-300"
              }`}
            >
              {channel.label}
            </button>
          );
        })}
        <span className="self-center text-xs text-zinc-400">max 2 charts</span>
      </div>
      {selectedChannels.map((channel) => (
        <TelemetryChart
          key={channel.field}
          series={telemetrySeries}
          field={channel.field}
          label={channel.label}
          unit={channel.unit}
          mode={channel.mode}
          startOffsetMs={startOffsetMs}
          endOffsetMs={endOffsetMs}
          windowMs={windowMs}
        />
      ))}
    </div>
  );
}
