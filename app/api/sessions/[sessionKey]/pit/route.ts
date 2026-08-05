import { fetchOpenF1 } from "@/lib/openf1/client";
import { normalizePitStop } from "@/lib/openf1/normalize";
import { getSession } from "@/lib/openf1/session";
import type { OpenF1PitStop } from "@/lib/openf1/types";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/sessions/[sessionKey]/pit">
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

  const raw = await fetchOpenF1<OpenF1PitStop[]>("/pit", {
    session_key: sessionKey,
    driver_number: driverNumber,
  });

  const sessionEpochMs = Date.parse(session.startTimeUtc);
  const stops = raw.map((stop) => normalizePitStop(stop, sessionEpochMs));

  return Response.json(stops);
}
