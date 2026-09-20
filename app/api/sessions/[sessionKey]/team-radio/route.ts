import { fetchOpenF1 } from "@/lib/openf1/client";
import { normalizeTeamRadio } from "@/lib/openf1/normalize";
import { getSession } from "@/lib/openf1/session";
import type { OpenF1TeamRadio } from "@/lib/openf1/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionKey: string }> }
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

  try {
    const raw = await fetchOpenF1<OpenF1TeamRadio[]>("/team_radio", {
      session_key: sessionKey,
      driver_number: driverNumber,
    });

    const sessionEpochMs = Date.parse(session.startTimeUtc);
    const messages = raw.map((message) => normalizeTeamRadio(message, sessionEpochMs));

    return Response.json(messages);
  } catch (error) {
    // OpenF1 returns 404 when no radio messages exist for a session/driver.
    // That should render as an empty radio feed, not a route failure.
    if (error instanceof Error && error.message.includes("(404)")) {
      return Response.json([]);
    }
    throw error;
  }
}
