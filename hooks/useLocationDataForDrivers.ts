import { useQueries } from "@tanstack/react-query";
import type { LocationFrame } from "@/lib/domain/types";

export function useLocationDataForDrivers(
  sessionKey: number,
  driverNumbers: number[]
) {
  return useQueries({
    queries: driverNumbers.map((driverNumber) => ({
      queryKey: ["location", sessionKey, driverNumber],
      queryFn: async (): Promise<LocationFrame[]> => {
        const res = await fetch(
          `/api/sessions/${sessionKey}/location?driver=${driverNumber}`
        );
        if (!res.ok) throw new Error("Failed to load location data");
        return res.json();
      },
    })),
  });
}
