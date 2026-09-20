const BASE_URL = "https://api.jolpi.ca/ergast/f1";

interface JolpicaDriverStanding {
  position: string;
  points: string;
  wins: string;
  Driver: {
    driverId: string;
    givenName: string;
    familyName: string;
    code?: string;
    permanentNumber?: string;
  };
  Constructors: Array<{ name: string }>;
}

interface JolpicaDriverStandingsResponse {
  MRData: {
    StandingsTable: {
      StandingsLists: Array<{
        DriverStandings: JolpicaDriverStanding[];
      }>;
    };
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") ?? "current";

  const res = await fetch(`${BASE_URL}/${year}/driverStandings.json`, {
    next: { revalidate: 60 * 60 },
  });

  if (!res.ok) {
    return Response.json({ error: "Failed to load driver standings" }, { status: 502 });
  }

  const data = (await res.json()) as JolpicaDriverStandingsResponse;
  const standings =
    data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings.map((entry) => ({
      position: Number(entry.position),
      points: Number(entry.points),
      wins: Number(entry.wins),
      driverId: entry.Driver.driverId,
      givenName: entry.Driver.givenName,
      familyName: entry.Driver.familyName,
      code: entry.Driver.code ?? entry.Driver.familyName.slice(0, 3).toUpperCase(),
      permanentNumber: entry.Driver.permanentNumber ?? null,
      constructorName: entry.Constructors[0]?.name ?? "—",
    })) ?? [];

  return Response.json(standings);
}
