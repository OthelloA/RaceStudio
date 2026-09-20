import { fetchOpenF1 } from "@/lib/openf1/client";
import { normalizeSession } from "@/lib/openf1/normalize";
import type { OpenF1Session } from "@/lib/openf1/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") ?? undefined;
  const numericYear = year ? Number(year) : null;
  const isFutureYear = numericYear !== null && numericYear > new Date().getUTCFullYear();

  try {
    const raw = await fetchOpenF1<OpenF1Session[]>("/sessions", { year });
    const sessions = raw.map(normalizeSession);

    return Response.json(sessions);
  } catch (error) {
    // OpenF1 can return 404 or rate-limit unsupported future-year probes.
    // Treat those as an empty calendar so homepage next-year probing does not
    // surface as a 500, while preserving real current/past-year failures.
    if (
      error instanceof Error &&
      (error.message.includes("(404)") || (isFutureYear && error.message.includes("(429)")))
    ) {
      return Response.json([]);
    }
    throw error;
  }
}
