"use client";

import { useCarData } from "@/hooks/useCarData";
import { TelemetryChart } from "./TelemetryChart";
import type { FieldMode } from "@/lib/time/sessionClock";
import { Spinner } from "@/components/ui/Spinner";

const CHANNELS: {
  field: "speed" | "throttle" | "brake" | "gear" | "rpm";
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
  driverNumber,
  startOffsetMs,
  endOffsetMs,
}: {
  sessionKey: number;
  driverNumber: number;
  startOffsetMs: number;
  endOffsetMs: number;
}) {
  const { data, isLoading, isError } = useCarData(sessionKey, driverNumber);

  if (isLoading)
    return (
      <p className="flex items-center gap-2 text-sm text-zinc-500">
        <Spinner /> Loading telemetry…
      </p>
    );
  if (isError || !data)
    return <p className="text-sm text-red-600">Failed to load telemetry.</p>;
  if (data.length === 0)
    return <p className="text-sm text-zinc-500">No telemetry recorded for this driver.</p>;

  return (
    <div className="flex flex-col gap-4">
      {CHANNELS.map((channel) => (
        <TelemetryChart
          key={channel.field}
          series={data}
          field={channel.field}
          label={channel.label}
          unit={channel.unit}
          mode={channel.mode}
          startOffsetMs={startOffsetMs}
          endOffsetMs={endOffsetMs}
        />
      ))}
    </div>
  );
}
