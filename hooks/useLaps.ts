import { useQuery } from "@tanstack/react-query";
import type { Lap } from "@/lib/domain/types";

export function useLaps(
  sessionKey: number,
  driverNumber?: number,
  enabled = true
) {
  return useQuery({
    queryKey: ["laps", sessionKey, driverNumber],
    enabled,
    queryFn: async (): Promise<Lap[]> => {
      const url = driverNumber
        ? `/api/sessions/${sessionKey}/laps?driver=${driverNumber}`
        : `/api/sessions/${sessionKey}/laps`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load laps");
      return res.json();
    },
  });
}
