import { useQuery } from "@tanstack/react-query";
import type { LocationFrame } from "@/lib/domain/types";

export type LocationDataByDriver = Record<number, LocationFrame[]>;

export function useLocationDataForDrivers(
  sessionKey: number,
  driverNumbers: number[]
) {
  const sortedDriverNumbers = [...driverNumbers].sort((a, b) => a - b);

  return useQuery({
    queryKey: ["location-batch", sessionKey, sortedDriverNumbers],
    enabled: sortedDriverNumbers.length > 0,
    queryFn: async (): Promise<LocationDataByDriver> => {
      const params = new URLSearchParams({ drivers: sortedDriverNumbers.join(",") });
      const res = await fetch(`/api/sessions/${sessionKey}/location/all?${params}`);
      if (!res.ok) throw new Error("Failed to load location data");
      return res.json();
    },
  });
}
