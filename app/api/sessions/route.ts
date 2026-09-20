import { fetchOpenF1 } from "@/lib/openf1/client";
import { normalizeSession } from "@/lib/openf1/normalize";
import type { OpenF1Session } from "@/lib/openf1/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") ?? undefined;

  try {
    const raw = await fetchOpenF1<OpenF1Session[]>("/sessions", { year });
    const sessions = raw.map(normalizeSession);

    return Response.json(sessions);
  } catch (error) {
    // OpenF1 returns 404 for unsupported future years. Treat that as an empty
    // calendar so homepage next-year probing does not surface as a 500.
    if (error instanceof Error && error.message.includes("(404)")) {
      return Response.json([]);
    }
    throw error;
  }
}
