import { useQuery } from "@tanstack/react-query";
import type { TeamRadioMessage } from "@/lib/domain/types";

export function useTeamRadio(sessionKey: number, driverNumber?: number) {
  return useQuery({
    queryKey: ["team-radio", sessionKey, driverNumber],
    queryFn: async (): Promise<TeamRadioMessage[]> => {
      const url = driverNumber
        ? `/api/sessions/${sessionKey}/team-radio?driver=${driverNumber}`
        : `/api/sessions/${sessionKey}/team-radio`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load team radio");
      return res.json();
    },
  });
}
