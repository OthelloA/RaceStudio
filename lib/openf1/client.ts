const BASE_URL = "https://api.openf1.org/v1";

type QueryParams = Record<string, string | number | boolean | undefined>;

function buildQueryString(params: QueryParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchOpenF1<T>(
  path: string,
  params: QueryParams = {}
): Promise<T> {
  const url = `${BASE_URL}${path}${buildQueryString(params)}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      // Historical OpenF1 data never changes once a session has ended.
      cache: "force-cache",
    });

    if (res.ok) return res.json() as Promise<T>;

    // Views with many drivers fire several of these route handlers at once
    // (e.g. one per row in the sidebar), which can trip OpenF1's rate limit.
    // Back off and retry rather than surfacing a 429 to the whole panel.
    if (res.status === 429 && attempt < MAX_RETRIES) {
      await sleep(2 ** attempt * 500);
      continue;
    }

    throw new Error(`OpenF1 request failed (${res.status}): ${url}`);
  }

  throw new Error(`OpenF1 request failed after retries: ${url}`);
}
