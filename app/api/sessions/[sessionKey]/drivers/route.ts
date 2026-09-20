import { fetchOpenF1 } from "@/lib/openf1/client";
import { normalizeDriver } from "@/lib/openf1/normalize";
import type { OpenF1Driver } from "@/lib/openf1/types";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/sessions/[sessionKey]/drivers">
) {
  const { sessionKey } = await params;

  try {
    const raw = await fetchOpenF1<OpenF1Driver[]>("/drivers", {
      session_key: sessionKey,
    });
    const drivers = raw.map(normalizeDriver);

    return Response.json(drivers);
  } catch (error) {
    if (error instanceof Error && error.message.includes("(429)")) {
      return Response.json(
        { error: "OpenF1 rate limit hit while loading drivers. Please retry shortly." },
        { status: 503, headers: { "Retry-After": "10" } }
      );
    }
    throw error;
  }
}
