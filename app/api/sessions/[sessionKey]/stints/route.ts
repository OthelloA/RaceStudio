import { fetchOpenF1 } from "@/lib/openf1/client";
import { normalizeStint } from "@/lib/openf1/normalize";
import type { OpenF1Stint } from "@/lib/openf1/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionKey: string }> }
) {
  const { sessionKey } = await params;
  const { searchParams } = new URL(request.url);
  const driverNumber = searchParams.get("driver") ?? undefined;

  const raw = await fetchOpenF1<OpenF1Stint[]>("/stints", {
    session_key: sessionKey,
    driver_number: driverNumber,
  });

  return Response.json(raw.map(normalizeStint));
}
