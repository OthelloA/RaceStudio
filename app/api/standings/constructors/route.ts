const BASE_URL = "https://api.jolpi.ca/ergast/f1";

interface JolpicaConstructorStanding {
  position: string;
  points: string;
  wins: string;
  Constructor: {
    constructorId: string;
    name: string;
    nationality: string;
  };
}

interface JolpicaConstructorStandingsResponse {
  MRData: {
    StandingsTable: {
      StandingsLists: Array<{
        ConstructorStandings: JolpicaConstructorStanding[];
      }>;
    };
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") ?? "current";

  const res = await fetch(`${BASE_URL}/${year}/constructorStandings.json`, {
    next: { revalidate: 60 * 60 },
  });

  if (!res.ok) {
    return Response.json({ error: "Failed to load constructor standings" }, { status: 502 });
  }

  const data = (await res.json()) as JolpicaConstructorStandingsResponse;
  const standings =
    data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings.map((entry) => ({
      position: Number(entry.position),
      points: Number(entry.points),
      wins: Number(entry.wins),
      constructorId: entry.Constructor.constructorId,
      name: entry.Constructor.name,
      nationality: entry.Constructor.nationality,
    })) ?? [];

  return Response.json(standings);
}
