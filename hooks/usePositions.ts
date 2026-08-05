import { useQuery } from "@tanstack/react-query";
import type { PositionEntry } from "@/lib/domain/types";

export function usePositions(sessionKey: number) {
  return useQuery({
    queryKey: ["position", sessionKey],
    queryFn: async (): Promise<PositionEntry[]> => {
      const res = await fetch(`/api/sessions/${sessionKey}/position`);
      if (!res.ok) throw new Error("Failed to load positions");
      return res.json();
    },
  });
}
