import { fetchOpenF1 } from "@/lib/openf1/client";
import { normalizeCarData } from "@/lib/openf1/normalize";
import { getSession } from "@/lib/openf1/session";
import type { OpenF1CarData } from "@/lib/openf1/types";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/sessions/[sessionKey]/car-data">
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
    const raw = await fetchOpenF1<OpenF1CarData[]>("/car_data", {
      session_key: sessionKey,
      driver_number: driverNumber,
    });

    const sessionEpochMs = Date.parse(session.startTimeUtc);
    const frames = raw.map((frame) => normalizeCarData(frame, sessionEpochMs));

    return Response.json(frames);
  } catch (error) {
    // OpenF1 returns 404/422 when telemetry is unavailable for a driver/session.
    // Treat that as an empty stream so the staging screen can continue instead
    // of retrying forever behind a 500.
    if (
      error instanceof Error &&
      (error.message.includes("(404)") || error.message.includes("(422)"))
    ) {
      return Response.json([]);
    }
    throw error;
  }
}
