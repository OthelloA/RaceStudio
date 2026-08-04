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

export async function fetchOpenF1<T>(
  path: string,
  params: QueryParams = {}
): Promise<T> {
  const url = `${BASE_URL}${path}${buildQueryString(params)}`;
  const res = await fetch(url, {
    // Historical OpenF1 data never changes once a session has ended.
    cache: "force-cache",
  });

  if (!res.ok) {
    throw new Error(`OpenF1 request failed (${res.status}): ${url}`);
  }

  return res.json() as Promise<T>;
}
