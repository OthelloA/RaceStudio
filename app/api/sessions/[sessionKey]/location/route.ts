import { fetchOpenF1 } from "@/lib/openf1/client";
import { normalizeLocation } from "@/lib/openf1/normalize";
import { getSession } from "@/lib/openf1/session";
import type { OpenF1Location } from "@/lib/openf1/types";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/sessions/[sessionKey]/location">
) {
  const { sessionKey } = await params;
  const { searchParams } = new URL(request.url);
  const driverNumber = searchParams.get("driver");

  if (!driverNumber) {
    return Response.json(
      { error: "Missing required 'driver' query parameter" },
      { status: 400 }
    );
  }

  let session;
  try {
    session = await getSession(Number(sessionKey));
  } catch {
    return Response.json(
      { error: `No session found for session_key=${sessionKey}` },
      { status: 404 }
    );
  }

  try {
    const raw = await fetchOpenF1<OpenF1Location[]>(
      "/location",
      {
        session_key: sessionKey,
        driver_number: driverNumber,
      },
      {
        // Full-race location payloads are often 5MB+ per driver, which exceeds
        // Next's per-item data-cache limit and produces noisy cache failures.
        cache: "no-store",
      }
    );

    const sessionEpochMs = Date.parse(session.startTimeUtc);
    const frames = raw.map((frame) => normalizeLocation(frame, sessionEpochMs));

    return Response.json(frames);
  } catch (error) {
    // OpenF1 returns 404/422 when location telemetry is unavailable for a
    // specific driver/session. Treat that as an empty stream so one missing car
    // does not break the replay or spam route failures.
    if (
      error instanceof Error &&
      (error.message.includes("(404)") || error.message.includes("(422)"))
    ) {
      return Response.json([]);
    }
    throw error;
  }
}
