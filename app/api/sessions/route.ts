import { fetchOpenF1 } from "@/lib/openf1/client";
import { normalizeSession } from "@/lib/openf1/normalize";
import type { OpenF1Session } from "@/lib/openf1/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") ?? undefined;

  const raw = await fetchOpenF1<OpenF1Session[]>("/sessions", { year });
  const sessions = raw.map(normalizeSession);

  return Response.json(sessions);
}
