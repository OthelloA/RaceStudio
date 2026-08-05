import { useQuery } from "@tanstack/react-query";
import type { Session } from "@/lib/domain/types";

export function useSessions(year: number) {
  return useQuery({
    queryKey: ["sessions", year],
    queryFn: async (): Promise<Session[]> => {
      const res = await fetch(`/api/sessions?year=${year}`);
      if (!res.ok) throw new Error("Failed to load sessions");
      return res.json();
    },
  });
}

export function useSession(sessionKey: number) {
  return useQuery({
    queryKey: ["session", sessionKey],
    queryFn: async (): Promise<Session> => {
      const res = await fetch(`/api/sessions/${sessionKey}`);
      if (!res.ok) throw new Error("Failed to load session");
      return res.json();
    },
  });
}
