import { useQuery } from "@tanstack/react-query";
import type { PitStop } from "@/lib/domain/types";

export function usePitStops(sessionKey: number, driverNumber?: number) {
  return useQuery({
    queryKey: ["pit", sessionKey, driverNumber],
    queryFn: async (): Promise<PitStop[]> => {
      const url = driverNumber
        ? `/api/sessions/${sessionKey}/pit?driver=${driverNumber}`
        : `/api/sessions/${sessionKey}/pit`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load pit stops");
      return res.json();
    },
  });
}
