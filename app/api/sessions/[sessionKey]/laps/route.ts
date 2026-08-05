import { fetchOpenF1 } from "@/lib/openf1/client";
import { normalizeLap } from "@/lib/openf1/normalize";
import { getSession } from "@/lib/openf1/session";
import type { OpenF1Lap } from "@/lib/openf1/types";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/sessions/[sessionKey]/laps">
) {
  const { sessionKey } = await params;
  const { searchParams } = new URL(request.url);
  const driverNumber = searchParams.get("driver") ?? undefined;

  let session;
  try {
    session = await getSession(Number(sessionKey));
  } catch {
    return Response.json(
      { error: `No session found for session_key=${sessionKey}` },
      { status: 404 }
    );
  }

  const raw = await fetchOpenF1<OpenF1Lap[]>("/laps", {
    session_key: sessionKey,
    driver_number: driverNumber,
  });

  const sessionEpochMs = Date.parse(session.startTimeUtc);
  const laps = raw.map((lap) => normalizeLap(lap, sessionEpochMs));

  return Response.json(laps);
}
