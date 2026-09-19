import { useQuery } from "@tanstack/react-query";
import type { Stint } from "@/lib/domain/types";

export function useStints(sessionKey: number, driverNumber?: number) {
  return useQuery({
    queryKey: ["stints", sessionKey, driverNumber],
    queryFn: async (): Promise<Stint[]> => {
      const url = driverNumber
        ? `/api/sessions/${sessionKey}/stints?driver=${driverNumber}`
        : `/api/sessions/${sessionKey}/stints`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load stints");
      return res.json();
    },
  });
}
