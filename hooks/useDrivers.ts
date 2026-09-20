import { useQuery } from "@tanstack/react-query";
import type { Driver } from "@/lib/domain/types";

export function useDrivers(sessionKey: number) {
  return useQuery({
    queryKey: ["drivers", sessionKey],
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("rate limit")) return failureCount < 2;
      return failureCount < 1;
    },
    retryDelay: (attempt) => Math.min(10_000, 2 ** attempt * 2_000),
    queryFn: async (): Promise<Driver[]> => {
      const res = await fetch(`/api/sessions/${sessionKey}/drivers`);
      if (res.status === 503) {
        const retryAfter = res.headers.get("Retry-After");
        throw new Error(`OpenF1 rate limit while loading drivers${retryAfter ? `; retry after ${retryAfter}s` : ""}`);
      }
      if (!res.ok) throw new Error("Failed to load drivers");
      return res.json();
    },
  });
}
