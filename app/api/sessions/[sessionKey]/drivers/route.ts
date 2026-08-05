import { fetchOpenF1 } from "@/lib/openf1/client";
import { normalizeDriver } from "@/lib/openf1/normalize";
import type { OpenF1Driver } from "@/lib/openf1/types";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/sessions/[sessionKey]/drivers">
) {
  const { sessionKey } = await params;

  const raw = await fetchOpenF1<OpenF1Driver[]>("/drivers", {
    session_key: sessionKey,
  });
  const drivers = raw.map(normalizeDriver);

  return Response.json(drivers);
}
