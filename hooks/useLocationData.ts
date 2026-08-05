import { useQuery } from "@tanstack/react-query";
import type { LocationFrame } from "@/lib/domain/types";

export function useLocationData(sessionKey: number, driverNumber: number) {
  return useQuery({
    queryKey: ["location", sessionKey, driverNumber],
    queryFn: async (): Promise<LocationFrame[]> => {
      const res = await fetch(
        `/api/sessions/${sessionKey}/location?driver=${driverNumber}`
      );
      if (!res.ok) throw new Error("Failed to load location data");
      return res.json();
    },
  });
}
