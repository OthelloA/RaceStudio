import { useQuery } from "@tanstack/react-query";
import type { Driver } from "@/lib/domain/types";

export function useDrivers(sessionKey: number) {
  return useQuery({
    queryKey: ["drivers", sessionKey],
    queryFn: async (): Promise<Driver[]> => {
      const res = await fetch(`/api/sessions/${sessionKey}/drivers`);
      if (!res.ok) throw new Error("Failed to load drivers");
      return res.json();
    },
  });
}
