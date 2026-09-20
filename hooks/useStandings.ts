import { useQuery } from "@tanstack/react-query";

export interface DriverStanding {
  position: number;
  points: number;
  wins: number;
  driverId: string;
  givenName: string;
  familyName: string;
  code: string;
  permanentNumber: string | null;
  constructorName: string;
}

export interface ConstructorStanding {
  position: number;
  points: number;
  wins: number;
  constructorId: string;
  name: string;
  nationality: string;
}

export function useDriverStandings(year: number) {
  return useQuery({
    queryKey: ["driver-standings", year],
    queryFn: async (): Promise<DriverStanding[]> => {
      const res = await fetch(`/api/standings/drivers?year=${year}`);
      if (!res.ok) throw new Error("Failed to load driver standings");
      return res.json();
    },
  });
}

export function useConstructorStandings(year: number) {
  return useQuery({
    queryKey: ["constructor-standings", year],
    queryFn: async (): Promise<ConstructorStanding[]> => {
      const res = await fetch(`/api/standings/constructors?year=${year}`);
      if (!res.ok) throw new Error("Failed to load constructor standings");
      return res.json();
    },
  });
}
