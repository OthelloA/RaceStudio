import { useQuery } from "@tanstack/react-query";
import type { CarDataFrame } from "@/lib/domain/types";

export function useCarData(sessionKey: number, driverNumber: number) {
  return useQuery({
    queryKey: ["carData", sessionKey, driverNumber],
    queryFn: async (): Promise<CarDataFrame[]> => {
      const res = await fetch(
        `/api/sessions/${sessionKey}/car-data?driver=${driverNumber}`
      );
      if (!res.ok) throw new Error("Failed to load car data");
      return res.json();
    },
  });
}
