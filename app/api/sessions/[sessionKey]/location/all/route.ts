import { fetchOpenF1 } from "@/lib/openf1/client";
import { normalizeLocation } from "@/lib/openf1/normalize";
import { getSession } from "@/lib/openf1/session";
import type { OpenF1Location } from "@/lib/openf1/types";

const CONCURRENCY_LIMIT = 3;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex++;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionKey: string }> }
) {
  const { sessionKey } = await params;
  const { searchParams } = new URL(request.url);
  const driversParam = searchParams.get("drivers");

  const driverNumbers = [...new Set(
    (driversParam ?? "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0)
  )];

  if (driverNumbers.length === 0) {
    return Response.json({});
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

  const sessionEpochMs = Date.parse(session.startTimeUtc);
  const entries = await mapWithConcurrency(driverNumbers, CONCURRENCY_LIMIT, async (driverNumber) => {
    try {
      const raw = await fetchOpenF1<OpenF1Location[]>(
        "/location",
        {
          session_key: sessionKey,
          driver_number: String(driverNumber),
        },
        {
          cache: "no-store",
        }
      );

      return [
        driverNumber,
        raw.map((frame) => normalizeLocation(frame, sessionEpochMs)),
      ] as const;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("(404)") || error.message.includes("(422)"))
      ) {
        return [driverNumber, []] as const;
      }
      throw error;
    }
  });

  return Response.json(Object.fromEntries(entries));
}
